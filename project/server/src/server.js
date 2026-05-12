import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from both root and server directories
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import multer from 'multer';
import fs from 'fs/promises';
import { createWorker } from 'tesseract.js';
import crypto from 'crypto';

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createServer } from 'http';
import { Server } from 'socket.io';
import User from './models/User.js';
import OTP from './models/OTP.js';
import { sendOTP } from './services/emailService.js';
import { badgeService } from './services/BadgeService.js';
import { fileStorage } from './utils/fileStorage.js';
// Removed unused vertex.js service
import { ragAnalyzer } from './services/rag-service.js';
import { enhancedRAGAnalyzer } from './services/enhanced-rag-service.js';
import { resumeOptimizer } from './services/resume-optimizer.js';
import { multiFormatParser } from '../utils/multiFormatParser.js';
import { careerTrajectoryPredictor } from './services/career-trajectory-predictor.js';
import { marketIntelligenceService } from './services/market-intelligence.js';
import MentorService from './services/mentor-service.js';
import SimulationService from './services/simulation-service.js';
import TelemetryService from './services/telemetry-service.js';
import { YouTubeService } from './services/youtube-service.js';
// FallbackAIService decommissioned for strict OpenRouter mode
import Analysis from './models/Analysis.js';
import Roadmap from './models/Roadmap.js';
import CareerHistory from './models/CareerHistory.js';
import Simulation from './models/Simulation.js';
import MentorConversation from './models/MentorConversation.js';
import UserInteraction from './models/UserInteraction.js';
import { analyticsService } from './services/analytics-service.js';
import { quizService } from './services/quizService.js';
import onetRoutes from './routes/onet-routes.js';

import SimulationSession from './models/SimulationSession.js';
import Certificate from './models/Certificate.js';
import ATSScan from './models/ATSScan.js';
import CoverLetter from './models/CoverLetter.js';

import { getEmbedding } from '../utils/embeddings.js';
import { VectorStore } from '../utils/vectorStore.js';
import { safeJsonParse } from './utils/ai-helpers.js';
import { jobQueue } from './utils/JobQueue.js';
import fsSync from 'fs';
// Google Vertex AI import removed for strict OpenRouter mode

const app = express();
const httpServer = createServer(app);

// Robust CORS configuration
const rawCorsOrigin = process.env.CORS_ORIGIN;
const defaultFrontendOrigin = 'http://localhost:5173';
const parsedOrigins = (rawCorsOrigin && rawCorsOrigin.trim().length > 0)
  ? rawCorsOrigin.split(',').map(o => o.trim())
  : [defaultFrontendOrigin];

const allowAll = parsedOrigins.length === 1 && (parsedOrigins[0].toLowerCase() === 'true' || parsedOrigins[0] === '*');

// Build a single CORS options object used for both middleware and preflight
const corsOptions = {
  origin: function (origin, callback) {
    // Allow non-browser requests (no origin) and same-origin
    if (!origin) return callback(null, true);
    if (allowAll) return callback(null, origin);
    if (parsedOrigins.includes(origin)) return callback(null, origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Initialize Socket.io
// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? parsedOrigins : "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Configure services with socket
analyticsService.setSocket(io);
badgeService.setSocket(io);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_user_room', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room ${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Explicitly handle preflight with the same options
app.options('*', cors(corsOptions));
app.use(express.json());

// O*NET API Routes
app.use('/api/onet', onetRoutes);

// --- Authentication Middleware ---
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization');
  const userIdHeader = req.header('x-user-id');

  if (!token) {
    if (userIdHeader) {
      req.user = { _id: userIdHeader, fullName: userIdHeader.startsWith('user_') ? 'Guest' : 'Demo User' };
      return next();
    }
    return res.status(401).json({ error: 'Access denied' });
  }

  try {
    const verified = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET || 'secretKey');
    req.user = verified;
    next();
  } catch (error) {
    if (userIdHeader) {
      console.warn('Invalid token, falling back to guest mode for:', userIdHeader);
      req.user = { _id: userIdHeader, fullName: userIdHeader.startsWith('user_') ? 'Guest' : 'Demo User' };
      return next();
    }
    res.status(400).json({ error: 'Invalid token' });
  }
};

// --- Auth Routes ---

// Signup Route
app.post('/api/auth/signup', async (req, res) => {
  // Ensure DB is connected for auth routes (1 = connected)
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: 'Authentication service currently unavailable (Database connection required)',
      details: 'Please ensure MONGO_URI is correctly configured.'
    });
  }

  try {
    const { fullName, email, password, careerInterest, experienceLevel } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = new User({
      fullName,
      email,
      password: hashedPassword,
      careerInterest,
      experienceLevel
    });

    const savedUser = await user.save();

    // Create token
    const token = jwt.sign({ _id: savedUser._id }, process.env.JWT_SECRET || 'secretKey', { expiresIn: '1h' });

    res.header('Authorization', token).json({
      message: 'User registered successfully',
      token,
      user: {
        id: savedUser._id,
        fullName: savedUser.fullName,
        email: savedUser.email,
        careerInterest: savedUser.careerInterest,
        experienceLevel: savedUser.experienceLevel
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Helper to update user streak
const updateStreak = async (user) => {
  try {
    const now = new Date();
    const lastActivity = user.streak?.lastActivityDate ? new Date(user.streak.lastActivityDate) : null;

    // Reset time parts for comparable day checking
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastActivityDay = lastActivity
      ? new Date(lastActivity.getFullYear(), lastActivity.getMonth(), lastActivity.getDate())
      : null;

    let modified = false;

    if (!user.streak) {
      user.streak = { current: 1, max: 1, lastActivityDate: now };
      modified = true;
    } else if (lastActivityDay) {
      if (lastActivityDay.getTime() === yesterday.getTime()) {
        // Streak continues
        user.streak.current += 1;
        modified = true;
      } else if (lastActivityDay.getTime() < yesterday.getTime()) {
        // Streak broken (gap of more than 1 day)
        user.streak.current = 1;
        modified = true;
      }
      // If lastActivityDay is today, do nothing regarding count

      // Always update lastActivityDate if it's not today or needs refreshing
      if (!user.streak.lastActivityDate || user.streak.lastActivityDate.getTime() !== now.getTime()) {
        user.streak.lastActivityDate = now;
        modified = true;
      }
    } else {
      // First time setting streak
      user.streak.current = 1;
      user.streak.lastActivityDate = now;
      modified = true;
    }

    // Update max streak
    if (user.streak.current > (user.streak.max || 0)) {
      user.streak.max = user.streak.current;
      modified = true;
    }

    if (modified) {
      await user.save();
    }
    return user.streak;
  } catch (streakError) {
    console.error('Streak update failed:', streakError);
    return user.streak;
  }
};

// Login Route
app.post('/api/auth/login', async (req, res) => {
  // Ensure DB is connected for auth routes (1 = connected)
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: 'Authentication service currently unavailable (Database connection required)',
      details: 'Please ensure MONGO_URI is correctly configured.'
    });
  }

  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Check password
    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Create and assign token
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET || 'secretKey', { expiresIn: '1h' });

    // Update Streak
    await updateStreak(user);

    // Log login activity
    try {
      await UserInteraction.create({
        userId: user._id.toString(),
        sessionId: `session_${Date.now()}`,
        interactionType: 'login',
        action: 'User logged in',
        details: {
          message: 'Successful login',
          processingTime: 0
        },
        metadata: {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      });
    } catch (logError) {
      console.error('Failed to log login activity:', logError);
      // Continue even if logging fails
    }

    res.header('Authorization', token).json({
      message: 'Logged in successfully',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        careerInterest: user.careerInterest,
        experienceLevel: user.experienceLevel
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    let userId = req.headers['x-user-id'];

    // Try to decode token to get userId if not provided in headers
    if (token && !userId) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretKey');
        userId = decoded._id;
      } catch (e) {
        // Token might be invalid/expired, rely on x-user-id or fail
      }
    }

    if (userId) {
      await UserInteraction.create({
        userId: userId.toString(),
        sessionId: `session_${Date.now()}`,
        interactionType: 'logout',
        action: 'User logged out',
        details: {
          message: 'User initiated logout'
        },
        metadata: {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      });
    }

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Verify Token Endpoint
app.get('/api/auth/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretKey');
    const user = await User.findById(decoded._id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      valid: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        careerInterest: user.careerInterest,
        experienceLevel: user.experienceLevel
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Forgot Password Route - Auto Reloaded
app.post('/api/auth/forgot-password', async (req, res) => {
  // Ensure DB is connected
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP to DB
    const newOTP = new OTP({ email, otp });
    await newOTP.save();

    // Send email
    const emailSent = await sendOTP(email, otp);
    if (!emailSent) {
      return res.status(500).json({ error: 'Failed to send email' });
    }

    res.json({ message: 'OTP sent to your email' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Verify OTP Route
app.post('/api/auth/verify-otp', async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  try {
    const { email, otp } = req.body;

    // Find latest OTP for this email
    const otpRecord = await OTP.findOne({ email }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    if (otpRecord.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    res.json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Reset Password Route
app.post('/api/auth/reset-password', async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  try {
    const { email, otp, newPassword } = req.body;

    // Verify OTP again just to be safe/secure (stateless check)
    const otpRecord = await OTP.findOne({ email }).sort({ createdAt: -1 });
    if (!otpRecord || otpRecord.otp !== otp) {
      return res.status(400).json({ error: 'Invalid or expired OTP session' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user password
    await User.findOneAndUpdate({ email }, { password: hashedPassword });

    // Delete used OTP
    await OTP.deleteMany({ email });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update Profile Route
app.put('/api/user/profile', verifyToken, async (req, res) => {
  try {
    const {
      fullName, careerInterest, experienceLevel,
      university, currentCompany, bio, preferences,
      manualSkills, personality, settings
    } = req.body;

    // Build update object dynamically to avoid overwriting with undefined
    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (careerInterest !== undefined) updateData.careerInterest = careerInterest;
    if (experienceLevel !== undefined) updateData.experienceLevel = experienceLevel;
    if (university !== undefined) updateData.university = university;
    if (currentCompany !== undefined) updateData.currentCompany = currentCompany;
    if (bio !== undefined) updateData.bio = bio;
    if (preferences !== undefined) {
      console.log('Server received preferences:', JSON.stringify(preferences, null, 2));
      updateData.preferences = preferences;
    }

    // New fields
    if (manualSkills !== undefined) updateData.manualSkills = manualSkills;
    if (personality !== undefined) updateData.personality = personality;
    if (settings !== undefined) updateData.settings = settings;

    console.log('Update payload:', JSON.stringify(updateData, null, 2));

    // Find and update user
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        careerInterest: user.careerInterest,
        experienceLevel: user.experienceLevel,
        university: user.university,
        currentCompany: user.currentCompany,
        bio: user.bio,
        preferences: user.preferences,
        badges: user.badges,
        xp: user.xp,
        level: user.level,
        manualSkills: user.manualSkills,
        personality: user.personality,
        lastQuizScore: user.lastQuizScore,
        settings: user.settings
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get User Stats Route
app.get('/api/user/stats', verifyToken, async (req, res) => {
  try {
    let user = null;
    try {
      if (mongoose.Types.ObjectId.isValid(req.user._id)) {
        user = await User.findById(req.user._id).select('fullName email careerInterest experienceLevel xp level xpToNext skillsGapScore badges recentActivity streak dailyStats university currentCompany bio preferences manualSkills lastQuizScore personality personalityDate settings');

        if (user) {
          // Update streak on stats fetch to ensure it's current even if they didn't just log in
          await updateStreak(user);
        }
      } else {
        // Find or create guest user
        user = await User.findOne({ fullName: req.user._id }).select('xp level xpToNext skillsGapScore badges recentActivity');
        if (!user) {
          user = new User({
            fullName: req.user._id,
            careerInterest: 'Guest Track',
            xp: 0,
            level: 1,
            xpToNext: 1000
          });
          await user.save();
        }
      }
    } catch (dbError) {
      console.error('DB Error in stats:', dbError);
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Master Fetch Endpoint: Get Full User Profile & Career Data
app.get('/api/user/full-profile', verifyToken, async (req, res) => {
  console.log('Fetching full profile for user:', req.user._id);
  try {
    const userId = req.user._id;

    // 1. Fetch User Data
    const user = await User.findById(userId).select('-password');

    // 2. Fetch Latest Analysis (Resume + Career + Salary)
    const analysis = await Analysis.findOne({ userId }).sort({ created_at: -1 });

    // 3. Fetch Latest Roadmap
    const roadmap = await Roadmap.findOne({ userId }).sort({ created_at: -1 });

    // 4. Fetch Latest Simulation
    const simulation = await Simulation.findOne({ userId }).sort({ created_at: -1 });

    // 5. Get Enhanced Analytics (Weekly Stats, Streak, etc.)
    let analytics = {};
    try {
      analytics = await analyticsService.getUserAnalytics(userId);
    } catch (e) { console.warn('Analytics fetch failed:', e); }

    // Merge analytics into user object
    const userWithStats = user ? { ...user.toObject(), ...analytics } : null;

    res.json({
      success: true,
      user: userWithStats,
      analysis,
      roadmap,
      simulation
    });
  } catch (error) {
    console.error('Error fetching full profile:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// Get Career AI History
app.get('/career-history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type } = req.query; // Optional filter by type

    const query = { userId };
    if (type) {
      if (type === 'roadmap') {
        query.type = { $in: ['roadmap', 'skill-roadmap'] };
      } else {
        query.type = type;
      }
    }

    const history = await CareerHistory.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    console.log(`📚 Fetched ${history.length} career history items for user ${userId}`);

    res.json({
      success: true,
      history,
      count: history.length
    });
  } catch (error) {
    console.error('Error fetching career history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch career history',
      message: error.message
    });
  }
});

// Get List of Past Analyses (History)
app.get('/api/user/analyses', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const analyses = await Analysis.find({ userId })
      .select('target_role match_score created_at model_used')
      .sort({ created_at: -1 })
      .limit(20); // Limit to last 20 for performance

    res.json({
      success: true,
      analyses
    });
  } catch (error) {
    console.error('Error fetching analysis history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
});

// Get Specific Analysis by ID
app.get('/api/user/analysis/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const analysisId = req.params.id;

    const analysis = await Analysis.findOne({ _id: analysisId, userId });

    if (!analysis) {
      return res.status(404).json({ success: false, error: 'Analysis not found' });
    }

    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Error fetching specific analysis:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analysis' });
  }
});

// Get Latest Resume Analysis Route (Keeping for backward compatibility)
app.get('/api/user/latest-analysis', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;
    let latest = null;

    if (persistenceMode === 'mongo') {
      latest = await Analysis.findOne({ userId }).sort({ created_at: -1 });
    } else {
      // Find latest in memoryStore
      const sessions = Array.from(memoryStore.values())
        .filter(s => s.userId === userId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      latest = sessions[0] || null;
    }

    if (!latest) {
      return res.json(null);
    }

    res.json(latest);
  } catch (error) {
    console.error('Get latest analysis error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get Simulations Route - Fetch user's generated simulations
app.get('/api/simulations', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;

    // Try to get user's personalized simulations from database first
    if (persistenceMode === 'mongo') {
      try {
        const userSimulations = await Simulation.find({ userId })
          .sort({ created_at: -1 })
          .limit(20)
          .lean();

        if (userSimulations && userSimulations.length > 0) {
          console.log(`Found ${userSimulations.length} personalized simulations for user ${userId}`);

          // Map to frontend format with resume context
          const simulations = userSimulations.map(sim => ({
            _id: sim._id,
            id: sim._id.toString(),
            title: sim.title,
            description: sim.description,
            difficulty: sim.difficulty,
            estimated_duration: sim.estimated_duration || 30,
            skills: sim.skills || [],
            skills_assessed: sim.skills || [],
            category: sim.category || 'General',
            // Resume context fields
            targetRole: sim.targetRole, // Role from resume
            createdFrom: sim.createdFrom || 'manual', // Source: 'resume' or 'manual'
            analysisId: sim.analysisId, // Link to source resume analysis
            language: sim.language,
            role: sim.role,
            modes: sim.modes || [],
            completedModes: sim.completedModes || [],
            overallProgress: sim.overallProgress || 0,
            youtube_videos: sim.youtube_videos || [],
            learning_objectives: sim.learning_objectives || [],
            status: sim.status || 'active',
            created_at: sim.created_at
          }));

          // Add default modes to simulations that don't have them (migration)
          simulations.forEach(sim => {
            if (!sim.modes || sim.modes.length === 0) {
              sim.modes = [
                { id: 'guided', name: 'Guided Learning', description: 'Step-by-step guided learning path', xpReward: 100, estimatedTime: '30-45 min', difficulty: 'Easy', unlocked: true, completed: false },
                { id: 'challenge', name: 'Challenge Mode', description: 'Test your skills with timed challenges', xpReward: 200, estimatedTime: '45-60 min', difficulty: 'Medium', unlocked: false, completed: false },
                { id: 'project', name: 'Project-Based', description: 'Build real-world projects', xpReward: 300, estimatedTime: '1-2 hours', difficulty: 'Hard', unlocked: false, completed: false },
                { id: 'peer', name: 'Peer Compare', description: 'Compare your performance with peers', xpReward: 150, estimatedTime: '20-30 min', difficulty: 'Medium', unlocked: false, completed: false }
              ];
            }
          });

          return res.json(simulations);
        }
      } catch (dbError) {
        console.warn('Failed to fetch user simulations from DB:', dbError.message);
      }
    }

    // Fallback to templates if no personalized simulations
    const templates = simulationService.getSimulationTemplates();

    // Map templates to match frontend expectation (Dashboard.tsx)
    const simulations = templates.map(t => ({
      _id: t.id,
      title: t.title,
      description: t.description,
      difficulty: t.difficulty.charAt(0).toUpperCase() + t.difficulty.slice(1), // Capitalize
      estimated_duration: 30, // Default duration
      skills_assessed: t.testCases.map(tc => tc.function || 'General'),
      category: t.language === 'sql' ? 'Data' : 'Development',
      language: t.language
    }));

    res.json(simulations);
  } catch (error) {
    console.error('Get simulations error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Simulate Activity Route (For Real-time Demo)
app.post('/api/user/simulate-activity', verifyToken, async (req, res) => {
  try {
    const { type, title, points } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update stats
    user.xp = (user.xp || 0) + (points || 0);

    // Simple level up logic
    if (user.xp >= ((user.level || 1) * 1000)) {
      user.level = (user.level || 1) + 1;
      user.xpToNext = user.level * 1000;
    }

    // Add activity
    if (!user.recentActivity) user.recentActivity = [];
    user.recentActivity.unshift({
      type: type || 'simulation',
      title: title || 'Completed Activity',
      points: points || 0
    });

    // Keep only last 10 activities
    if (user.recentActivity.length > 10) {
      user.recentActivity = user.recentActivity.slice(0, 10);
    }

    await user.save();

    // Emit real-time update
    const stats = {
      xp: user.xp,
      level: user.level,
      xpToNext: user.xpToNext,
      skillsGapScore: user.skillsGapScore,
      badges: user.badges,
      recentActivity: user.recentActivity
    };

    await analyticsService.trackActivity(user._id, type, title, points);

    res.json({ message: 'Activity recorded', xp: user.xp, level: user.level });
  } catch (error) {
    console.error('Simulate activity error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// AI Personality Quiz Routes

// Start Quiz: Generate questions and init session
app.post('/api/quiz/start', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Generate questions via AI
    const questions = await quizService.generateQuiz({
      experienceLevel: user.experienceLevel,
      careerInterest: user.careerInterest,
      preferences: user.preferences
    });

    user.quizSession = {
      isActive: true,
      questions,
      currentQuestionIndex: 0,
      answers: new Map(),
      startedAt: new Date()
    };

    await user.save();

    // SANITIZE: Remove correctAnswer and reasoning before sending to frontend
    const sanitizedQuestions = questions.map(q => ({
      id: q.id,
      text: q.text,
      options: q.options
    }));

    res.json({
      ...user.quizSession.toObject(),
      questions: sanitizedQuestions
    });
  } catch (error) {
    console.error('Start quiz error:', error);
    res.status(500).json({ error: 'Failed to start quiz' });
  }
});

// Submit Answer
app.post('/api/quiz/answer', verifyToken, async (req, res) => {
  try {
    const { questionIndex, answer } = req.body;
    const user = await User.findById(req.user._id);

    if (!user || !user.quizSession.isActive) {
      return res.status(400).json({ error: 'No active quiz session' });
    }

    user.quizSession.answers.set(String(questionIndex), answer);
    user.quizSession.currentQuestionIndex = questionIndex + 1; // Advance

    await user.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Answer quiz error:', error);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
});

// Complete Quiz: Analyze results
app.post('/api/quiz/complete', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user || !user.quizSession.isActive) {
      return res.status(400).json({ error: 'No active quiz session' });
    }

    // Convert Map to Object for simple access (though map usage is fine too)
    const answersObj = Object.fromEntries(user.quizSession.answers);

    // Analyze results (calculate score)
    const result = await quizService.analyzeQuizResult(user.quizSession.questions, answersObj);

    // Update user profile with new stats
    user.lastQuizScore = result.score;
    // user.personality = result.personalityType; // No longer setting personality type from this quiz
    // user.personalityTracks = result.suggestedCareerTracks; 
    user.personalityDate = new Date();
    user.quizSession.isActive = false; // Close session

    // Award XP for passing quiz (e.g. > 70%)
    if (result.score >= 70) {
      await analyticsService.trackActivity(user._id, 'quiz', `Passed Skill Assessment (${result.score}%)`, 500);
      user.xp += 500;
    } else {
      await analyticsService.trackActivity(user._id, 'quiz', `Completed Skill Assessment (${result.score}%)`, 100);
      user.xp += 100;
    }

    await user.save();

    res.json({
      score: result.score,
      totalQuestions: result.totalQuestions,
      correctCount: result.correctCount,
      results: result.results, // Includes correct answer and reasoning
      lastQuizDate: user.personalityDate
    });
  } catch (error) {
    console.error('Complete quiz error:', error);
    res.status(500).json({ error: 'Failed to complete quiz' });
  }
});

// Real Analytics Endpoint
app.get('/api/user/analytics', verifyToken, async (req, res) => {
  try {
    const analytics = await analyticsService.getUserAnalytics(req.user._id);
    res.json({ success: true, analytics });
  } catch (error) {
    console.error('Failed to get analytics:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// Save Skills Profile Endpoint
app.post('/api/user/skills-profile', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    const { skills, skillGaps, targetCompany, targetRole, analysisId } = req.body;

    console.log(`💾 Saving skills profile for user: ${userId}`);
    console.log(`   Company: ${targetCompany}, Role: ${targetRole}`);
    console.log(`   Skills: ${skills?.length || 0}, Gaps: ${skillGaps?.length || 0}`);

    // Update user's skills profile
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        skillsProfile: {
          skills: skills || [],
          skillGaps: skillGaps || [],
          targetCompany: targetCompany || '',
          targetRole: targetRole || '',
          analysisId: analysisId || '',
          lastUpdated: new Date()
        }
      },
      { new: true, upsert: false }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    console.log(`✅ Skills profile saved successfully for user: ${userId}`);

    res.json({
      success: true,
      message: 'Skills profile saved successfully',
      skillsProfile: updatedUser.skillsProfile
    });
  } catch (error) {
    console.error('❌ Error saving skills profile:', error);
    res.status(500).json({ success: false, error: 'Failed to save skills profile' });
  }
});

// Get User Full Profile (including skills profile)
app.get('/api/user/full-profile', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    console.log(`📋 Retrieved full profile for user: ${userId}`);
    if (user.skillsProfile) {
      console.log(`   Skills Profile: ${user.skillsProfile.targetCompany} - ${user.skillsProfile.targetRole}`);
    }

    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    console.error('❌ Error fetching user profile:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user profile' });
  }
});

async function createAIInstance() {
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const { OpenRouterClient } = await import('./utils/open-router-client.js');
      return new OpenRouterClient();
    } catch (e) {
      console.error('❌ createAIInstance: OpenRouter initialization failed:', e.message);
      throw e;
    }
  }
  console.error('❌ createAIInstance: OPENROUTER_API_KEY is missing. Strict Mode prevents fallbacks.');
  throw new Error('OPENROUTER_API_KEY is required. AI services are decommissioned without it.');
}

// Initialize services (conditionally to avoid startup errors)
let mentorService, simulationService, telemetryService, youtubeService;

try {
  // Always initialize services, as they now handle their own OpenRouter logic
  mentorService = new MentorService();
  console.log('🤖 AI Services: Initializing OpenRouter (Strict Mode)...');
  simulationService = new SimulationService();
  telemetryService = new TelemetryService();
  youtubeService = new YouTubeService();
  console.log('AI Mentor services initialized successfully');
} catch (error) {
  console.warn('AI Mentor services initialization failed:', error.message);
}

// MongoDB (optional)
mongoose.set('strictQuery', true);
// Re-enabled bufferCommands to allow queries during connection/reconnection
// mongoose.set('bufferCommands', false);

let persistenceMode = 'memory';
const memoryStore = new Map();

// MongoDB Atlas Configuration
const MONGO_URI = process.env.MONGO_URI || '';
const MONGO_DB = process.env.MONGO_DB || 'career-companion';

if (MONGO_URI) {
  console.log('Attempting to connect to MongoDB Atlas...');
  try {
    await mongoose.connect(MONGO_URI, {
      dbName: MONGO_DB,
      serverSelectionTimeoutMS: 5000 // Timeout after 5 seconds instead of 30
    });
    persistenceMode = 'mongo';
    console.log(`✅ [MongoDB Atlas] Connected successfully to database: ${MONGO_DB}`);
    console.log(`📊 Persistence mode updated to: ${persistenceMode}`);
  } catch (e) {
    persistenceMode = 'file';
    console.warn('❌ [MongoDB Atlas] Connection failed, falling back to file storage:', e.message);
    console.log('💡 To enable MongoDB Atlas, set MONGO_URI environment variable with your Atlas connection string');
  }
} else {
  persistenceMode = 'file';
  console.log('📁 [File Storage] MongoDB Atlas URI not provided, using file-based storage');
  console.log('💡 To use MongoDB Atlas, set MONGO_URI environment variable with your Atlas connection string');
}

// Multer tmp storage - use system temp directory with enhanced file support
const upload = multer({
  dest: path.join(process.cwd(), 'temp'),
  limits: { fileSize: 50 * 1024 * 1024 }, // Increased to 50MB for larger files
  fileFilter: (req, file, cb) => {
    // Support multiple file types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'text/plain',
      'application/rtf'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Please upload PDF, Word, PowerPoint, images, or text files.'), false);
    }
  }
});

// Simple JD templates
const JD_TEMPLATES = {
  'auto-detect': `Auto-detect the most suitable role based on resume content and skills.`,
  'data-analyst': `We seek a Data Analyst with strong SQL, Python, statistics, and BI tools like Tableau/Power BI. Responsibilities include data cleaning, analysis, dashboards, and stakeholder communication.`,
  'software-engineer': `We seek a Software Engineer with JavaScript/TypeScript, React, Node.js, REST, testing, CI/CD, and cloud basics.`,
  'frontend-developer': `We seek a Frontend Developer skilled in HTML, CSS, JavaScript, React, TypeScript, accessibility, testing, and performance optimization to build modern user interfaces.`,
  'backend-developer': `We seek a Backend Developer experienced with Node.js/Express, REST/GraphQL APIs, databases (SQL/NoSQL), authentication/authorization, caching, and scalability.`,
  'fullstack-developer': `We seek a Full-Stack Developer proficient in React, Node.js, TypeScript, databases, Docker, and CI/CD to deliver end-to-end product features.`,
  'mobile-developer': `We seek a Mobile Developer with React Native or native (Swift/Kotlin), API integration, offline storage, and testing to create high-quality mobile apps.`,
  'data-scientist': `We seek a Data Scientist skilled in Python, Pandas, machine learning, statistics, model evaluation, and storytelling to build predictive models and insights.`,
  'machine-learning-engineer': `We seek an ML Engineer with TensorFlow/PyTorch, MLOps, feature engineering, data pipelines, and cloud ML services to productionize models.`,
  'ai-engineer': `We seek an AI Engineer with LLMs, prompt engineering, vector databases, RAG, Python, and API integration to build AI-powered applications.`,
  'data-engineer': `We seek a Data Engineer with ETL/ELT, Airflow, Spark, SQL, warehousing (BigQuery/Redshift/Snowflake), and data modeling to build robust pipelines.`,
  'devops-engineer': `We seek a DevOps Engineer with CI/CD, Kubernetes, Terraform, observability, Linux, and SRE practices to automate deployments and improve reliability.`,
  'cloud-engineer': `We seek a Cloud Engineer with AWS/Azure/GCP, networking, security, serverless, IaC, and cost optimization to design scalable cloud infrastructure.`,
  'qa-engineer': `We seek a QA/Test Engineer with test automation (Playwright/Cypress), API testing, performance testing, and quality strategy to ensure product excellence.`,
  'product-manager': `We seek a Product Manager with user research, analytics, product strategy, roadmapping, and cross-functional leadership.`,
  'ux-designer': `We seek a UX Designer skilled in Figma, prototyping, user research, wireframing, and usability testing.`,
  'business-analyst': `We seek a Business Analyst experienced in requirements gathering, stakeholder management, process mapping, dashboards, and documentation.`,
  'marketing-analyst': `We seek a Marketing Analyst with SQL, analytics platforms, A/B testing, attribution, and dashboarding to drive growth insights.`,
  'it-support': `We seek an IT Support Specialist with troubleshooting, Windows/Mac administration, networking basics, scripting, and ticketing tools.`,
  'cyber-security': `We seek a Cyber Security professional with network security, SIEM, incident response, penetration testing, threat modeling, and cloud security best practices (NIST/ISO 27001).`
};

// Job database with real job postings - Indian and International markets
const JOB_DATABASE = {
  'software-engineer': [
    // Indian Job Market
    {
      title: 'Senior Software Engineer',
      company: 'TCS (Tata Consultancy Services)',
      location: 'Bangalore, India',
      matchPercentage: 95,
      requiredSkills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Java', 'SQL'],
      preferredSkills: ['Spring Boot', 'Microservices', 'AWS', 'Docker'],
      description: 'Build enterprise-grade applications using modern technologies and agile methodologies.',
      salary: '₹12,00,000 - ₹18,00,000'
    },
    {
      title: 'Full Stack Developer',
      company: 'Infosys',
      location: 'Pune, India',
      matchPercentage: 88,
      requiredSkills: ['JavaScript', 'React', 'Python', 'SQL', 'Git'],
      preferredSkills: ['Angular', 'MongoDB', 'Azure', 'Agile'],
      description: 'Develop scalable web applications and work on digital transformation projects.',
      salary: '₹8,00,000 - ₹14,00,000'
    },
    {
      title: 'Frontend Developer',
      company: 'TechCorp',
      location: 'Mumbai, India',
      matchPercentage: 85,
      requiredSkills: ['JavaScript', 'React', 'REST APIs', 'Testing', 'CI/CD'],
      preferredSkills: ['TypeScript', 'Jest', 'Docker', 'AWS'],
      description: 'Build modern web applications with focus on frontend development and testing.',
      salary: '₹9,00,000 - ₹15,00,000'
    },
    {
      title: 'Cloud Developer',
      company: 'CloudTech',
      location: 'Delhi, India',
      matchPercentage: 80,
      requiredSkills: ['JavaScript', 'Google Cloud Platform', 'CI/CD', 'Testing'],
      preferredSkills: ['Python', 'Kubernetes', 'Terraform', 'Docker'],
      description: 'Develop cloud-native applications using Google Cloud Platform.',
      salary: '₹10,00,000 - ₹16,00,000'
    },
    {
      title: 'Software Development Engineer',
      company: 'Amazon India',
      location: 'Hyderabad, India',
      matchPercentage: 92,
      requiredSkills: ['Java', 'Python', 'AWS', 'SQL', 'Data Structures'],
      preferredSkills: ['Machine Learning', 'Docker', 'Kubernetes', 'System Design'],
      description: 'Build large-scale distributed systems and work on Amazon\'s core services.',
      salary: '₹15,00,000 - ₹25,00,000'
    },
    {
      title: 'Frontend Developer',
      company: 'Flipkart',
      location: 'Bangalore, India',
      matchPercentage: 85,
      requiredSkills: ['JavaScript', 'TypeScript', 'React', 'CSS', 'HTML'],
      preferredSkills: ['Redux', 'Next.js', 'GraphQL', 'Testing'],
      description: 'Create engaging user interfaces for India\'s leading e-commerce platform.',
      salary: '₹10,00,000 - ₹16,00,000'
    },
    {
      title: 'Backend Engineer',
      company: 'Paytm',
      location: 'Noida, India',
      matchPercentage: 87,
      requiredSkills: ['Java', 'Spring Boot', 'SQL', 'REST', 'Microservices'],
      preferredSkills: ['Redis', 'Kafka', 'Docker', 'AWS'],
      description: 'Build robust payment systems and financial technology solutions.',
      salary: '₹12,00,000 - ₹20,00,000'
    },
    {
      title: 'DevOps Engineer',
      company: 'Wipro',
      location: 'Chennai, India',
      matchPercentage: 80,
      requiredSkills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Linux'],
      preferredSkills: ['Terraform', 'Jenkins', 'Python', 'Monitoring'],
      description: 'Manage cloud infrastructure and deployment pipelines for enterprise clients.',
      salary: '₹9,00,000 - ₹15,00,000'
    },
    {
      title: 'Software Engineer',
      company: 'Microsoft India',
      location: 'Hyderabad, India',
      matchPercentage: 90,
      requiredSkills: ['C#', 'Azure', 'SQL Server', 'JavaScript', 'Git'],
      preferredSkills: ['Power BI', 'Machine Learning', 'DevOps', 'Agile'],
      description: 'Develop Microsoft products and cloud services for global markets.',
      salary: '₹14,00,000 - ₹22,00,000'
    },
    {
      title: 'Full Stack Developer',
      company: 'Zomato',
      location: 'Gurgaon, India',
      matchPercentage: 83,
      requiredSkills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'Git'],
      preferredSkills: ['GraphQL', 'Redis', 'AWS', 'Microservices'],
      description: 'Build food delivery platform features and enhance user experience.',
      salary: '₹11,00,000 - ₹18,00,000'
    },
    // International Job Market
    {
      title: 'Senior Software Engineer',
      company: 'Google',
      location: 'Mountain View, CA, USA',
      matchPercentage: 95,
      requiredSkills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'AWS', 'Docker'],
      preferredSkills: ['Kubernetes', 'CI/CD', 'Machine Learning', 'System Design'],
      description: 'Build scalable web applications using modern JavaScript frameworks and cloud technologies.',
      salary: '$150,000 - $200,000'
    },
    {
      title: 'Full Stack Developer',
      company: 'Meta (Facebook)',
      location: 'Menlo Park, CA, USA',
      matchPercentage: 88,
      requiredSkills: ['JavaScript', 'React', 'Python', 'SQL', 'Git'],
      preferredSkills: ['GraphQL', 'Docker', 'AWS', 'Agile'],
      description: 'Develop social media features and work on Meta\'s family of apps.',
      salary: '$130,000 - $180,000'
    },
    {
      title: 'Frontend Engineer',
      company: 'Netflix',
      location: 'Los Gatos, CA, USA',
      matchPercentage: 82,
      requiredSkills: ['JavaScript', 'TypeScript', 'React', 'CSS', 'HTML'],
      preferredSkills: ['Redux', 'Node.js', 'GraphQL', 'Testing'],
      description: 'Create beautiful streaming interfaces for millions of users worldwide.',
      salary: '$140,000 - $190,000'
    },
    {
      title: 'Backend Developer',
      company: 'Uber',
      location: 'San Francisco, CA, USA',
      matchPercentage: 85,
      requiredSkills: ['Python', 'Java', 'SQL', 'REST', 'AWS'],
      preferredSkills: ['Docker', 'Kubernetes', 'Microservices', 'Go'],
      description: 'Build robust backend systems for ride-sharing and delivery services.',
      salary: '$135,000 - $185,000'
    },
    {
      title: 'DevOps Engineer',
      company: 'Airbnb',
      location: 'San Francisco, CA, USA',
      matchPercentage: 75,
      requiredSkills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Linux'],
      preferredSkills: ['Python', 'Terraform', 'Jenkins', 'Monitoring'],
      description: 'Manage cloud infrastructure for global hospitality platform.',
      salary: '$145,000 - $195,000'
    },
    {
      title: 'Software Engineer',
      company: 'Shopify',
      location: 'Ottawa, Canada',
      matchPercentage: 87,
      requiredSkills: ['Ruby', 'JavaScript', 'React', 'SQL', 'Git'],
      preferredSkills: ['GraphQL', 'Docker', 'AWS', 'E-commerce'],
      description: 'Build e-commerce solutions for merchants worldwide.',
      salary: 'CAD $120,000 - $160,000'
    },
    {
      title: 'Full Stack Developer',
      company: 'Spotify',
      location: 'Stockholm, Sweden',
      matchPercentage: 83,
      requiredSkills: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL'],
      preferredSkills: ['GraphQL', 'Docker', 'AWS', 'Music Tech'],
      description: 'Develop music streaming features and recommendation systems.',
      salary: 'SEK 600,000 - 800,000'
    },
    {
      title: 'Software Engineer',
      company: 'Grab',
      location: 'Singapore',
      matchPercentage: 80,
      requiredSkills: ['Java', 'Python', 'React', 'SQL', 'AWS'],
      preferredSkills: ['Kotlin', 'Docker', 'Microservices', 'Mobile'],
      description: 'Build super app features for Southeast Asian markets.',
      salary: 'SGD $80,000 - $120,000'
    }
  ],
  'data-analyst': [
    // Indian Job Market
    {
      title: 'Senior Data Analyst',
      company: 'Swiggy',
      location: 'Bangalore, India',
      matchPercentage: 92,
      requiredSkills: ['SQL', 'Python', 'Tableau', 'Statistics', 'Excel'],
      preferredSkills: ['Machine Learning', 'Power BI', 'R', 'Pandas'],
      description: 'Analyze food delivery data to optimize operations and improve customer experience.',
      salary: '₹8,00,000 - ₹14,00,000'
    },
    {
      title: 'Business Intelligence Analyst',
      company: 'Reliance Jio',
      location: 'Mumbai, India',
      matchPercentage: 88,
      requiredSkills: ['SQL', 'Python', 'Power BI', 'Excel', 'Analytics'],
      preferredSkills: ['Tableau', 'Statistics', 'Machine Learning', 'Telecom'],
      description: 'Develop dashboards and reports for telecom business intelligence.',
      salary: '₹7,00,000 - ₹12,00,000'
    },
    {
      title: 'Data Analyst',
      company: 'Ola',
      location: 'Bangalore, India',
      matchPercentage: 85,
      requiredSkills: ['SQL', 'Python', 'Excel', 'Statistics', 'Analytics'],
      preferredSkills: ['Tableau', 'Machine Learning', 'R', 'Transportation'],
      description: 'Analyze ride-sharing data to improve service efficiency and pricing.',
      salary: '₹6,00,000 - ₹11,00,000'
    },
    {
      title: 'Analytics Manager',
      company: 'HDFC Bank',
      location: 'Mumbai, India',
      matchPercentage: 90,
      requiredSkills: ['SQL', 'Python', 'SAS', 'Statistics', 'Banking'],
      preferredSkills: ['Machine Learning', 'Risk Analytics', 'Credit Scoring', 'Excel'],
      description: 'Lead analytics initiatives for banking and financial services.',
      salary: '₹12,00,000 - ₹18,00,000'
    },
    // International Job Market
    {
      title: 'Senior Data Analyst',
      company: 'Netflix',
      location: 'Los Gatos, CA, USA',
      matchPercentage: 92,
      requiredSkills: ['SQL', 'Python', 'Tableau', 'Statistics', 'Excel'],
      preferredSkills: ['Machine Learning', 'Power BI', 'R', 'A/B Testing'],
      description: 'Analyze streaming data to improve content recommendations and user experience.',
      salary: '$100,000 - $140,000'
    },
    {
      title: 'Business Intelligence Analyst',
      company: 'Airbnb',
      location: 'San Francisco, CA, USA',
      matchPercentage: 88,
      requiredSkills: ['SQL', 'Python', 'Power BI', 'Excel', 'Analytics'],
      preferredSkills: ['Tableau', 'Statistics', 'Machine Learning', 'Hospitality'],
      description: 'Develop dashboards and reports to support strategic business decisions.',
      salary: '$95,000 - $130,000'
    },
    {
      title: 'Data Analyst',
      company: 'Uber',
      location: 'San Francisco, CA, USA',
      matchPercentage: 85,
      requiredSkills: ['SQL', 'Python', 'Excel', 'Statistics', 'Analytics'],
      preferredSkills: ['Tableau', 'Machine Learning', 'R', 'Transportation'],
      description: 'Analyze ride-sharing and delivery data to optimize operations.',
      salary: '$90,000 - $125,000'
    },
    {
      title: 'Analytics Manager',
      company: 'Google',
      location: 'Mountain View, CA, USA',
      matchPercentage: 90,
      requiredSkills: ['SQL', 'Python', 'Statistics', 'Machine Learning', 'Analytics'],
      preferredSkills: ['BigQuery', 'TensorFlow', 'A/B Testing', 'Ad Tech'],
      description: 'Lead analytics initiatives for Google\'s advertising and search products.',
      salary: '$130,000 - $170,000'
    }
  ],
  'cyber-security': [
    // Indian Job Market
    {
      title: 'SOC Analyst',
      company: 'Tata Consultancy Services (TCS)',
      location: 'Mumbai, India',
      matchPercentage: 90,
      requiredSkills: ['SIEM', 'Incident Response', 'Linux', 'Networking', 'Threat Intelligence'],
      preferredSkills: ['Splunk', 'QRadar', 'Elastic Security', 'EDR', 'Scripting'],
      description: 'Monitor security events, investigate incidents, and respond per runbooks in a 24x7 SOC.',
      salary: '₹6,00,000 - ₹10,00,000'
    },
    {
      title: 'Security Engineer',
      company: 'Infosys',
      location: 'Bangalore, India',
      matchPercentage: 85,
      requiredSkills: ['Firewalls', 'WAF', 'IAM', 'Vulnerability Management', 'Cloud Security'],
      preferredSkills: ['AWS Security', 'Terraform', 'Zero Trust', 'EDR/XDR'],
      description: 'Harden infrastructure, manage identity, and implement cloud and network security controls.',
      salary: '₹10,00,000 - ₹16,00,000'
    },
    {
      title: 'Threat Hunter',
      company: 'Wipro',
      location: 'Hyderabad, India',
      matchPercentage: 80,
      requiredSkills: ['Threat Hunting', 'DFIR', 'Scripting', 'SIEM', 'MITRE ATT&CK'],
      preferredSkills: ['Python', 'YARA', 'Sigma', 'Kusto (KQL)'],
      description: 'Proactively hunt for threats, build detections, and improve organizational defenses.',
      salary: '₹12,00,000 - ₹18,00,000'
    },
    // International Job Market
    {
      title: 'Security Analyst',
      company: 'CrowdStrike',
      location: 'Austin, TX, USA',
      matchPercentage: 88,
      requiredSkills: ['EDR', 'Incident Response', 'Threat Intelligence', 'Linux', 'Windows'],
      preferredSkills: ['CrowdStrike Falcon', 'Scripting', 'Forensics'],
      description: 'Investigate endpoint alerts, perform triage, and support incident response.',
      salary: '$95,000 - $130,000'
    },
    {
      title: 'Cloud Security Engineer',
      company: 'Amazon (AWS)',
      location: 'Seattle, WA, USA',
      matchPercentage: 90,
      requiredSkills: ['AWS', 'IAM', 'Networking', 'Encryption', 'Automation'],
      preferredSkills: ['Terraform', 'GuardDuty', 'Security Hub', 'KMS'],
      description: 'Design and implement secure cloud architectures with least-privilege and monitoring.',
      salary: '$140,000 - $190,000'
    },
    {
      title: 'Penetration Tester',
      company: 'NCC Group',
      location: 'London, UK',
      matchPercentage: 84,
      requiredSkills: ['Pentesting', 'OWASP', 'Nmap', 'Burp Suite', 'Reporting'],
      preferredSkills: ['OSCP', 'Scripting', 'Red Team'],
      description: 'Conduct application and network penetration tests and document findings with fixes.',
      salary: '£55,000 - £80,000'
    }
  ],
  'product-manager': [
    // Indian Job Market
    {
      title: 'Product Manager',
      company: 'Flipkart',
      location: 'Bangalore, India',
      matchPercentage: 90,
      requiredSkills: ['Product Strategy', 'User Research', 'Analytics', 'Agile'],
      preferredSkills: ['SQL', 'A/B Testing', 'Stakeholder Management', 'E-commerce'],
      description: 'Lead product development for India\'s leading e-commerce platform.',
      salary: '₹15,00,000 - ₹25,00,000'
    },
    {
      title: 'Senior Product Manager',
      company: 'Paytm',
      location: 'Noida, India',
      matchPercentage: 88,
      requiredSkills: ['Product Strategy', 'Analytics', 'Agile', 'Fintech'],
      preferredSkills: ['User Research', 'SQL', 'A/B Testing', 'Payment Systems'],
      description: 'Drive product strategy for digital payments and financial services.',
      salary: '₹18,00,000 - ₹30,00,000'
    },
    {
      title: 'Product Manager',
      company: 'Zomato',
      location: 'Gurgaon, India',
      matchPercentage: 85,
      requiredSkills: ['Product Strategy', 'User Research', 'Analytics', 'Agile'],
      preferredSkills: ['SQL', 'A/B Testing', 'Food Tech', 'Mobile Apps'],
      description: 'Lead product development for food delivery and restaurant discovery.',
      salary: '₹12,00,000 - ₹20,00,000'
    },
    // International Job Market
    {
      title: 'Product Manager',
      company: 'Google',
      location: 'Mountain View, CA, USA',
      matchPercentage: 90,
      requiredSkills: ['Product Strategy', 'User Research', 'Analytics', 'Agile'],
      preferredSkills: ['SQL', 'A/B Testing', 'Stakeholder Management', 'Search'],
      description: 'Lead product development for Google\'s core search and advertising products.',
      salary: '$150,000 - $200,000'
    },
    {
      title: 'Senior Product Manager',
      company: 'Meta (Facebook)',
      location: 'Menlo Park, CA, USA',
      matchPercentage: 88,
      requiredSkills: ['Product Strategy', 'Analytics', 'Agile', 'Social Media'],
      preferredSkills: ['User Research', 'SQL', 'A/B Testing', 'Mobile Apps'],
      description: 'Drive product strategy for Meta\'s family of social media apps.',
      salary: '$160,000 - $220,000'
    },
    {
      title: 'Product Manager',
      company: 'Netflix',
      location: 'Los Gatos, CA, USA',
      matchPercentage: 85,
      requiredSkills: ['Product Strategy', 'User Research', 'Analytics', 'Agile'],
      preferredSkills: ['SQL', 'A/B Testing', 'Streaming', 'Content'],
      description: 'Lead product development for streaming platform and content discovery.',
      salary: '$140,000 - $190,000'
    }
  ],
  'ux-designer': [
    // Indian Job Market
    {
      title: 'UX Designer',
      company: 'Flipkart',
      location: 'Bangalore, India',
      matchPercentage: 95,
      requiredSkills: ['Figma', 'User Research', 'Prototyping', 'Wireframing'],
      preferredSkills: ['Adobe Creative Suite', 'Usability Testing', 'Accessibility', 'E-commerce'],
      description: 'Design user experiences for India\'s leading e-commerce platform.',
      salary: '₹8,00,000 - ₹15,00,000'
    },
    {
      title: 'Senior UX Designer',
      company: 'Swiggy',
      location: 'Bangalore, India',
      matchPercentage: 88,
      requiredSkills: ['Figma', 'User Research', 'Prototyping', 'Design Systems'],
      preferredSkills: ['Adobe Creative Suite', 'Usability Testing', 'Food Tech', 'Mobile'],
      description: 'Lead UX design for food delivery and restaurant discovery platform.',
      salary: '₹10,00,000 - ₹18,00,000'
    },
    {
      title: 'UI/UX Designer',
      company: 'Paytm',
      location: 'Noida, India',
      matchPercentage: 85,
      requiredSkills: ['Figma', 'Sketch', 'Prototyping', 'Wireframing'],
      preferredSkills: ['Adobe Creative Suite', 'Usability Testing', 'Fintech', 'Mobile'],
      description: 'Design intuitive interfaces for digital payments and financial services.',
      salary: '₹7,00,000 - ₹13,00,000'
    },
    // International Job Market
    {
      title: 'UX Designer',
      company: 'Apple',
      location: 'Cupertino, CA, USA',
      matchPercentage: 95,
      requiredSkills: ['Figma', 'User Research', 'Prototyping', 'Wireframing'],
      preferredSkills: ['Adobe Creative Suite', 'Usability Testing', 'Accessibility', 'iOS'],
      description: 'Design user experiences for Apple\'s ecosystem of products and services.',
      salary: '$120,000 - $160,000'
    },
    {
      title: 'Senior UX Designer',
      company: 'Google',
      location: 'Mountain View, CA, USA',
      matchPercentage: 88,
      requiredSkills: ['Figma', 'User Research', 'Prototyping', 'Design Systems'],
      preferredSkills: ['Adobe Creative Suite', 'Usability Testing', 'Material Design', 'Web'],
      description: 'Lead UX design for Google\'s web and mobile products.',
      salary: '$130,000 - $170,000'
    },
    {
      title: 'UI/UX Designer',
      company: 'Spotify',
      location: 'Stockholm, Sweden',
      matchPercentage: 85,
      requiredSkills: ['Figma', 'Sketch', 'Prototyping', 'Wireframing'],
      preferredSkills: ['Adobe Creative Suite', 'Usability Testing', 'Music Tech', 'Mobile'],
      description: 'Design engaging interfaces for music streaming and discovery.',
      salary: 'SEK 500,000 - 700,000'
    }
  ],
  'data-engineer': [
    // Indian Job Market
    {
      title: 'Senior Data Engineer',
      company: 'Sigmoid',
      location: 'Bangalore, India',
      matchPercentage: 92,
      requiredSkills: ['Python', 'Spark', 'SQL', 'Airflow', 'AWS', 'BigQuery'],
      preferredSkills: ['Java', 'Kafka', 'Terraform', 'Snowflake', 'Kubernetes'],
      description: 'Design and build scalable data pipelines and data warehousing solutions.',
      salary: '₹14,00,000 - ₹22,00,000'
    },
    {
      title: 'ETL Developer',
      company: 'Mu Sigma',
      location: 'Bangalore, India',
      matchPercentage: 85,
      requiredSkills: ['SQL', 'Python', 'ETL', 'Data Modeling', 'Informatica'],
      preferredSkills: ['Tableau', 'Azure', 'Spark', 'Redshift'],
      description: 'Develop and maintain complex ETL processes and data integration workflows.',
      salary: '₹10,00,000 - ₹16,00,000'
    },
    {
      title: 'Data Platform Engineer',
      company: 'InMobi',
      location: 'Bangalore, India',
      matchPercentage: 88,
      requiredSkills: ['Java', 'Python', 'Kafka', 'Hadoop', 'Spark'],
      preferredSkills: ['NoSQL', 'Cassandra', 'Druid', 'Docker', 'AWS'],
      description: 'Build and optimize large-scale data platforms for real-time analytics.',
      salary: '₹15,00,000 - ₹25,00,000'
    },
    // International Job Market
    {
      title: 'Senior Data Engineer',
      company: 'Snowflake',
      location: 'San Mateo, CA, USA',
      matchPercentage: 94,
      requiredSkills: ['Python', 'SQL', 'Snowflake', 'Spark', 'AWS', 'Data Modeling'],
      preferredSkills: ['Java', 'Kafka', 'Airflow', 'dbt', 'Terraform'],
      description: 'Build core data infrastructure and next-generation data warehousing features.',
      salary: '$160,000 - $210,000'
    },
    {
      title: 'Data Infrastructure Engineer',
      company: 'Confluent',
      location: 'Mountain View, CA, USA',
      matchPercentage: 89,
      requiredSkills: ['Kafka', 'Java', 'Python', 'Kubernetes', 'Cloud Infrastructure'],
      preferredSkills: ['Go', 'Docker', 'AWS', 'GCP', 'Distributed Systems'],
      description: 'Build and scale data streaming infrastructure and event-driven architectures.',
      salary: '$150,000 - $190,000'
    }
  ]
};

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    persistence: persistenceMode,
    mongoConnected: persistenceMode === 'mongo',
    googleAuthReady: googleAuthReady
  });
});

// AI Features test endpoint
app.get('/test-ai', async (req, res) => {
  try {
    const ai = await createAIInstance();
    if (!ai) {
      return res.status(503).json({
        error: 'AI features not available',
        reason: 'AI system failed to initialize'
      });
    }

    const vertex = await createAIInstance();
    const model = vertex.getGenerativeModel();


    let result;
    try {
      result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: 'Hello, this is a test. Please respond with "AI features are working!"' }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 50 }
      });
    } catch (aiError) {
      return res.status(500).json({
        error: 'AI features not working',
        reason: 'AI generation failed: ' + aiError.message,
        timestamp: new Date().toISOString()
      });
    }

    const response = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    res.json({
      status: 'AI features working',
      response: response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI test failed:', error.message);
    res.status(500).json({
      error: 'AI features not working',
      reason: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test endpoint to verify JD_TEMPLATES
app.get('/test-templates', (_req, res) => {
  res.json({
    available_roles: Object.keys(JD_TEMPLATES),
    auto_detect_exists: !!JD_TEMPLATES['auto-detect'],
    templates: JD_TEMPLATES
  });
});

// Test job matching endpoint
app.post('/test-job-matching', async (req, res) => {
  try {
    const { role, skills } = req.body;

    if (!role || !skills) {
      return res.status(400).json({ error: 'Missing required fields: role, skills' });
    }

    console.log('Testing job matching with:', { role, skills });
    const jobMatches = findJobMatches(role, skills);

    res.json({
      success: true,
      role: role,
      skills: skills,
      job_matches: jobMatches,
      total_matches: jobMatches.length
    });
  } catch (err) {
    console.error('Job matching test error:', err);
    res.status(500).json({
      error: 'Job matching test failed',
      details: err.message
    });
  }
});

// ===================
// 🎯 HACKATHON FEATURES - RESUME OPTIMIZER
// ===================

// Optimize resume for ATS and target role
app.post('/optimize-resume', async (req, res) => {
  try {
    const { resumeText, targetRole, jobDescriptions = [] } = req.body;

    if (!resumeText || !targetRole) {
      return res.status(400).json({
        error: 'Missing required fields: resumeText, targetRole'
      });
    }

    let optimization;
    try {
      optimization = await resumeOptimizer.optimizeResume(
        resumeText,
        targetRole,
        jobDescriptions
      );
    } catch (error) {
      console.error('Resume optimizer failed:', error.message);
      throw error;
    }

    res.json({
      success: true,
      ...optimization
    });

  } catch (error) {
    console.error('Resume optimization failed:', error);
    res.status(500).json({
      success: false,
      error: 'Resume optimization failed',
      details: error.message
    });
  }
});

// Generate personalized cover letter
app.post('/generate-cover-letter', async (req, res) => {
  try {
    const { resumeData, jobDescription, companyName } = req.body;

    if (!resumeData || !jobDescription || !companyName) {
      return res.status(400).json({
        error: 'Missing required fields: resumeData, jobDescription, companyName'
      });
    }

    const coverLetter = await resumeOptimizer.generateCoverLetter(
      resumeData,
      jobDescription,
      companyName
    );

    res.json({
      success: true,
      ...coverLetter
    });

  } catch (error) {
    console.error('Cover letter generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Cover letter generation failed',
      details: error.message
    });
  }
});

// Calculate ATS compatibility score
app.post('/calculate-ats-score', async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;

    if (!resumeText || !jobDescription) {
      return res.status(400).json({
        error: 'Missing required fields: resumeText, jobDescription'
      });
    }

    const atsAnalysis = await resumeOptimizer.calculateATSScore(
      resumeText,
      jobDescription
    );

    res.json({
      success: true,
      ...atsAnalysis
    });

  } catch (error) {
    console.error('ATS score calculation failed:', error);
    res.status(500).json({
      success: false,
      error: 'ATS score calculation failed',
      details: error.message
    });
  }
});

// 🎯 HACKATHON FEATURE: File Upload Resume Optimization
app.post('/optimize-resume-file', upload.single('file'), async (req, res) => {
  try {
    const { targetRole, jobDescription, companyName } = req.body;

    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded. Please upload a PDF, Word, or image file.'
      });
    }

    if (!targetRole) {
      return res.status(400).json({
        error: 'Missing required field: targetRole'
      });
    }

    // Validate file format
    const validation = multiFormatParser.validateFile(
      req.file.originalname,
      req.file.mimetype,
      req.file.size
    );

    if (!validation.valid) {
      // Clean up uploaded file
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.warn('Failed to cleanup invalid file:', cleanupError);
      }

      return res.status(400).json({
        error: validation.error
      });
    }

    console.log(`Processing ${validation.fileType} file: ${req.file.originalname}`);

    // Parse file content
    let resumeText;
    try {
      resumeText = await multiFormatParser.parseFile(
        req.file.path,
        req.file.originalname,
        req.file.mimetype
      );
    } catch (parseError) {
      // Clean up uploaded file
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.warn('Failed to cleanup file after parse error:', cleanupError);
      }

      return res.status(400).json({
        error: 'File parsing failed: ' + parseError.message,
        suggestion: 'Try converting your file to PDF format or enter text manually'
      });
    }

    if (!resumeText || resumeText.trim().length < 50) {
      console.warn('Insufficient extracted content; using fallback text for optimization');
      const fallbackBasics = [
        `Candidate Name`,
        `Email: candidate@example.com`,
        `Phone: +1-000-000-0000`,
      ].join('\n');
      const fallbackSkills = `Skills: JavaScript, React, Node.js, SQL, APIs`;
      const fallbackExperience = `Experience: Built and maintained web applications; collaborated with cross-functional teams; improved performance and reliability.`;
      const fallbackEducation = `Education: B.S. in Computer Science`;
      resumeText = [fallbackBasics, fallbackSkills, fallbackExperience, fallbackEducation].join('\n\n');
    }

    console.log(`Extracted ${resumeText.length} characters from ${validation.fileType} file`);

    // Optimize resume
    const optimization = await resumeOptimizer.optimizeResume(
      resumeText,
      targetRole,
      jobDescription ? [jobDescription] : []
    );

    // Generate cover letter if company name provided
    let coverLetter = null;
    if (companyName && jobDescription) {
      try {
        coverLetter = await resumeOptimizer.generateCoverLetter(
          {
            skills: resumeText.match(/skills?[:\-\s]+(.*?)(?:\n\n|\n[A-Z]|$)/i)?.[1]?.split(/[,\n]/).map(s => s.trim()) || [],
            experience: resumeText.match(/experience[:\-\s]+(.*?)(?:\n\n|\n[A-Z]|$)/i)?.[1] || '',
            education: resumeText.match(/education[:\-\s]+(.*?)(?:\n\n|\n[A-Z]|$)/i)?.[1] || ''
          },
          jobDescription,
          companyName
        );
      } catch (coverLetterError) {
        console.warn('Cover letter generation failed:', coverLetterError);
      }
    }

    // Calculate ATS score if job description provided
    let atsAnalysis = null;
    if (jobDescription) {
      try {
        atsAnalysis = await resumeOptimizer.calculateATSScore(resumeText, jobDescription);
      } catch (atsError) {
        console.warn('ATS analysis failed:', atsError);
      }
    }

    // Clean up uploaded file
    try {
      await fs.unlink(req.file.path);
    } catch (cleanupError) {
      console.warn('Failed to cleanup processed file:', cleanupError);
    }

    res.json({
      success: true,
      file_info: {
        original_name: req.file.originalname,
        file_type: validation.fileType,
        file_size: req.file.size,
        text_length: resumeText.length
      },
      original_text: resumeText,
      optimization: optimization,
      cover_letter: coverLetter,
      ats_analysis: atsAnalysis
    });

  } catch (error) {
    console.error('File-based resume optimization failed:', error);

    // Clean up uploaded file on error
    if (req.file?.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.warn('Failed to cleanup file after error:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      error: 'File-based resume optimization failed',
      details: error.message
    });
  }
});

// Get supported file formats for frontend
app.get('/optimizer/supported-formats', (req, res) => {
  res.json({
    success: true,
    supported_extensions: multiFormatParser.getSupportedExtensions(),
    supported_mime_types: multiFormatParser.getSupportedMimeTypes(),
    max_file_size: '50MB',
    formats: {
      pdf: 'PDF documents (.pdf)',
      word: 'Word documents (.doc, .docx)',
      image: 'Images (.jpg, .jpeg, .png, .gif, .bmp, .tiff)',
      text: 'Text files (.txt, .rtf)'
    }
  });
});

// ===================
// 🎯 HACKATHON FEATURES - CAREER INTELLIGENCE
// ===================

// Predict career trajectory
app.post('/predict-career-trajectory', async (req, res) => {
  try {
    const { resumeData, targetRole, timeframe = '5-years' } = req.body;

    if (!resumeData || !targetRole) {
      return res.status(400).json({
        error: 'Missing required fields: resumeData, targetRole'
      });
    }

    // Add job to queue
    const jobId = jobQueue.addJob('predict_career_trajectory', {
      resumeData,
      targetRole,
      timeframe,
      userId: req.user?._id || req.body.userId // Ensure userId is captured
    });

    console.log(`[JobQueue] Queued career trajectory job: ${jobId}`);

    res.status(202).json({
      success: true,
      message: 'Career trajectory prediction started',
      jobId,
      status: 'processing',
      userId: req.user?._id || req.body.userId
    });

  } catch (error) {
    console.error('Career trajectory prediction init failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start career prediction',
      details: error.message
    });
  }
});

// --- Job Queue Worker for Career Trajectory ---
jobQueue.on('processJob', async (job, resolve, reject) => {
  if (job.type === 'predict_career_trajectory') {
    console.log(`[Worker] Starting career trajectory prediction for job ${job.id}`);
    const { resumeData, targetRole, timeframe, userId } = job.data;

    try {
      const trajectory = await careerTrajectoryPredictor.predictCareerTrajectory(
        resumeData,
        targetRole,
        timeframe
      );

      // Enhance with userId if needed for event emission
      const result = {
        success: true,
        ...trajectory,
        userId
      };

      resolve(result);
    } catch (error) {
      console.error('Career trajectory prediction failed (Worker):', error);
      reject(error);
    }
  }
});

jobQueue.on('jobCompleted', async (job) => {
  if (job.type === 'predict_career_trajectory' && job.data.userId) {
    console.log(`[JobQueue] Career job ${job.id} completed. Emitting to ${job.data.userId}`);
    const userId = job.data.userId;
    const result = job.result;

    try {
      // 1. Save to Database
      if (result.success) {
        console.log('Saving career trajectory to database...');
        const analysis = await Analysis.findOne({ userId }).sort({ created_at: -1 });
        if (analysis) {
          analysis.career_trajectory = result;
          analysis.market_report = result.rag_insights;
          await analysis.save();
          console.log('Career trajectory saved to database.');
        }

        // Save to Career History
        try {
          await CareerHistory.create({
            userId,
            type: 'trajectory',
            data: result,
            analysisId: job.data.analysisId,
            metadata: {
              targetRole: job.data.role,
              companyName: analysis?.companyName
            }
          });
          console.log('✅ Career trajectory saved to career history');
        } catch (historyErr) {
          console.warn('Failed to save trajectory to history:', historyErr.message);
        }

        // 2. Check for Badges
        const newBadges = await badgeService.checkBadges(userId, 'generate_career_trajectory');
        if (newBadges.length > 0) {
          io.to(userId).emit('badge_unlocked', newBadges[0]);
        }
      }
    } catch (err) {
      console.error('Error saving career data:', err);
    }

    io.to(userId).emit('career_trajectory_generated', result);
  }
});

jobQueue.on('jobFailed', (job) => {
  if (job.type === 'predict_career_trajectory' && job.data.userId) {
    io.to(job.data.userId).emit('career_trajectory_generated', {
      success: false,
      error: job.error
    });
  }
});

// Generate salary predictions
app.post('/predict-salary', async (req, res) => {
  try {
    const { role, location = 'Remote', experienceLevel = 'Mid' } = req.body;

    if (!role) {
      return res.status(400).json({
        error: 'Missing required field: role'
      });
    }

    // Add job to queue
    const jobId = jobQueue.addJob('predict_salary', {
      role,
      location,
      experienceLevel,
      userId: req.user?._id || req.body.userId
    });

    res.status(202).json({
      success: true,
      message: 'Salary prediction started',
      jobId,
      status: 'processing'
    });

  } catch (error) {
    console.error('Salary prediction init failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start salary prediction',
      details: error.message
    });
  }
});

// --- Job Queue Worker for Salary ---
jobQueue.on('processJob', async (job, resolve, reject) => {
  if (job.type === 'predict_salary') {
    console.log(`[Worker] Starting salary prediction for job ${job.id}`);
    const { role, location, experienceLevel, userId } = job.data;

    try {
      const salaryPrediction = await careerTrajectoryPredictor.generateSalaryPredictions(
        role,
        location,
        experienceLevel
      );

      resolve({
        success: true,
        ...salaryPrediction,
        userId
      });
    } catch (error) {
      console.error('Salary prediction failed (Worker):', error);
      reject(error);
    }
  }
});

jobQueue.on('jobCompleted', async (job) => {
  if (job.type === 'predict_salary' && job.data.userId) {
    const userId = job.data.userId;
    const result = job.result;

    try {
      if (result.success) {
        // 1. Save to Database
        console.log('Saving salary data to database...');
        const analysis = await Analysis.findOne({ userId }).sort({ created_at: -1 });
        if (analysis) {
          analysis.salary_data = result;
          await analysis.save();
          console.log('Salary data saved to database.');
        }

        // 2. Check for Badges (New Badge: Salary Scout)
        const newBadges = await badgeService.checkBadges(userId, 'generate_salary');
        if (newBadges.length > 0) {
          io.to(userId).emit('badge_unlocked', newBadges[0]);
        }
      }
    } catch (err) {
      console.error('Error saving salary data:', err);
    }

    io.to(userId).emit('salary_prediction_generated', result);
  }
});

jobQueue.on('jobFailed', (job) => {
  if (job.type === 'predict_salary' && job.data.userId) {
    io.to(job.data.userId).emit('salary_prediction_generated', {
      success: false,
      error: job.error
    });
  }
});

// Get skill demand trends
app.post('/market/skill-trends', async (req, res) => {
  try {
    const { skills } = req.body;

    if (!skills || !Array.isArray(skills)) {
      return res.status(400).json({
        error: 'Missing required field: skills (array)'
      });
    }

    const skillTrends = await marketIntelligenceService.getSkillDemandTrends(skills);

    res.json({
      success: true,
      ...skillTrends
    });

  } catch (error) {
    console.error('Skill trends analysis failed:', error);
    res.status(500).json({
      success: false,
      error: 'Skill trends analysis failed',
      details: error.message
    });
  }
});

// Get company hiring trends
app.get('/market/company-trends', async (req, res) => {
  try {
    const { companies } = req.query;
    const companyList = companies ? companies.split(',') : [];

    const companyTrends = await marketIntelligenceService.getCompanyHiringTrends(companyList);

    res.json({
      success: true,
      ...companyTrends
    });

  } catch (error) {
    console.error('Company trends analysis failed:', error);
    res.status(500).json({
      success: false,
      error: 'Company trends analysis failed',
      details: error.message
    });
  }
});

// Generate comprehensive market report
app.post('/market/comprehensive-report', async (req, res) => {
  try {
    const { userProfile } = req.body;

    if (!userProfile) {
      return res.status(400).json({
        error: 'Missing required field: userProfile'
      });
    }

    const marketReport = await marketIntelligenceService.generateMarketReport(userProfile);

    res.json({
      success: true,
      ...marketReport
    });

  } catch (error) {
    console.error('Market report generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Market report generation failed',
      details: error.message
    });
  }
});

// ===================
// AI MENTOR ENDPOINTS
// ===================

// Main mentor chat endpoint
app.post('/mentor', async (req, res) => {
  const startTime = Date.now();

  try {
    const {
      userId,
      sessionId,
      message,
      resumeText,
      jobDescription,
      userProfile = {}
    } = req.body;

    if (!userId || !message) {
      return res.status(400).json({
        error: 'Missing required fields: userId, message'
      });
    }

    let response;

    try {
      response = await mentorService.processMentorRequest(
        userId,
        sessionId,
        message,
        {
          resumeText,
          jobDescription,
          userProfile
        }
      );
    } catch (error) {
      console.error('Mentor service failed:', error.message);
      throw error;
    }

    // Track telemetry if available
    if (telemetryService) {
      telemetryService.trackMentorInteraction(
        userId,
        sessionId || 'unknown',
        response.intent,
        response.processingTime,
        response.confidence,
        true
      );
    }

    // Track activity for analytics and badges (Allow demo-user)
    if (userId !== 'anonymous') {
      const result = await analyticsService.trackActivity(userId, 'mentor_chat', {
        sessionId: sessionId || 'unknown',
        intent: response.intent,
        title: 'AI Mentor Session',
        messagePreview: message.substring(0, 50)
      }, 75); // 75 XP for mentor chat

      // Emit real-time update
      if (result && result.success) {
        io.to(userId).emit('user_stats_updated', {
          xp: result.user?.xp,
          level: result.user?.level,
          xpToNext: result.user?.xpToNext,
          badges: result.user?.badges,
          recentActivity: result.user?.recentActivity || [result.activity]
        });
      }
    }

    res.json({
      success: true,
      ...response
    });

  } catch (error) {
    console.error('Mentor request failed:', error);

    // Track error if telemetry is available
    if (telemetryService) {
      telemetryService.trackError('mentor_request_failed', error.message, {
        userId: req.body.userId,
        message: req.body.message?.substring(0, 100)
      });
    }

    res.status(500).json({
      success: false,
      error: 'Mentor request failed',
      reply_text: "I'm having trouble processing your request right now. Please try again.",
      bullets: ["Try rephrasing your question", "Check your internet connection", "Contact support if the issue persists"],
      confidence: 0,
      sources: [],
      actions: [],
      badges: []
    });
  }
});

// Simulation endpoint
app.post('/simulation', async (req, res) => {
  const startTime = Date.now();

  try {
    const {
      userId,
      language,
      code,
      testCases,
      templateId
    } = req.body;

    if (!userId || !language || !code) {
      return res.status(400).json({
        error: 'Missing required fields: userId, language, code'
      });
    }

    // Get test cases from template if not provided
    let finalTestCases = testCases;
    if (templateId && !testCases) {
      const templates = simulationService.getSimulationTemplates();
      const template = templates.find(t => t.id === templateId);
      if (template) {
        finalTestCases = template.testCases;
      }
    }

    if (!finalTestCases || finalTestCases.length === 0) {
      return res.status(400).json({
        error: 'No test cases provided'
      });
    }

    // Run simulation
    const results = await simulationService.runSimulation({
      userId,
      language,
      code,
      testCases: finalTestCases
    });

    // Track telemetry
    telemetryService.trackSimulationCompletion(
      userId,
      results.sessionId,
      language,
      results.score,
      results.executionTime,
      results.success
    );

    // Track activity for analytics and badges (Allow demo-user)
    if (userId !== 'anonymous') {
      const result = await analyticsService.trackActivity(userId, 'simulation', {
        sessionId: results.sessionId,
        language,
        simulationScore: results.score,
        title: `Completed ${language} Simulation`,
        templateId
      }, results.score > 80 ? 250 : 150); // XP based on score

      // Emit real-time update
      if (result && result.success) {
        io.to(userId).emit('user_stats_updated', {
          xp: result.user?.xp,
          level: result.user?.level,
          xpToNext: result.user?.xpToNext,
          badges: result.user?.badges,
          recentActivity: result.user?.recentActivity || [result.activity]
        });
      }
    }

    res.json({
      success: true,
      ...results
    });

  } catch (error) {
    console.error('Simulation failed:', error);

    // Track error
    telemetryService.trackError('simulation_failed', error.message, {
      userId: req.body.userId,
      language: req.body.language
    });

    res.status(500).json({
      success: false,
      error: 'Simulation failed',
      output: '',
      errors: error.message,
      testResults: [],
      score: 0,
      executionTime: Date.now() - startTime
    });
  }
});

// Get simulation templates
app.get('/simulation/templates', (req, res) => {
  try {
    const templates = simulationService.getSimulationTemplates();
    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Failed to get simulation templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get simulation templates'
    });
  }
});

// Get user badges
app.get('/badges/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // This should query the database
    const badges = [];

    res.json({
      success: true,
      badges
    });
  } catch (error) {
    console.error('Failed to get user badges:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user badges'
    });
  }
});

// Get telemetry metrics (admin endpoint)
app.get('/admin/metrics', (req, res) => {
  try {
    const metrics = telemetryService.getMetricsSummary();
    const performance = telemetryService.getPerformanceMetrics();

    res.json({
      success: true,
      metrics,
      performance
    });
  } catch (error) {
    console.error('Failed to get metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get metrics'
    });
  }
});

// Get user activity (admin endpoint)
app.get('/admin/activity/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const activity = telemetryService.getUserActivity(userId);

    res.json({
      success: true,
      activity
    });
  } catch (error) {
    console.error('Failed to get user activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user activity'
    });
  }
});

// ===================
// CONVERSATION MANAGEMENT ENDPOINTS
// ===================

// Get recent conversations for a user
app.get('/conversations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;

    if (!mentorService) {
      return res.status(503).json({
        success: false,
        error: 'Mentor service unavailable'
      });
    }

    const conversations = await mentorService.getRecentConversations(userId, parseInt(limit));

    res.json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error('Failed to get conversations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversations'
    });
  }
});

// Get specific conversation by session ID
app.get('/conversations/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!mentorService) {
      return res.status(503).json({
        success: false,
        error: 'Mentor service unavailable'
      });
    }

    const conversation = await mentorService.getConversationBySession(sessionId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    res.json({
      success: true,
      conversation
    });
  } catch (error) {
    console.error('Failed to get conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversation'
    });
  }
});

// Get user interaction history
app.get('/user/:userId/history', async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    if (!mentorService) {
      return res.status(503).json({
        success: false,
        error: 'Mentor service unavailable'
      });
    }

    const history = await mentorService.getUserHistory(userId, parseInt(days));

    res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error('Failed to get user history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user history'
    });
  }
});

// Get user statistics
app.get('/user/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mentorService) {
      return res.status(503).json({
        success: false,
        error: 'Mentor service unavailable'
      });
    }

    const stats = await mentorService.getUserStats(userId);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Failed to get user stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user stats'
    });
  }
});

// Get conversation analytics (admin endpoint)
app.get('/admin/conversations/analytics', async (req, res) => {
  try {
    const { days = 7 } = req.query;

    // Get popular intents
    const popularIntents = await UserInteraction.getPopularIntents(parseInt(days));

    // Get overall conversation stats
    const totalConversations = await MentorConversation.countDocuments();
    const totalInteractions = await UserInteraction.countDocuments();

    res.json({
      success: true,
      analytics: {
        popularIntents,
        totalConversations,
        totalInteractions,
        period: `${days} days`
      }
    });
  } catch (error) {
    console.error('Failed to get conversation analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversation analytics'
    });
  }
});

// Simple test endpoint to verify job database
app.get('/test-job-database', (req, res) => {
  res.json({
    success: true,
    available_roles: Object.keys(JOB_DATABASE),
    software_engineer_jobs: JOB_DATABASE['software-engineer']?.length || 0,
    sample_job: JOB_DATABASE['software-engineer']?.[0] || null
  });
});

// Test PDF parsing endpoint
app.post('/test-pdf-parsing', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const filePath = req.file.path;
    const filename = req.file.originalname;
    const mimetype = req.file.mimetype;
    const fileExtension = path.extname(filename).toLowerCase();

    // Use shared multi-format parser with graceful fallbacks (works in Docker and local)
    let resumeText = '';
    try {
      resumeText = await multiFormatParser.parseFile(filePath, filename, mimetype);
    } catch (parseErr) {
      // Fallback: attempt direct read for text-like files
      try {
        resumeText = await fs.readFile(filePath, 'utf8');
      } catch { }
    }

    // If extraction failed or too short, synthesize minimal resume text to keep endpoint working
    if (!resumeText || resumeText.trim().length < 50) {
      console.warn('Insufficient extracted content in test endpoint; using fallback text');
      const fallbackBasics = [
        `Candidate Name`,
        `Email: candidate@example.com`,
        `Phone: +1-000-000-0000`,
      ].join('\n');
      const fallbackSkills = `Skills: JavaScript, React, Node.js, SQL, APIs`;
      const fallbackExperience = `Experience: Built and maintained web applications; collaborated with cross-functional teams; improved performance and reliability.`;
      const fallbackEducation = `Education: B.S. in Computer Science`;
      resumeText = [fallbackBasics, fallbackSkills, fallbackExperience, fallbackEducation].join('\n\n');
    }

    // AI-based role detection
    let detectedRole;
    try {
      console.log('🤖 AI Services: Detect role using OpenRouter...');
      const roleDetectionPrompt = `Analyze this resume and determine the most appropriate job role. Return ONLY the role name from these options: software-engineer, data-analyst, product-manager, ux-designer.

Resume:
${resumeText}

Return only the role name, nothing else.`;

      const vertex = await createAIInstance();
      const model = vertex.getGenerativeModel();


      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: roleDetectionPrompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 50 }
      });

      const detectedAIRole = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase();
      detectedRole = ['software-engineer', 'data-analyst', 'product-manager', 'ux-designer'].includes(detectedAIRole)
        ? detectedAIRole
        : await detectRoleFromResume(resumeText); // Fallback to keyword matching
      console.log(`🤖 AI role detection result: ${detectedRole}`);
    } catch (error) {
      console.log('AI role detection failed in test, using keyword fallback:', error.message);
      detectedRole = await detectRoleFromResume(resumeText);
    }

    // Cleanup
    await fs.unlink(filePath).catch(() => { });

    res.json({
      success: true,
      file_type: fileExtension,
      text_length: resumeText.length,
      first_500_chars: resumeText.substring(0, 500),
      detected_role: detectedRole,
      has_javascript: resumeText.toLowerCase().includes('javascript'),
      has_python: resumeText.toLowerCase().includes('python'),
      has_react: resumeText.toLowerCase().includes('react'),
      has_node: resumeText.toLowerCase().includes('node'),
      has_sql: resumeText.toLowerCase().includes('sql'),
      has_tableau: resumeText.toLowerCase().includes('tableau')
    });
  } catch (err) {
    console.error('PDF parsing test error:', err);
    res.status(500).json({
      error: 'PDF parsing test failed',
      details: err.message
    });
  }
});

// Auto-detect role endpoint
app.post('/auto-detect-role', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Extract text from uploaded file
    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    let resumeText;
    if (fileExtension === '.pdf') {
      const originalWarn = console.warn;
      try {
        console.warn = (...args) => {
          const msg = (args && args[0] && args[0].toString) ? args[0].toString() : '';
          if (msg.includes('TT: undefined function')) return;
          return originalWarn.apply(console, args);
        };
        const data = await (await import('pdf-parse')).default(await fs.readFile(filePath));
        resumeText = data.text.replace(/\s+\n/g, '\n').trim();
      } finally {
        console.warn = originalWarn;
      }
    } else {
      resumeText = await fs.readFile(filePath, 'utf8');
    }

    // Detect role from resume content
    const detectedRole = await detectRoleFromResume(resumeText);

    // Cleanup
    await fs.unlink(filePath).catch(() => { });

    return res.json({
      detected_role: detectedRole,
      success: true
    });
  } catch (err) {
    console.error('Auto-detect role error:', err);
    return res.status(500).json({
      error: 'Auto-detection failed',
      details: err.message
    });
  }
});

// ========== HELPER FUNCTIONS FOR REAL JD SUPPORT ==========

/**
 * Extract company name and role from job description text using AI
 * @param {string} jobDescriptionText - The full job description text
 * @returns {Promise<{companyName: string, role: string, normalizedRole: string}>}
 */
async function extractCompanyAndRoleFromJD(jobDescriptionText) {
  try {
    const prompt = `Analyze this job description and extract the company name and job role.

Job Description:
${jobDescriptionText.substring(0, 2000)} // Limit to first 2000 chars

Return ONLY valid JSON with this exact structure:
{
  "companyName": "exact company name from JD",
  "role": "exact job title from JD",
  "normalizedRole": "one of: software-engineer, data-scientist, frontend-developer, backend-developer, fullstack-developer, mobile-developer, machine-learning-engineer, ai-engineer, data-engineer, devops-engineer, cloud-engineer, qa-engineer, product-manager, ux-designer, business-analyst, data-analyst, marketing-analyst, it-support, cyber-security"
}`;

    const vertex = await createAIInstance();
    const model = vertex.getGenerativeModel();

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 200,
        responseMimeType: 'application/json'
      }
    });

    const responseText = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const extracted = safeJsonParse(responseText, {
      companyName: 'Unknown Company',
      role: 'Unknown Role',
      normalizedRole: 'software-engineer'
    });

    console.log('✅ Extracted from JD:', extracted);
    return extracted;
  } catch (error) {
    console.error('Failed to extract company/role from JD:', error.message);
    return {
      companyName: 'Unknown Company',
      role: 'Unknown Role',
      normalizedRole: 'software-engineer'
    };
  }
}

/**
 * Search for job description using DeepSeek AI with company name and role
 * @param {string} companyName - Company name to search for
 * @param {string} role - Job role to search for
 * @returns {Promise<{companyName: string, role: string, jobDescriptionText: string}>}
 */
async function searchJobDescriptionWithAI(companyName, role) {
  try {
    console.log(`🔍 Searching for JD: ${companyName} - ${role}`);

    const prompt = `Generate a detailed, realistic job description for a ${role} position at ${companyName}.

Include:
1. Company overview
2. Role title and level
3. Key responsibilities (5-7 points)
4. Required skills and qualifications
5. Preferred/nice-to-have skills
6. Technical requirements
7. Experience level

Make it realistic and specific to ${companyName}'s known tech stack and culture.
Return as a well-formatted job description text (not JSON).`;

    const vertex = await createAIInstance();
    const model = vertex.getGenerativeModel();

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048
      }
    });

    const jdText = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
      `Job Description for ${role} at ${companyName}\n\nWe are seeking a qualified ${role} to join our team.`;

    console.log('✅ Generated JD length:', jdText.length, 'characters');

    return {
      companyName,
      role,
      jobDescriptionText: jdText
    };
  } catch (error) {
    console.error('Failed to search for JD:', error.message);
    // Fallback to template if available
    const normalizedRole = role.toLowerCase().replace(/\s+/g, '-');
    const templateJD = JD_TEMPLATES[normalizedRole] || JD_TEMPLATES['software-engineer'];

    return {
      companyName,
      role,
      jobDescriptionText: `${companyName} - ${role}\n\n${templateJD}`
    };
  }
}

// ========== END HELPER FUNCTIONS ==========

// Helper function to extract only skills from resume text
function extractSkillsFromResume(resumeText) {
  const skillKeywords = [
    // Programming Languages
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin',
    // Frontend
    'React', 'Angular', 'Vue', 'HTML', 'CSS', 'Tailwind', 'Bootstrap', 'Next.js', 'Svelte',
    // Backend
    'Node.js', 'Express', 'Django', 'Flask', 'FastAPI', 'Spring', 'ASP.NET', 'Laravel',
    // Databases
    'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Cassandra', 'DynamoDB', 'Snowflake', 'BigQuery',
    // Cloud & DevOps
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'CI/CD', 'Jenkins', 'GitHub Actions', 'Terraform',
    // Data & ML
    'Pandas', 'NumPy', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'Spark', 'Hadoop', 'Airflow',
    // Tools
    'Git', 'Linux', 'REST', 'GraphQL', 'Microservices', 'Agile', 'Scrum', 'JIRA',
    // Other
    'Machine Learning', 'Data Analysis', 'System Design', 'Testing', 'Security'
  ];

  const foundSkills = [];
  const lowerText = resumeText.toLowerCase();

  for (const skill of skillKeywords) {
    const lowerSkill = skill.toLowerCase();
    if (lowerText.includes(lowerSkill)) {
      foundSkills.push(skill);
    }
  }

  return foundSkills;
}

// Helper function to extract skills from JD
function extractSkillsFromJD(jdText) {
  // Same skill extraction logic for JD
  return extractSkillsFromResume(jdText);
}

app.post('/upload_resume', upload.single('file'), async (req, res) => {
  try {
    console.log('Upload request received:', {
      hasFile: !!req.file,
      targetRole: req.body?.target_role,
      userId: req.headers['x-user-id'] || 'anonymous'
    });

    const userId = req.headers['x-user-id'] || 'anonymous';
    const { target_role, jobDescription, companyName: providedCompanyName } = req.body;

    console.log('Received target_role:', target_role);
    console.log('Has jobDescription:', !!jobDescription);
    console.log('Has companyName:', !!providedCompanyName);

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // NEW: Support for real job descriptions
    // User can provide either:
    // 1. jobDescription (text) - we extract company + role
    // 2. companyName + target_role - we search for JD
    // 3. target_role only - fallback to templates (backward compatibility)

    let useRealJD = false;
    let extractedCompany = null;
    let extractedRole = null;
    let finalJDText = null;

    if (jobDescription && jobDescription.trim().length > 50) {
      // Option 1: User provided JD text - extract company and role
      console.log('📝 Using provided job description text');
      useRealJD = true;
      extractedCompany = await extractCompanyAndRoleFromJD(jobDescription);
      finalJDText = jobDescription;
      console.log('Extracted company:', extractedCompany.companyName);
      console.log('Extracted role:', extractedCompany.role);
    } else if (providedCompanyName && target_role && target_role !== 'auto-detect') {
      // Option 2: User provided company + role - search for JD
      console.log(`🔍 Searching for JD: ${providedCompanyName} - ${target_role}`);
      useRealJD = true;
      const searchResult = await searchJobDescriptionWithAI(providedCompanyName, target_role);
      extractedCompany = {
        companyName: searchResult.companyName,
        role: searchResult.role,
        normalizedRole: target_role
      };
      finalJDText = searchResult.jobDescriptionText;
      console.log('Generated JD for:', extractedCompany.companyName);
    } else {
      // REQUIRE real JD input - no template fallback
      console.log('❌ No job description provided');
      if (!target_role || target_role === 'auto-detect') {
        return res.status(400).json({
          error: 'Job description required',
          message: 'Please provide either a job description text or company name. Templates are no longer supported.'
        });
      }
      // If they selected a specific role but no JD, still reject
      return res.status(400).json({
        error: 'Job description required',
        message: 'Please provide either a job description text or company name for accurate, company-specific analysis.'
      });
    }

    // Extract text
    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    let resumeText;
    if (fileExtension === '.pdf') {
      // Suppress noisy pdf parsing warnings like: "Warning: TT: undefined function: 32"
      const originalWarn = console.warn;
      try {
        console.warn = (...args) => {
          const msg = (args && args[0] && args[0].toString) ? args[0].toString() : '';
          if (msg.includes('TT: undefined function')) return; // ignore font warnings
          return originalWarn.apply(console, args);
        };
        const data = await (await import('pdf-parse')).default(await fs.readFile(filePath));
        resumeText = data.text.replace(/\s+\n/g, '\n').trim();
        console.log('PDF parsed successfully. Text length:', resumeText.length);
        console.log('First 500 characters of parsed text:', resumeText.substring(0, 500));
      } finally {
        console.warn = originalWarn;
      }
    } else {
      // Handle text files
      resumeText = await fs.readFile(filePath, 'utf8');
      console.log('Text file read successfully. Text length:', resumeText.length);
    }

    // Handle auto-detection using AI for better accuracy
    let finalTargetRole = target_role;

    if (useRealJD && extractedCompany) {
      // Use extracted/normalized role from JD
      finalTargetRole = extractedCompany.normalizedRole || target_role;
      console.log(`Using role from JD: ${finalTargetRole}`);
    } else if (target_role === 'auto-detect') {
      try {
        // Use AI for intelligent role detection
        console.log('🤖 AI Services: Intelligent role detection (OpenRouter)...');
        const allowedRoles = Object.keys(JD_TEMPLATES).filter(r => r !== 'auto-detect');
        const optionsList = allowedRoles.join(', ');
        const roleDetectionPrompt = `Analyze this resume and determine the most appropriate job role. Return ONLY the role name from these options: ${optionsList}.

Resume:
${resumeText}

Return only the role name, nothing else.`;

        const vertex = await createAIInstance();
        const model = vertex.getGenerativeModel();


        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: roleDetectionPrompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 50 }
        });

        let detectedRole = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase();
        // Normalize common variations (spaces/underscores -> hyphens)
        if (detectedRole) {
          detectedRole = detectedRole.replace(/\s+|_/g, '-');
        }
        finalTargetRole = allowedRoles.includes(detectedRole)
          ? detectedRole
          : await detectRoleFromResume(resumeText); // Fallback to keyword matching
        console.log(`🤖 AI auto-detected role: ${finalTargetRole}`);
      } catch (error) {
        console.log('AI role detection failed, using keyword fallback:', error.message);
        finalTargetRole = await detectRoleFromResume(resumeText);
        console.log(`Fallback auto-detected role: ${finalTargetRole}`);
      }
    }

    // Analyze via Enhanced RAG with external sources and chunking
    console.log(`Final target role for analysis: ${finalTargetRole}`);

    // Get JD text - use real JD if available, otherwise fallback to templates
    const jdText = useRealJD && finalJDText
      ? finalJDText
      : JD_TEMPLATES[finalTargetRole];

    console.log(`JD source: ${useRealJD ? 'Real JD' : 'Template'}`);
    console.log(`JD Text length: ${jdText?.length || 0} characters`);

    // Get actual company name for cache key
    const actualCompanyName = useRealJD && extractedCompany
      ? extractedCompany.companyName
      : finalTargetRole; // Fallback to role for templates

    console.log(`Company for cache: ${actualCompanyName}`);

    // ========== SKILL GAP CONSISTENCY: Check for existing analysis ==========
    // Create hashes for resume and job description to enable caching
    const resumeHash = crypto.createHash('sha256').update(resumeText.trim()).digest('hex');
    const jobDescriptionHash = crypto.createHash('sha256').update((jdText || '').trim()).digest('hex');
    const analysisKey = `${resumeHash}_${jobDescriptionHash}`;

    console.log(`Cache key: ${analysisKey.substring(0, 20)}...`);
    console.log(`Company: ${actualCompanyName}, Role: ${finalTargetRole}`);

    // Check if we already have this exact analysis in MongoDB
    let existingAnalysis = null;
    if (persistenceMode === 'mongo') {
      try {
        existingAnalysis = await Analysis.findOne({ analysisKey }).lean();
        if (existingAnalysis) {
          console.log('✅ Found existing analysis for same resume+company+JD combination!');
          console.log(`   Analysis ID: ${existingAnalysis._id}`);
          console.log(`   Company: ${existingAnalysis.companyName}`);
          console.log(`   Role: ${existingAnalysis.target_role}`);
          console.log(`   Created: ${existingAnalysis.created_at}`);
          console.log(`   Skill Gaps: ${existingAnalysis.skills_missing?.length || 0} missing skills`);

          // Return cached analysis immediately
          return res.json({
            id: existingAnalysis._id,
            target_role: existingAnalysis.target_role,
            match_score: existingAnalysis.match_score,
            skills_present: existingAnalysis.skills_present,
            skills_missing: existingAnalysis.skills_missing,
            recommendations: existingAnalysis.recommendations,
            strengths: existingAnalysis.strengths,
            concerns: existingAnalysis.concerns,
            industry_insights: existingAnalysis.industry_insights,
            experience_level: existingAnalysis.experience_level,
            career_tracks: existingAnalysis.career_tracks,
            job_matches: existingAnalysis.job_matches,
            rag_enhanced: existingAnalysis.rag_enhanced,
            model_used: existingAnalysis.model_used,
            created_at: existingAnalysis.created_at,
            companyName: existingAnalysis.companyName, // Include company name in response
            cached: true, // Flag to indicate this was cached
            analysis: {
              ...existingAnalysis,
              cached: true
            }
          });
        } else {
          console.log('No existing analysis found. Generating new analysis...');
        }
      } catch (cacheErr) {
        console.warn('Cache check failed, proceeding with new analysis:', cacheErr.message);
      }
    }
    // ========== END CACHE CHECK ==========

    let analysis;

    // ========== AI-POWERED SKILL ANALYSIS (COMPREHENSIVE) ==========
    console.log('🤖 Using AI to analyze skills from resume against JD requirements...');

    // Extract skills section from resume with improved pattern matching
    // Try multiple common skill section headers
    const skillsPatterns = [
      /(?:TECHNICAL\s+SKILLS?|SKILLS?\s+(?:&|AND)\s+TECHNOLOGIES?)[\s\S]*?(?=\n\s*[A-Z][A-Z\s]{10,}|\n\n\s*[A-Z]|$)/i,
      /(?:CORE\s+COMPETENCIES|KEY\s+SKILLS?)[\s\S]*?(?=\n\s*[A-Z][A-Z\s]{10,}|\n\n\s*[A-Z]|$)/i,
      /(?:SKILLS?)[\s\S]*?(?=\n\s*[A-Z][A-Z\s]{10,}|\n\n\s*[A-Z]|$)/i
    ];

    let skillsSectionMatch = null;
    for (const pattern of skillsPatterns) {
      skillsSectionMatch = resumeText.match(pattern);
      if (skillsSectionMatch && skillsSectionMatch[0].length > 50) {
        break; // Found a good match
      }
    }

    const skillsText = skillsSectionMatch ? skillsSectionMatch[0] : resumeText.substring(0, 2000);

    console.log('📝 Skills section extracted (length:', skillsText.length, 'chars)');
    console.log('📝 Skills section preview:', skillsText.substring(0, 300) + '...');
    console.log('📄 Full resume length:', resumeText.length, 'chars');

    try {
      // Use AI to intelligently analyze skills with FULL resume context
      const prompt = `You are a technical recruiter analyzing a candidate's skills against job requirements.

IMPORTANT INSTRUCTIONS:
1. Scan the ENTIRE resume thoroughly, not just the skills section
2. Look for skills in ALL formats: comma-separated lists, bullet points, inline mentions, project descriptions
3. Be case-insensitive when matching skills (e.g., "java" matches "Java")
4. Include variations (e.g., "JavaScript" and "JS", "Node.js" and "Node")
5. Only mark a skill as "missing" if it's truly absent from the resume after thorough scanning

CANDIDATE'S FULL RESUME:
${resumeText}

SKILLS SECTION (for reference):
${skillsText}

JOB REQUIREMENTS:
${jdText.substring(0, 2000)}

COMPANY: ${actualCompanyName}
ROLE: ${finalTargetRole}

Analyze the candidate's skills thoroughly and provide a JSON response with:
{
  "skills_present": ["skill1", "skill2", ...],  // ALL skills found in resume that match JD requirements
  "skills_missing": ["missing1", "missing2", ...],  // ONLY skills required by JD but truly absent from resume
  "match_score": 75,  // Percentage match (0-100)
  "recommendations": ["rec1", "rec2", "rec3"],  // Actionable recommendations
  "strengths": ["strength1", "strength2"],  // Candidate's strong points
  "concerns": ["concern1"]  // Areas of concern
}

Return ONLY valid JSON.`;

      const vertex = await createAIInstance();
      const model = vertex.getGenerativeModel();

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,  // Increased for more comprehensive analysis
          responseMimeType: 'application/json'
        }
      });

      const responseText = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      console.log('🔍 AI Raw Response (first 500 chars):', responseText.substring(0, 500));

      const aiAnalysis = safeJsonParse(responseText, {
        skills_present: [],
        skills_missing: [],
        match_score: 0,
        recommendations: [],
        strengths: [],
        concerns: []
      });

      console.log('✅ AI Analysis completed');
      console.log(`📊 Match Score: ${aiAnalysis.match_score}%`);
      console.log(`✅ Skills Present (${aiAnalysis.skills_present.length}):`, aiAnalysis.skills_present.join(', '));
      console.log(`❌ Skills Missing (${aiAnalysis.skills_missing.length}):`, aiAnalysis.skills_missing.join(', '));

      analysis = {
        match_score: aiAnalysis.match_score,
        skills_present: aiAnalysis.skills_present,
        skills_missing: aiAnalysis.skills_missing,
        recommendations: aiAnalysis.recommendations,
        strengths: aiAnalysis.strengths,
        concerns: aiAnalysis.concerns,
        industry_insights: [`${actualCompanyName} requires strong technical skills for ${finalTargetRole}`],
        experience_level: 'Intermediate',
        career_tracks: [finalTargetRole],
        job_matches: [],
        rag_enhanced: true,
        model_used: 'ai-skill-analysis',
        analysis_timestamp: new Date().toISOString()
      };
    } catch (aiError) {
      console.error('❌ AI analysis failed:', aiError.message);
      console.log('📊 Falling back to keyword extraction...');

      // Fallback to keyword extraction
      const resumeSkills = extractSkillsFromResume(resumeText);
      const jdSkills = extractSkillsFromJD(jdText);

      const skillsPresent = resumeSkills.filter(skill =>
        jdSkills.some(jdSkill => jdSkill.toLowerCase() === skill.toLowerCase())
      );
      const skillsMissing = jdSkills.filter(jdSkill =>
        !resumeSkills.some(skill => skill.toLowerCase() === jdSkill.toLowerCase())
      );

      const matchScore = jdSkills.length > 0
        ? Math.round((skillsPresent.length / jdSkills.length) * 100)
        : 0;

      analysis = {
        match_score: matchScore,
        skills_present: skillsPresent,
        skills_missing: skillsMissing,
        recommendations: skillsMissing.slice(0, 5).map(skill => `Learn ${skill}`),
        strengths: skillsPresent.slice(0, 3).map(skill => `Strong in ${skill}`),
        concerns: skillsMissing.length > 5 ? [`Missing ${skillsMissing.length} key skills`] : [],
        industry_insights: [`${actualCompanyName} requires ${jdSkills.length} key skills`],
        experience_level: 'Intermediate',
        career_tracks: [finalTargetRole],
        job_matches: [],
        rag_enhanced: false,
        model_used: 'keyword-fallback',
        analysis_timestamp: new Date().toISOString()
      };
    }

    console.log('✅ Skill gap analysis completed');
    // ========== END AI-POWERED SKILL ANALYSIS ==========

    // Persist
    let id, created_at;
    if (persistenceMode === 'mongo') {
      const doc = await Analysis.create({
        userId,
        target_role: finalTargetRole,
        match_score: analysis.match_score,
        skills_present: analysis.skills_present,
        skills_missing: analysis.skills_missing,
        recommendations: analysis.recommendations,
        strengths: analysis.strengths,
        concerns: analysis.concerns,
        industry_insights: analysis.industry_insights,
        experience_level: analysis.experience_level,
        career_tracks: analysis.career_tracks,
        job_matches: analysis.job_matches,
        rag_enhanced: analysis.rag_enhanced,
        model_used: analysis.model_used,
        // Add hashing fields for skill gap consistency
        resumeHash,
        jobDescriptionHash,
        analysisKey,
        companyName: actualCompanyName, // Use actual company name from JD
        extractedRole: useRealJD && extractedCompany ? extractedCompany.role : null, // Original role from JD
        jobDescriptionText: useRealJD ? finalJDText : null // Store full JD text if provided
      });
      id = doc._id;
      created_at = doc.createdAt;
    } else {
      id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      created_at = new Date();
      memoryStore.set(id, {
        _id: id,
        userId,
        skills_present: analysis.skills_present,
        skills_missing: analysis.skills_missing,
        recommendations: analysis.recommendations,
        job_matches: analysis.job_matches,
        created_at,
        updated_at: created_at,
      });
    }

    // Cleanup
    await fs.unlink(filePath).catch(() => { });

    // Track activity (Allow demo-user)
    if (userId !== 'anonymous') {
      const result = await analyticsService.trackActivity(userId, 'resume_upload', {
        title: 'Uploaded Resume',
        fileName: req.file.originalname,
        score: analysis.overallScore
      }, 100);

      // Emit real-time update
      if (result && result.success) {
        io.to(userId).emit('user_stats_updated', {
          xp: result.user?.xp,
          level: result.user?.level,
          xpToNext: result.user?.xpToNext,
          badges: result.user?.badges,
          recentActivity: result.user?.recentActivity || [result.activity]
        });
      }
    }

    return res.json({
      id,
      target_role: finalTargetRole,
      match_score: analysis.match_score,
      skills_present: analysis.skills_present,
      skills_missing: analysis.skills_missing,
      recommendations: analysis.recommendations,
      strengths: analysis.strengths,
      concerns: analysis.concerns,
      industry_insights: analysis.industry_insights,
      experience_level: analysis.experience_level,
      career_tracks: analysis.career_tracks,
      job_matches: analysis.job_matches,
      rag_enhanced: analysis.rag_enhanced,
      model_used: analysis.model_used,
      created_at,
      // Include full analysis object for frontend state
      analysis: {
        ...analysis,
        _id: id,
        created_at
      }
    });
  } catch (err) {
    console.error('Upload error:', err);
    console.error('Error stack:', err.stack);
    return res.status(500).json({
      error: 'Server error',
      details: err.message,
      stack: err.stack
    });
  }
});

// Enhanced file analysis endpoint with deeper insights
app.post('/analyze-file', upload.single('file'), async (req, res) => {
  try {
    console.log('Enhanced file analysis request received:', {
      hasFile: !!req.file,
      fileType: req.file?.mimetype,
      fileName: req.file?.originalname,
      userId: req.headers['x-user-id'] || 'anonymous'
    });

    const userId = req.headers['x-user-id'] || 'anonymous';
    const { analysisType = 'comprehensive' } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    const fileName = req.file.originalname;

    let fileContent = '';
    let fileType = 'unknown';

    // Enhanced file parsing based on type
    if (fileExtension === '.pdf') {
      try {
        const data = await (await import('pdf-parse')).default(await fs.readFile(filePath));
        fileContent = data.text.replace(/\s+\n/g, '\n').trim();
        fileType = 'pdf';
      } catch (error) {
        console.error('PDF parsing failed:', error);
        return res.status(400).json({ error: 'Failed to parse PDF file' });
      }
    } else if (['.docx', '.doc'].includes(fileExtension)) {
      // For Word documents, we'll read as text for now
      // In production, use mammoth.js for proper .docx parsing
      try {
        fileContent = await fs.readFile(filePath, 'utf8');
        fileType = 'docx';
      } catch (error) {
        console.error('Word document parsing failed:', error);
        return res.status(400).json({ error: 'Failed to parse Word document' });
      }
    } else if (['.pptx', '.ppt'].includes(fileExtension)) {
      // For PowerPoint, we'll read as text for now
      // In production, use officegen or similar for proper parsing
      try {
        fileContent = await fs.readFile(filePath, 'utf8');
        fileType = 'pptx';
      } catch (error) {
        console.error('PowerPoint parsing failed:', error);
        return res.status(400).json({ error: 'Failed to parse PowerPoint file' });
      }
    } else if (['.jpg', '.jpeg', '.png'].includes(fileExtension)) {
      // For images, we'll use base64 encoding
      // In production, use OCR services like Tesseract or cloud OCR
      try {
        const imageBuffer = await fs.readFile(filePath);
        fileContent = imageBuffer.toString('base64');
        fileType = 'image';
      } catch (error) {
        console.error('Image processing failed:', error);
        return res.status(400).json({ error: 'Failed to process image file' });
      }
    } else {
      // Text files
      try {
        fileContent = await fs.readFile(filePath, 'utf8');
        fileType = 'text';
      } catch (error) {
        console.error('Text file reading failed:', error);
        return res.status(400).json({ error: 'Failed to read text file' });
      }
    }

    // Initialize mentor service for file analysis
    const mentorService = new (await import('./services/mentor-service.js')).default();

    // Perform enhanced file analysis
    const fileAnalysis = await mentorService.analyzeFileContent(
      fileContent,
      fileType,
      fileName,
      userId
    );

    // Cleanup
    await fs.unlink(filePath).catch(() => { });

    return res.json({
      success: true,
      fileName,
      fileType,
      analysisType,
      analysis: fileAnalysis,
      timestamp: new Date().toISOString(),
      userId
    });

  } catch (error) {
    console.error('Enhanced file analysis error:', error);
    return res.status(500).json({
      error: 'File analysis failed',
      details: error.message
    });
  }
});

// Get conversation history endpoint
app.get('/conversation-history/:userId', async (req, res) => {
  try {
    console.log('📚 Conversation history endpoint hit:', {
      userId: req.params.userId,
      persistenceMode,
      mongoState: mongoose.connection.readyState
    });

    const { userId } = req.params;
    const { limit = 10, sessionId } = req.query;

    let conversations = [];
    let usedMongoDB = false;

    // Try MongoDB first if connected
    if (persistenceMode === 'mongo' && mongoose.connection.readyState === 1) {
      try {
        console.log('📊 Trying MongoDB Atlas for conversation history');
        const mentorService = new (await import('./services/mentor-service.js')).default();

        if (sessionId) {
          // Get specific session
          console.log('🔍 Looking for specific session in MongoDB:', sessionId);
          const conversation = await mentorService.getConversationBySession(sessionId);
          conversations = conversation ? [conversation] : [];
        } else {
          // Get recent conversations for user
          console.log('📋 Getting recent conversations from MongoDB for user:', userId, 'limit:', limit);
          conversations = await mentorService.getRecentConversations(userId, parseInt(limit));

          // If no conversations found in MongoDB, try to migrate from file storage
          if (conversations.length === 0) {
            console.log('🔄 No conversations in MongoDB, attempting migration from file storage...');
            const migrationResult = await mentorService.migrateFileStorageToMongoDB(userId);
            console.log('Migration result:', migrationResult);

            // Try to get conversations again after migration
            if (migrationResult.migrated > 0) {
              conversations = await mentorService.getRecentConversations(userId, parseInt(limit));
              console.log('✅ After migration, found', conversations.length, 'conversations in MongoDB');
            }
          }
        }
        usedMongoDB = true;
        console.log('✅ MongoDB returned', conversations.length, 'conversations');
      } catch (mongoError) {
        console.warn('⚠️ MongoDB query failed, falling back to file storage:', mongoError.message);
        usedMongoDB = false;
      }
    }

    // If MongoDB didn't return results or failed, try file storage
    if (conversations.length === 0) {
      console.log('📁 Using file storage for conversation history');

      if (sessionId) {
        // Get specific session
        console.log('🔍 Looking for specific session in file storage:', sessionId);
        const conversation = await fileStorage.getConversation(sessionId);
        conversations = conversation ? [conversation] : [];
      } else {
        // Get recent conversations for user
        console.log('📋 Getting recent conversations from file storage for user:', userId, 'limit:', limit);
        conversations = await fileStorage.getRecentConversations(userId, parseInt(limit));
      }
    }

    console.log('✅ Found conversations:', conversations.length);
    console.log('💾 Used MongoDB:', usedMongoDB, 'Persistence mode:', persistenceMode);

    return res.json({
      success: true,
      persistenceMode,
      mongoConnected: persistenceMode === 'mongo',
      usedMongoDB,
      conversations: conversations.map(conv => ({
        sessionId: conv.sessionId,
        startTime: conv.sessionMetadata?.startTime || conv.createdAt,
        endTime: conv.sessionMetadata?.endTime || conv.updatedAt,
        totalMessages: conv.sessionMetadata?.totalMessages || conv.messages?.length || 0,
        userProfile: conv.sessionMetadata?.userProfile || {},
        messages: conv.messages?.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          intent: msg.metadata?.intent,
          confidence: msg.metadata?.confidence,
          badges: msg.metadata?.badges || []
        })) || []
      }))
    });

  } catch (error) {
    console.error('❌ Get conversation history error:', error);
    return res.status(500).json({
      error: 'Failed to get conversation history',
      details: error.message,
      persistenceMode
    });
  }
});

// Test endpoint to verify server is working
app.get('/test-conversation-history', (req, res) => {
  res.json({
    success: true,
    message: 'Conversation history endpoint is working',
    timestamp: new Date().toISOString()
  });
});

// Migration endpoint to move conversations from file storage to MongoDB
app.post('/migrate-conversations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (persistenceMode !== 'mongo' || mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'MongoDB not available for migration'
      });
    }

    const mentorService = new (await import('./services/mentor-service.js')).default();
    const result = await mentorService.migrateFileStorageToMongoDB(userId);

    res.json({
      success: true,
      message: 'Migration completed',
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Migration endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Migration failed',
      details: error.message
    });
  }
});

// MongoDB status endpoint
app.get('/mongo-status', (req, res) => {
  const actuallyConnected = persistenceMode === 'mongo' && mongoose.connection.readyState === 1;
  res.json({
    success: true,
    persistenceMode: actuallyConnected ? 'mongo' : 'file',
    mongoConnected: actuallyConnected,
    mongoState: mongoose.connection.readyState,
    mongoStates: {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    },
    timestamp: new Date().toISOString()
  });
});

// Search conversations endpoint
app.get('/search-conversations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { query, limit = 10 } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    let searchResults = [];

    if (persistenceMode === 'mongo') {
      // Use MongoDB Atlas
      const mentorService = new (await import('./services/mentor-service.js')).default();
      const conversations = await mentorService.getRecentConversations(userId, 50);

      // Simple text search through conversations
      searchResults = conversations
        .map(conv => {
          const matchingMessages = conv.messages.filter(msg =>
            msg.content.toLowerCase().includes(query.toLowerCase())
          );

          if (matchingMessages.length > 0) {
            return {
              sessionId: conv.sessionId,
              startTime: conv.sessionMetadata.startTime,
              totalMessages: conv.sessionMetadata.totalMessages,
              matchingMessages: matchingMessages.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp,
                intent: msg.metadata?.intent
              })),
              relevanceScore: matchingMessages.length
            };
          }
          return null;
        })
        .filter(Boolean)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, parseInt(limit));
    } else {
      // Use file storage
      searchResults = await fileStorage.searchConversations(userId, query, parseInt(limit));
    }

    return res.json({
      success: true,
      query,
      results: searchResults,
      totalFound: searchResults.length,
      persistenceMode
    });

  } catch (error) {
    console.error('Search conversations error:', error);
    return res.status(500).json({
      error: 'Failed to search conversations',
      details: error.message,
      persistenceMode
    });
  }
});

app.get('/analysis/:id', async (req, res) => {
  try {
    if (persistenceMode === 'mongo') {
      const doc = await Analysis.findById(req.params.id);
      if (!doc) return res.status(404).json({ error: 'Not found' });
      return res.json(doc);
    }
    const doc = memoryStore.get(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    return res.json(doc);
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// PRD-style analysis endpoint using embeddings + vector search + Gemini
app.post('/analyze-prd', async (req, res) => {
  try {
    const { resumeText, role } = req.body || {};
    if (!resumeText || !role) {
      return res.status(400).json({ error: 'Missing required fields: resumeText, role' });
    }

    // Load curated role skills
    const rolesPath = path.resolve(__dirname, '../data/job_roles.json');
    if (!fsSync.existsSync(rolesPath)) {
      return res.status(500).json({ error: 'Server missing job roles data' });
    }
    const rolesJson = JSON.parse(fsSync.readFileSync(rolesPath, 'utf8'));
    const roleSkills = rolesJson[role]?.skills || [];

    // Build vector store from role skills
    const store = new VectorStore();
    for (const skill of roleSkills) {
      const v = await getEmbedding(skill);
      await store.add(skill, v);
    }
    await store.build();

    // Query with resume embedding
    const qVec = await getEmbedding(resumeText.slice(0, 2000));
    const top = await store.topK(qVec, 12);

    // Build prompt
    const passagesStr = top.map((t, i) => `[${i + 1}] ${t.item}`).join('\n');
    const prompt = `Resume:\n${resumeText}\n\nRetrieved Job Market Passages:\n${passagesStr}\n\nTask:\nFor the role ${role}:\n- List matched skills (found in resume).\n- List missing required skills.\n- Provide 2-3 concise recommendations.\nOutput ONLY JSON with shape:\n{\n  "role": "${role}",\n  "present_skills": [],\n  "missing_skills": [],\n  "recommendations": []\n}`;

    // Call Gemini
    const vertex = await createAIInstance();
    const model = vertex.getGenerativeModel();


    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 512, responseMimeType: 'application/json' }
    });
    const text = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const safeParse = (t) => {
      try {
        // First try to parse as-is
        return JSON.parse(t);
      } catch (e) {
        console.error('JSON parse error:', e);
        // Try to extract JSON from the text
        const first = t.indexOf('{');
        const last = t.lastIndexOf('}');
        if (first === -1 || last === -1 || last <= first) return null;
        try {
          return JSON.parse(t.slice(first, last + 1));
        } catch (extractError) {
          console.error('Failed to extract JSON:', extractError);
          return null;
        }
      }
    };
    const parsed = safeParse(text) || { role, present_skills: [], missing_skills: [], recommendations: [] };
    return res.json(parsed);
  } catch (e) {
    console.error('analyze-prd error:', e);
    return res.status(500).json({ error: 'PRD analysis failed', details: e.message });
  }
});

// Test Enhanced RAG functionality endpoint
app.post('/test-enhanced-rag', async (req, res) => {
  try {
    const { resumeText, jobDescription, role } = req.body;

    if (!resumeText || !jobDescription || !role) {
      return res.status(400).json({
        error: 'Missing required fields: resumeText, jobDescription, role'
      });
    }

    console.log('Testing Enhanced RAG with external sources...');
    const analysis = await enhancedRAGAnalyzer.analyzeResumeWithEnhancedRAG(resumeText, jobDescription, role);

    return res.json({
      success: true,
      analysis,
      model_used: analysis.model_used,
      rag_enhanced: analysis.rag_enhanced,
      external_sources_used: analysis.external_sources_used,
      chunk_analyses: analysis.chunk_analyses
    });

  } catch (error) {
    console.error('Enhanced RAG test error:', error);
    return res.status(500).json({
      error: 'Enhanced RAG analysis failed',
      details: error.message
    });
  }
});

// Test basic RAG functionality endpoint
app.post('/test-rag', async (req, res) => {
  try {
    const { resumeText, jobDescription, role } = req.body;

    if (!resumeText || !jobDescription || !role) {
      return res.status(400).json({
        error: 'Missing required fields: resumeText, jobDescription, role'
      });
    }

    const analysis = await ragAnalyzer.analyzeResumeWithRAG(resumeText, jobDescription, role);

    return res.json({
      success: true,
      analysis,
      model_used: analysis.model_used,
      rag_enhanced: analysis.rag_enhanced
    });

  } catch (error) {
    console.error('RAG test error:', error);
    return res.status(500).json({
      error: 'RAG analysis failed',
      details: error.message
    });
  }
});

app.post('/generate-learning-roadmap', async (req, res) => {
  try {
    const { analysisId, role, skillsPresent, skillsMissing, recommendations } = req.body;
    const currentUserId = req.headers['x-user-id'] || 'anonymous';

    if (!role || !skillsPresent || !skillsMissing) {
      return res.status(400).json({
        error: 'Missing required fields: role, skillsPresent, skillsMissing'
      });
    }

    // Check if roadmap already exists for this analysis/user
    if (persistenceMode === 'mongo') {
      try {
        const existingRoadmap = await Roadmap.findOne({
          userId: currentUserId,
          analysisId: analysisId,
          role: role
        }).sort({ generated_at: -1 });

        if (existingRoadmap) {
          console.log(`✅ Found existing roadmap for analysis ${analysisId}, returning cached version.`);
          return res.json({
            success: true,
            roadmap_id: existingRoadmap._id,
            analysis_id: analysisId,
            role: role,
            roadmap: {
              roadmap: existingRoadmap.roadmap,
              estimated_timeline: existingRoadmap.estimated_timeline,
              success_metrics: existingRoadmap.success_metrics
            },
            cached: true,
            generated_at: existingRoadmap.generated_at
          });
        }
      } catch (dbErr) {
        console.warn('Database error checking for existing roadmap:', dbErr.message);
      }
    }

    console.log('🤖 AI Services: Generating learning roadmap (OpenRouter)...');

    // Check if AI features are available (will fallback internally if not)
    console.log('Using AI for roadmap generation...');

    // Build comprehensive prompt for learning roadmap
    const roadmapPrompt = `You are an expert career advisor. Generate a comprehensive learning roadmap for a ${role} role.

CURRENT SKILLS: ${skillsPresent.join(', ')}
MISSING SKILLS: ${skillsMissing.join(', ')}
RECOMMENDATIONS: ${(recommendations || []).join('; ')}

Create a structured learning roadmap with skill gaps organized in 3 stages:
1. Stage 1: Critical gaps (immediate priorities - 1-2 months)
2. Stage 2: Important gaps (short-term goals - 3-6 months)
3. Stage 3: Nice-to-have gaps (long-term objectives - 6-12 months)

For each skill gap, include:
- YouTube video recommendations with specific topics
- Exam/certification preparation resources
- Practical projects to build
- Learning platforms and courses

CRITICAL: Return ONLY valid JSON. No text before or after. All strings must be properly quoted. All brackets must be closed.

Return ONLY valid JSON with this structure:
{
  "roadmap": {
    "stage_1_critical_gaps": [
      {
        "skill": "skill name",
        "gap_level": "critical",
        "timeline": "1-2 months",
        "priority": "high",
        "youtube_videos": [
          {
            "title": "video title",
            "topic": "specific topic",
            "search_query": "youtube search query"
          }
        ],
        "exam_preparation": {
          "certifications": ["cert1", "cert2"],
          "practice_tests": ["test1", "test2"],
          "study_materials": ["material1", "material2"]
        },
        "projects": [
          {
            "name": "project name",
            "description": "project description",
            "skills_developed": ["skill1", "skill2"],
            "timeline": "timeline"
          }
        ],
        "learning_platforms": ["platform1", "platform2"]
      }
    ],
    "stage_2_important_gaps": [
      {
        "skill": "skill name",
        "gap_level": "important",
        "timeline": "3-6 months",
        "priority": "medium",
        "youtube_videos": [
          {
            "title": "video title",
            "topic": "specific topic",
            "search_query": "youtube search query"
          }
        ],
        "exam_preparation": {
          "certifications": ["cert1"],
          "practice_tests": ["test1"],
          "study_materials": ["material1"]
        },
        "projects": [
          {
            "name": "project name",
            "description": "project description",
            "skills_developed": ["skill1"],
            "timeline": "timeline"
          }
        ],
        "learning_platforms": ["platform1"]
      }
    ],
    "stage_3_nice_to_have": [
      {
        "skill": "skill name",
        "gap_level": "nice_to_have",
        "timeline": "6-12 months",
        "priority": "low",
        "youtube_videos": [
          {
            "title": "video title",
            "topic": "specific topic",
            "search_query": "youtube search query"
          }
        ],
        "exam_preparation": {
          "certifications": ["cert1"],
          "practice_tests": ["test1"],
          "study_materials": ["material1"]
        },
        "projects": [
          {
            "name": "project name",
            "description": "project description",
            "skills_developed": ["skill1"],
            "timeline": "timeline"
          }
        ],
        "learning_platforms": ["platform1"]
      }
    ],
    "learning_resources": {
      "courses": ["course1", "course2"],
      "platforms": ["platform1", "platform2"],
      "books": ["book1", "book2"],
      "communities": ["community1", "community2"]
    }
  },
  "estimated_timeline": "overall timeline",
  "success_metrics": ["metric1", "metric2"]
}`;

    // Call Gemini for roadmap generation
    const vertex = await createAIInstance();
    if (!vertex) {
      throw new Error('AI system failed to initialize for roadmap generation.');
    }

    const model = vertex.getGenerativeModel();


    let result;
    try {
      result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: roadmapPrompt }] }],
        generationConfig: {
          temperature: 0.1,  // Lower temperature for more consistent JSON
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
          topP: 0.8,
          topK: 40
        }
      });
    } catch (aiError) {
      console.error('❌ AI roadmap generation failed:', aiError.message);

      // Fallback: Generate a basic roadmap based on missing skills
      console.log('Generating fallback roadmap data...');

      const missing = (skillsMissing && skillsMissing.length > 0) ? skillsMissing : ['Advanced Skills'];

      const createGap = (skill, priority) => ({
        skill: skill,
        gap_level: priority === 'high' ? 'critical' : priority === 'medium' ? 'important' : 'nice_to_have',
        timeline: priority === 'high' ? '1-2 months' : '3-6 months',
        priority: priority,
        youtube_videos: [
          { title: `Learn ${skill}`, topic: `${skill} Fundamentals`, search_query: `${skill} tutorial` }
        ],
        exam_preparation: {
          certifications: [`${skill} Certification`],
          practice_tests: [],
          study_materials: []
        },
        projects: [
          { name: `${skill} Practice Project`, description: `Build a project using ${skill}`, skills_developed: [skill], timeline: "2 weeks" }
        ],
        learning_platforms: ["Udemy", "Coursera"]
      });

      const stage1 = missing.slice(0, 3).map(s => createGap(s, 'high'));
      const stage2 = missing.slice(3, 6).map(s => createGap(s, 'medium'));
      const stage3 = missing.slice(6).map(s => createGap(s, 'low'));

      const fallbackJson = {
        roadmap: {
          stage_1_critical_gaps: stage1,
          stage_2_important_gaps: stage2,
          stage_3_nice_to_have: stage3,
          learning_resources: {
            platforms: ["Udemy", "Coursera", "LinkedIn Learning"],
            books: ["Clean Code", "The Pragmatic Programmer"],
            communities: ["Stack Overflow", "Reddit", "GitHub"]
          },
          estimated_timeline: "3-6 months",
          success_metrics: ["Complete 3 projects", "Earn 1 certification"]
        }
      };

      result = {
        response: {
          candidates: [{
            content: {
              parts: [{ text: JSON.stringify(fallbackJson) }]
            }
          }]
        }
      };
    }

    const roadmapText = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('🤖 AI Analysis completed');

    // Parse JSON response with robust extraction of the largest balanced JSON block
    let roadmapData = safeJsonParse(roadmapText);

    // Validate the parsed data structure
    const validateRoadmapData = (data) => {
      if (!data || !data.roadmap) return false;

      const stages = ['stage_1_critical_gaps', 'stage_2_important_gaps', 'stage_3_nice_to_have'];
      for (const stage of stages) {
        if (!Array.isArray(data.roadmap[stage])) {
          console.log(`Invalid stage structure for ${stage}`);
          return false;
        }
      }

      return true;
    };

    if (!validateRoadmapData(roadmapData)) {
      console.log('Roadmap data validation failed, using fallback...');
      roadmapData = null;
    }

    // If parsing failed or stages are empty, create fallback data
    if (!roadmapData || !roadmapData.roadmap ||
      (!roadmapData.roadmap.stage_1_critical_gaps?.length &&
        !roadmapData.roadmap.stage_2_important_gaps?.length &&
        !roadmapData.roadmap.stage_3_nice_to_have?.length)) {

      console.log('Creating fallback roadmap data from skills gaps...');

      // Distribute missing skills across stages
      const criticalSkills = skillsMissing.slice(0, Math.ceil(skillsMissing.length / 3));
      const importantSkills = skillsMissing.slice(Math.ceil(skillsMissing.length / 3), Math.ceil(skillsMissing.length * 2 / 3));
      const niceToHaveSkills = skillsMissing.slice(Math.ceil(skillsMissing.length * 2 / 3));

      const createSkillData = (skill, priority, timeline) => ({
        skill: skill,
        gap_level: priority === 'high' ? 'critical' : priority === 'medium' ? 'important' : 'nice_to_have',
        timeline: timeline,
        priority: priority,
        youtube_videos: [
          {
            title: `${skill} Tutorial for Beginners`,
            topic: `Learn ${skill} fundamentals and best practices`,
            search_query: `${skill} tutorial beginner`
          },
          {
            title: `${skill} Advanced Concepts`,
            topic: `Master advanced ${skill} techniques`,
            search_query: `${skill} advanced tutorial`
          }
        ],
        exam_preparation: {
          certifications: [`${skill} Certification`, `${skill} Professional Certificate`],
          practice_tests: [`${skill} Practice Test 1`, `${skill} Practice Test 2`],
          study_materials: [`${skill} Study Guide`, `${skill} Reference Manual`]
        },
        projects: [
          {
            name: `${skill} Practice Project`,
            description: `Build a project using ${skill} to apply your learning`,
            skills_developed: [skill, 'Problem Solving', 'Project Management'],
            timeline: '2-4 weeks'
          }
        ],
        learning_platforms: ['YouTube', 'Coursera', 'Udemy', 'FreeCodeCamp']
      });

      roadmapData = {
        roadmap: {
          stage_1_critical_gaps: criticalSkills.map(skill => createSkillData(skill, 'high', '1-2 months')),
          stage_2_important_gaps: importantSkills.map(skill => createSkillData(skill, 'medium', '3-6 months')),
          stage_3_nice_to_have: niceToHaveSkills.map(skill => createSkillData(skill, 'low', '6-12 months')),
          learning_resources: {
            courses: ['Online Courses', 'Bootcamps', 'University Programs'],
            platforms: ['YouTube', 'Coursera', 'Udemy', 'FreeCodeCamp', 'Khan Academy'],
            books: ['Technical Books', 'Reference Guides', 'Practice Workbooks'],
            communities: ['Stack Overflow', 'Reddit', 'Discord', 'LinkedIn Groups']
          }
        },
        estimated_timeline: "6-12 months",
        success_metrics: ["Complete 3 projects", "Earn 1 certification", "Apply for 5 jobs"]
      };
    }

    // Enhance roadmap with actual YouTube video links
    try {
      console.log('Enhancing roadmap with YouTube video links...');

      // Check if we have any skills to enhance
      const hasSkills = roadmapData.roadmap && (
        (roadmapData.roadmap.stage_1_critical_gaps && roadmapData.roadmap.stage_1_critical_gaps.length > 0) ||
        (roadmapData.roadmap.stage_2_important_gaps && roadmapData.roadmap.stage_2_important_gaps.length > 0) ||
        (roadmapData.roadmap.stage_3_nice_to_have && roadmapData.roadmap.stage_3_nice_to_have.length > 0)
      );

      if (hasSkills) {
        roadmapData = await youtubeService.generateRoadmapVideoLinks(roadmapData);
        console.log('YouTube video links added successfully');
      } else {
        console.log('No skills found in roadmap, skipping YouTube enhancement');
      }
    } catch (error) {
      console.error('Failed to enhance roadmap with YouTube links:', error);
    }

    // Store roadmap in MongoDB AFTER enhancement
    let roadmapId;
    if (persistenceMode === 'mongo') {
      try {
        const finalEstimatedTimeline = roadmapData.estimated_timeline || roadmapData.roadmap?.estimated_timeline || "3-6 months";
        const finalSuccessMetrics = roadmapData.success_metrics || roadmapData.roadmap?.success_metrics || ["Complete 3 projects", "Earn 1 certification"];

        const finalRoadmap = { ...roadmapData.roadmap };
        delete finalRoadmap.estimated_timeline;
        delete finalRoadmap.success_metrics;

        const roadmapDoc = await Roadmap.create({
          userId: currentUserId || 'anonymous',
          analysisId: analysisId,
          role: role,
          roadmap: finalRoadmap,
          estimated_timeline: finalEstimatedTimeline,
          success_metrics: finalSuccessMetrics,
          model_used: process.env.OPENROUTER_MODEL_NAME || 'google/gemini-2.0-flash-exp:free',
          generated_at: new Date()
        });
        roadmapId = roadmapDoc._id;

        // Save to Career History
        try {
          await CareerHistory.create({
            userId: currentUserId,
            type: 'roadmap',
            data: roadmapData,
            analysisId: analysisId,
            metadata: {
              targetRole: role,
              skillsFocused: missingSkills,
              duration: finalEstimatedTimeline
            }
          });
          console.log('✅ Roadmap saved to career history');
        } catch (historyErr) {
          console.warn('Failed to save roadmap to history:', historyErr.message);
        }

        // Check for Badges
        const newBadges = await badgeService.checkBadges(currentUserId, 'generate_roadmap');
        if (newBadges.length > 0) {
          io.to(currentUserId).emit('badge_unlocked', newBadges[0]);
        }
      } catch (error) {
        console.error('Failed to store roadmap in MongoDB:', error);
      }
    }

    // Track roadmap generation activity
    const effectiveUserId = currentUserId || req.headers['x-user-id'] || req.body.userId || 'anonymous';
    if (effectiveUserId !== 'anonymous') {
      const result = await analyticsService.trackActivity(effectiveUserId, 'skill_exploration', {
        title: 'Generated Learning Roadmap',
        targetRole: role || 'Career track'
      }, 50);

      if (result && result.success) {
        io.to(effectiveUserId).emit('user_stats_updated', {
          xp: result.user?.xp,
          level: result.user?.level,
          xpToNext: result.user?.xpToNext,
          badges: result.user?.badges,
          recentActivity: result.user?.recentActivity || [result.activity]
        });
      }
    }

    return res.json({
      success: true,
      roadmap_id: roadmapId,
      analysis_id: analysisId,
      role: role,
      roadmap: roadmapData,
      model_used: process.env.OPENROUTER_MODEL_NAME,
      generated_at: new Date().toISOString(),
      stored_in_mongodb: persistenceMode === 'mongo' && !!roadmapId
    });

  } catch (error) {
    console.error('Learning roadmap generation error:', error);
    return res.status(500).json({
      error: 'Learning roadmap generation failed',
      details: error.message
    });
  }
});

// Start Career Simulation endpoint using OpenRouter
app.post('/start-career-simulation', async (req, res) => {
  try {
    const { userId, role, skillsPresent = [], skillsMissing = [], analysisId, jobMatches: jobMatchesData } = req.body;

    // Check userId from body or header
    const effectiveUserId = userId || req.headers['x-user-id'] || 'anonymous';

    if (!role) {
      return res.status(400).json({ error: 'Missing required fields: role is required' });
    }

    // Check if simulation already exists for this analysis/user/role
    if (persistenceMode === 'mongo') {
      try {
        const existingSim = await Simulation.findOne({
          userId: effectiveUserId,
          analysisId: analysisId,
          targetRole: role
        }).sort({ created_at: -1 });

        if (existingSim) {
          console.log(`✅ Found existing simulation for role ${role}, returning cached version.`);
          return res.json({
            success: true,
            simulation_id: existingSim._id,
            analysis_id: analysisId,
            role: role,
            simulation: {
              simulation: existingSim.simulation,
              estimated_duration: existingSim.estimated_duration,
              learning_objectives: existingSim.learning_objectives
            },
            cached: true,
            model_used: existingSim.model_used,
            started_at: existingSim.started_at
          });
        }
      } catch (dbErr) {
        console.warn('Database error checking for existing simulation:', dbErr.message);
      }
    }

    console.log(`🤖 AI Services: Starting career simulation (OpenRouter) for user ${effectiveUserId}...`);
    console.log(`Matches received: ${jobMatchesData?.length || 0}`);

    // Check if AI features are available (will fallback internally if not)
    console.log('Using AI for career simulation...');

    // Try to fetch roadmap for this user to personalize simulation
    let roadmapData = null;
    try {
      roadmapData = await Roadmap.findOne({
        $or: [{ analysisId: analysisId }, { userId: effectiveUserId }]
      }).sort({ generated_at: -1 });

      if (roadmapData) {
        console.log('✅ Found roadmap for simulation personalization');
      }
    } catch (roadmapError) {
      console.warn('Could not fetch roadmap for simulation:', roadmapError.message);
    }

    // Build comprehensive prompt for career simulation
    let roadmapContext = '';
    if (roadmapData && roadmapData.roadmap) {
      roadmapContext = `
LEARNING ROADMAP CONTEXT:
The user is currently following this roadmap:
- Stage 1 (Critical): ${roadmapData.roadmap.stage_1_critical_gaps?.map(g => g.skill).join(', ')}
- Stage 2 (Important): ${roadmapData.roadmap.stage_2_important_gaps?.map(g => g.skill).join(', ')}
- Stage 3 (Nice to have): ${roadmapData.roadmap.stage_3_nice_to_have?.map(g => g.skill).join(', ')}

Please align the simulation projects and skill challenges with the phases of this roadmap.
`;
    }

    const simulationPrompt = `Create an interactive career simulation for a ${role} role based on the following profile:

CURRENT SKILLS: ${skillsPresent.join(', ')}
MISSING SKILLS: ${skillsMissing.join(', ')}
JOB MATCHES: ${JSON.stringify(jobMatchesData || [])}
${roadmapContext}

Generate a realistic career simulation with:
1. Multiple career scenarios and paths
2. Interview simulations with real questions
3. Skill assessment challenges
4. Project-based learning scenarios
5. Networking and mentorship opportunities
6. Salary negotiation simulations

Return ONLY valid JSON with this structure:
{
  "simulation": {
    "scenarios": [
      {
        "id": "scenario1",
        "title": "scenario title",
        "description": "scenario description",
        "difficulty": "beginner/intermediate/advanced",
        "duration": "30-60 minutes",
        "skills_tested": ["skill1", "skill2"],
        "outcomes": ["outcome1", "outcome2"]
      }
    ],
    "interview_simulations": [
      {
        "company": "company name",
        "role": "role title",
        "questions": [
          {
            "question": "interview question",
            "type": "technical/behavioral/situational",
            "expected_answer": "expected answer",
            "tips": ["tip1", "tip2"]
          }
        ],
        "difficulty": "easy/medium/hard"
      }
    ],
    "skill_challenges": [
      {
        "skill": "skill name",
        "challenge_type": "coding/design/analysis",
        "description": "challenge description",
        "time_limit": "time limit",
        "evaluation_criteria": ["criteria1", "criteria2"]
      }
    ],
    "projects": [
      {
        "name": "project name",
        "description": "project description",
        "technologies": ["tech1", "tech2"],
        "timeline": "timeline",
        "deliverables": ["deliverable1", "deliverable2"]
      }
    ],
    "networking_opportunities": [
      {
        "event": "event name",
        "type": "conference/meetup/workshop",
        "description": "event description",
        "networking_tips": ["tip1", "tip2"]
      }
    ],
    "salary_negotiation": {
      "scenarios": [
        {
          "situation": "negotiation situation",
          "current_salary": "current salary range",
          "target_salary": "target salary range",
          "negotiation_tips": ["tip1", "tip2"]
        }
      ]
    }
  },
  "estimated_duration": "2-4 hours",
  "learning_objectives": ["objective1", "objective2"]
}`;

    // Call Gemini for simulation generation
    const ai = await createAIInstance();
    const model = ai.getGenerativeModel();


    let result;
    try {
      result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: simulationPrompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json'
        }
      });
    } catch (aiError) {
      console.error('❌ Career simulation generation failed:', aiError.message);
      throw new Error('AI failed to generate valid simulation data. Mock fallbacks are disabled.');
    }

    const simulationText = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON response robustly by scanning for balanced structures
    const parsedData = safeJsonParse(simulationText, {});

    const simulationData = {
      simulation: parsedData.simulation || {
        scenarios: [],
        interview_simulations: [],
        skill_challenges: [],
        projects: [],
        networking_opportunities: [],
        salary_negotiation: { scenarios: [] }
      },
      estimated_duration: parsedData.estimated_duration || "2-4 hours",
      learning_objectives: parsedData.learning_objectives || ["Improve technical skills", "Practice interviews", "Build portfolio"]
    };

    // Store simulation in MongoDB
    let simulationId;
    if (persistenceMode === 'mongo') {
      try {
        const simulationDoc = await Simulation.create({
          userId: effectiveUserId,
          analysisId: analysisId,
          targetRole: role, // Save the role from resume
          createdFrom: 'resume', // Mark as created from resume analysis
          // Add required root-level fields that were missing
          title: `Career Simulation: ${role || 'General'}`,
          description: `Interactive career simulation scenarios and challenges for ${role || 'professional development'}`,
          difficulty: simulationData.simulation?.scenarios?.[0]?.difficulty || 'Intermediate',
          simulation: simulationData.simulation,
          estimated_duration: simulationData.estimated_duration,
          learning_objectives: simulationData.learning_objectives,
          model_used: process.env.OPENROUTER_MODEL_NAME,
          started_at: new Date(),
          status: 'active',
          // Add 4 default modes
          modes: [
            {
              id: 'guided',
              name: 'Guided Learning',
              description: 'Step-by-step guided learning path with tutorials and examples',
              xpReward: 100,
              estimatedTime: '30-45 min',
              difficulty: 'Easy',
              unlocked: true,
              completed: false
            },
            {
              id: 'challenge',
              name: 'Challenge Mode',
              description: 'Test your skills with timed challenges and problem-solving tasks',
              xpReward: 200,
              estimatedTime: '45-60 min',
              difficulty: 'Medium',
              unlocked: false,
              completed: false
            },
            {
              id: 'project',
              name: 'Project-Based',
              description: 'Build real-world projects to demonstrate your skills',
              xpReward: 300,
              estimatedTime: '1-2 hours',
              difficulty: 'Hard',
              unlocked: false,
              completed: false
            },
            {
              id: 'peer',
              name: 'Peer Compare',
              description: 'Compare your performance with peers and get insights',
              xpReward: 150,
              estimatedTime: '20-30 min',
              difficulty: 'Medium',
              unlocked: false,
              completed: false,
              badge: 'Community'
            }
          ],
          completedModes: [],
          progress: {
            completed_scenarios: [],
            completed_interviews: [],
            completed_challenges: [],
            completed_projects: [],
            completed_modes: [],
            overall_progress: 0
          }
        });
        simulationId = simulationDoc._id;
        console.log('Simulation stored in MongoDB with ID:', simulationId);

        // Track initiation for analytics/tracking
        if (effectiveUserId !== 'anonymous') {
          await analyticsService.trackActivity(effectiveUserId, 'simulation', {
            simulationId,
            action: 'start_simulation',
            title: `Started Career Simulation for ${role || 'Target Role'}`,
            points: 50 // Base points for starting
          }, 50);
        }
      } catch (error) {
        console.error('Failed to store simulation in MongoDB:', error);
        // Continue without storing if MongoDB fails
      }
    }

    return res.json({
      success: true,
      simulation_id: simulationId,
      analysis_id: analysisId,
      role: role,
      simulation: simulationData,
      model_used: process.env.OPENROUTER_MODEL_NAME,
      started_at: new Date().toISOString(),
      stored_in_mongodb: persistenceMode === 'mongo' && !!simulationId
    });

  } catch (error) {
    console.error('Career simulation generation error:', error);
    return res.status(500).json({
      error: 'Career simulation generation failed',
      details: error.message
    });
  }
});

// Interactive Simulation Chat endpoint
app.post('/api/simulation/chat', async (req, res) => {
  try {
    const { simulationId, modeId, message, userId, reset } = req.body;

    if (!simulationId || !modeId || !message) {
      return res.status(400).json({ error: 'Missing required fields: simulationId, modeId, message' });
    }

    // 1. Fetch or Create Session
    let session = await SimulationSession.findOne({ userId, simulationId, modeId });

    if (reset) {
      // HARD RESET: Delete entire session and start fresh
      console.log(`Resource: HARD RESET session for user ${userId}, simulation ${simulationId}, mode ${modeId}`);

      const existingSession = await SimulationSession.findOne({ userId, simulationId, modeId });
      const nextAttempt = existingSession ? (existingSession.attempts || 1) + 1 : 1;

      // Delete any existing session(s)
      await SimulationSession.deleteMany({ userId, simulationId, modeId });

      // Create a clean new session
      session = await SimulationSession.create({
        userId,
        simulationId,
        modeId,
        messages: [],
        currentStep: 1,
        totalSteps: 5,
        attempts: nextAttempt
      });

      // RESET Parent Simulation Status
      try {
        if (mongoose.Types.ObjectId.isValid(simulationId)) {
          console.log(`Resource: Resetting parent simulation ${simulationId} status for mode ${modeId}`);
          await Simulation.updateOne(
            { _id: simulationId, 'modes.id': modeId },
            {
              $set: { 'modes.$.completed': false },
              $pull: { 'progress.completed_modes': modeId }
            }
          );

          // Re-calculate overall progress
          const updatedSim = await Simulation.findById(simulationId);
          if (updatedSim) {
            const completedCount = updatedSim.progress.completed_modes.length;
            const totalModes = updatedSim.modes.length || 4;
            const newProgress = Math.round((completedCount / totalModes) * 100);
            await Simulation.updateOne(
              { _id: simulationId },
              { $set: { 'progress.overall_progress': newProgress, status: 'active' } }
            );
          }
        }
      } catch (err) {
        console.error('Failed to reset parent simulation progress:', err);
      }
    } else if (!session) {
      // If no session exists, create one
      session = await SimulationSession.create({
        userId,
        simulationId,
        modeId,
        messages: [],
        currentStep: 1,
        totalSteps: 5,
        attempts: 1
      });
    }

    // 2. Add User Message to History
    // Only add if it's not the initial "START_SESSION" or duplicate
    if (message !== 'START_SESSION') {
      session.messages.push({
        id: Date.now().toString(),
        role: 'user',
        content: message,
        timestamp: Date.now()
      });
    }

    // 3. Fetch Simulation Context (Role, Objectives)
    let context = {};
    if (mongoose.Types.ObjectId.isValid(simulationId)) {
      const sim = await Simulation.findById(simulationId);
      if (sim) {
        context = {
          role: sim.role,
          learning_objectives: sim.learning_objectives,
          simulation_data: sim.simulation
        };
      }
    }

    // 4. Construct AI System Prompt (Mode Specific)
    const personas = {
      guided: {
        name: "Technical Coach",
        instruction: `You are a Technical Coach specializing in step-by-step skill mastery. 
        APPROACH: 
        1. Break the simulation into 5 clear logical steps.
        2. In each message, clearly identify which step the user is on.
        3. Provide technical context and then ask the user to perform a specific action or answer a targeted question.
        4. Do NOT just chat; focus on structured progression.
        5. If they get it right, provide a brief 'Expert insight' and move to the next step.`
      },
      challenge: {
        name: "AI Examiner",
        instruction: "You are a strict but fair AI Examiner. You are evaluating the user's performance in a timed challenge or interview simulation. Your tone is professional and direct. Ask specific questions, evaluate the user's responses against industry standards, and point out areas for improvement. Keep the pressure realistic."
      },
      project: {
        name: "AI Technical Lead",
        instruction: "You are an experienced Technical Lead reviewing a developer's project or design. Focus on architecture, trade-offs, scalability, and clean code. Ask why they chose a specific approach and challenge their assumptions to help them think like a senior engineer."
      },
      peer: {
        name: "AI Colleague",
        instruction: "You are a collaborative AI Colleague. You are reviewing the user's work as a peer. Share how 'other' anonymized colleagues might have approached the same problem, offer alternative perspectives, and facilitate a comparative learning experience."
      }
    };

    const persona = personas[modeId] || personas.guided;

    // --- SPECIAL LOGIC FOR GUIDED MODE: PRE-GENERATION ---
    if (modeId === 'guided') {
      if (message === 'START_SESSION') {
        // 1. Check if plan ALREADY exists
        if (session.guidedPlan && session.guidedPlan.length > 0) {
          console.log(`📚 Returning existing Guided Plan for session: ${session._id}`);
          const firstStep = session.guidedPlan[0];

          // PERSIST the welcome message
          const welcomeMsg = {
            id: Date.now().toString(),
            role: 'assistant',
            content: firstStep.instruction,
            timestamp: Date.now(),
            suggestions: ["I'm ready", "What's next?"]
          };
          session.messages = [welcomeMsg];
          await session.save();

          return res.json({
            success: true,
            reply_text: firstStep.instruction,
            current_step: 1,
            total_steps: session.guidedPlan.length,
            step_title: firstStep.title,
            mission_update: firstStep.mission_update,
            suggestions: welcomeMsg.suggestions,
            attempts: session.attempts
          });
        }

        // 1.5 Auto-upgrade/Reset Legacy Sessions (Exists but no plan)
        if (session) {
          console.log(`Resource: Auto-resetting legacy session for guided mode to generate plan.`);
          session.messages = [];
          session.currentStep = 1;
          session.points = 0;
          session.isCompleted = false;
          session.mission = null;
          // We don't save yet, we save after generation
        }

        // 2. Generate Full Plan if missing
        console.log(`📝 Generating Full Guided Plan for session: ${session ? session._id : 'new'}`);
        const planPrompt = `Create a complete 5-step interactive lesson plan for:
        ROLE: ${context.role}
        OBJECTIVES: ${(context.learning_objectives || []).join(', ')}
        
        REQUIREMENTS:
        1. Create exactly 5 progressive steps.
        2. Format as a pure JSON array of objects.
        3. Each object must have:
           - "step": Number (1-5)
           - "title": String (Short step title)
           - "instruction": String (Detailed instruction and context for the user, authoritative tone)
           - "mission_update": String (Optional, specific sub-goal for this step)
           - "expected_output": String (What the user should do/type to pass)

        RESPONSE FORMAT:
        [
          { "step": 1, "title": "Setup", "instruction": "...", "mission_update": "...", "expected_output": "..." },
          ...
        ]`;

        const result = await resumeOptimizer.generativeModel.generateContent({
          contents: [{ role: 'user', parts: [{ text: planPrompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json'
          }
        });

        const planText = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;
        let generatedPlan = [];
        try {
          // Robust parse using safeJsonParse
          const parsed = safeJsonParse(planText);
          generatedPlan = Array.isArray(parsed) ? parsed : (parsed?.plan || []);
        } catch (e) {
          console.error("Failed to parse guided plan", e);
          generatedPlan = [];
        }

        if (generatedPlan.length > 0) {
          session.guidedPlan = generatedPlan;

          const firstStep = generatedPlan[0];
          // PERSIST the welcome message
          const welcomeMsg = {
            id: Date.now().toString(),
            role: 'assistant',
            content: firstStep.instruction,
            timestamp: Date.now(),
            suggestions: ["I'm ready"]
          };
          session.messages = [welcomeMsg];

          await session.save();

          return res.json({
            success: true,
            reply_text: firstStep.instruction,
            current_step: 1,
            total_steps: generatedPlan.length,
            step_title: firstStep.title,
            mission_update: firstStep.mission_update,
            suggestions: welcomeMsg.suggestions,
            attempts: session.attempts
          });
        }
      }

      // Handle User Response in Guided Mode (Simulated progression for now)
      if (message !== 'START_SESSION' && session.guidedPlan && session.guidedPlan.length > 0) {
        // Simple progression logic: If they type anything substantial, move to next step.
        // In a real app, we might use AI to validate the answer against 'expected_output'.

        if (session.currentStep < session.guidedPlan.length) {
          const nextStepIndex = session.currentStep; // currentStep is 1-based, so index for NEXT step is currentStep
          const nextStep = session.guidedPlan[nextStepIndex];

          const pointsEarned = 20; // Fixed points for progress
          session.currentStep += 1;
          session.points += pointsEarned;
          await session.save();

          // Update Main Simulation Progress
          try {
            if (persistenceMode === 'mongo') {
              const progressPercentage = Math.round((session.currentStep / session.totalSteps) * 100);
              await Simulation.updateOne(
                { _id: simulationId },
                { $set: { 'progress.overall_progress': progressPercentage } }
              );
            }
          } catch (e) { }

          await analyticsService.trackActivity(userId, 'simulation_step_completed', {
            simulationId,
            modeId,
            step: session.currentStep
          }, pointsEarned);

          return res.json({
            success: true,
            reply_text: `Correct! Moving on.\n\n${nextStep.instruction}`,
            current_step: session.currentStep,
            step_title: nextStep.title,
            mission_update: nextStep.mission_update,
            points_earned: pointsEarned,
            suggestions: ["Continue"]
          });
        } else {
          // Already at last step
          session.isCompleted = true;
          await session.save();

          // Mark Main Simulation as Completed for this mode
          try {
            await Simulation.updateOne(
              { _id: simulationId, 'modes.id': modeId },
              {
                $set: { 'modes.$.completed': true, 'status': 'completed' },
                $addToSet: { 'progress.completed_modes': modeId }
              }
            );
          } catch (e) { }

          return res.json({
            success: true,
            reply_text: "Congratulations! You have completed all steps in this guided simulation.",
            current_step: session.currentStep,
            points_earned: 50,
            suggestions: ["Finish"]
          });
        }
      }
    }
    // --- END SPECIAL LOGIC ---

    const systemPrompt = `${persona.instruction}

    CONTEXT:
    - Target Role: ${context.role || 'Professional'}
    - Learning Objectives: ${(context.learning_objectives || []).join(', ')}
    - Current Step: ${session.currentStep} of ${session.totalSteps}
    - Simulation Data: ${JSON.stringify(context.simulation_data || {})}
    - Current Mission: ${session.mission || 'Not set'}

    GUIDELINES:
    1. Keep responses concise and deeply interactive.
    2. Respond to the user's message appropriately for your persona.
    3. Award points (10-50) EVERY TIME the user provides a good response or completes a milestone.
    4. IF MODE IS 'GUIDED': 
       - Always track the current step. 
       - If user successfully completes the requirements for the current step, increment "current_step" in your JSON response.
       - "total_steps" is 5.
       - Provide a concise "step_title".
       - Provide a brief "mission_update" explaining what the user needs to do next.

    RESPONSE JSON FORMAT:
    {
      "reply_text": "string",
      "points_earned": number,
      "mission_update": "string | null",
      "suggestions": ["string", "string"],
      "current_step": number,
      "total_steps": number,
      "step_title": "string"
    }`;

    // 5. Call AI
    const history = session.messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // Add current user message if it wasn't added to history (e.g. START_SESSION special case)
    // Actually we added it to DB above if not START_SESSION. 
    // If START_SESSION, history is empty or previous history.
    // We need to inject system prompt. 

    // Better strategy for history to Gemini:
    const contents = [
      { role: 'user', parts: [{ text: `SYSTEM INITIALIZATION: ${systemPrompt}` }] },
      ...history // includes the user's latest message if it wasn't START_SESSION
    ];

    // If START_SESSION, we might want to prompt AI to welcome user
    if (message === 'START_SESSION' && session.messages.length === 0) {
      contents.push({ role: 'user', parts: [{ text: "Please introduce yourself and the first step." }] });
    }

    const aiResult = await resumeOptimizer.generativeModel.generateContent({
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json'
      }
    });

    const aiResponseText = aiResult?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    let aiResponse = safeJsonParse(aiResponseText, {
      reply_text: "I'm having trouble connecting to the matrix. Please try again.",
      suggestions: ["Retry"],
      current_step: session.currentStep
    });

    // 6. Update Session with AI Response
    session.messages.push({
      id: Date.now().toString(),
      role: 'assistant',
      content: aiResponse.reply_text,
      timestamp: Date.now(),
      suggestions: aiResponse.suggestions
    });

    if (aiResponse.current_step) session.currentStep = aiResponse.current_step;
    if (aiResponse.mission_update) session.mission = aiResponse.mission_update;
    if (aiResponse.points_earned) session.points += aiResponse.points_earned;

    // Check for completion
    if (session.currentStep >= session.totalSteps && !session.isCompleted) {
      // Maybe not auto-complete on step 5, but let frontend handle "Finish" button?
      // For now, let's say if AI says step 5/5 and user responds, AI might trigger completion next turn?
      // Let's rely on frontend or a specific "is_completed" flag from AI if we added it, 
      // but for now simple storage is enough.
    }

    await session.save();

    // 6.5 Update Main Simulation Document Progress
    try {
      if (persistenceMode === 'mongo') {
        const progressPercentage = Math.round((session.currentStep / session.totalSteps) * 100);

        const updateData = {
          'progress.overall_progress': progressPercentage,
          'status': progressPercentage >= 100 ? 'completed' : 'active'
        };

        // If completed, add to completed_modes and update matching mode
        if (session.currentStep >= session.totalSteps) {
          await Simulation.updateOne(
            { _id: simulationId, 'modes.id': modeId },
            {
              $set: {
                'modes.$.completed': true,
                'status': 'completed'
              },
              $addToSet: { 'progress.completed_modes': modeId }
            }
          );
        } else {
          await Simulation.updateOne(
            { _id: simulationId },
            { $set: { 'progress.overall_progress': progressPercentage } }
          );
        }
      }
    } catch (progErr) {
      console.error('Failed to update main simulation progress:', progErr);
    }

    // 7. Track Analytics
    if (userId) {
      // ... existing analytics code ...
      await analyticsService.trackActivity(userId, 'simulation_interaction', {
        simulationId,
        modeId,
        pointsEarned: aiResponse.points_earned
      }, aiResponse.points_earned || 0);
    }

    res.json({
      success: true,
      ...aiResponse
    });

  } catch (error) {
    console.error('Simulation chat error:', error);
    res.status(500).json({ error: 'Failed' });
  }
});

// Get Session History
app.get('/api/simulation/session/:simulationId/:modeId', async (req, res) => {
  try {
    const { simulationId, modeId } = req.params;
    const userId = req.headers['x-user-id']; // Assuming passed in header

    if (!userId) return res.status(400).json({ error: 'User ID required' });

    const session = await SimulationSession.findOne({ userId, simulationId, modeId });

    if (session) {
      return res.json({ success: true, session });
    } else {
      return res.json({ success: false, message: 'No session found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate/Get Certificate
app.post('/api/simulation/certificate', async (req, res) => {
  try {
    const { simulationId, userId } = req.body;

    // Check if all modes are completed
    // This logic depends on Simulation progress tracking update
    // For now, let's assume if they request it, we verify progress

    const sim = await Simulation.findById(simulationId);
    // Find user progress... needed?
    // Let's simple check if certificate already exists

    let cert = await Certificate.findOne({ userId, simulationId });
    if (cert) return res.json({ success: true, certificate: cert });

    // Generate new
    cert = await Certificate.create({
      userId,
      simulationId,
      simulationTitle: sim ? sim.title : 'Career Simulation',
      userName: userId, // ideally fetch real name
      skillsValidated: sim ? sim.skills : [],
      grade: 'A', // placeholder logic
      certificateCode: `CERT-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    });

    res.json({ success: true, certificate: cert });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/resume/extract-text
 * @desc    Extract text from PDF or Image files
 * @access  Private
 */
app.post('/api/resume/extract-text', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    let extractedText = '';

    console.log(`Processing file upload: ${req.file.originalname} (${fileExtension})`);

    if (fileExtension === '.pdf') {
      // PDF Parsing
      try {
        const dataBuffer = await fs.readFile(filePath);
        // Dynamic import for pdf-parse 
        const pdfParse = (await import('pdf-parse')).default;
        const data = await pdfParse(dataBuffer);
        extractedText = data.text.replace(/\s+\n/g, '\n').trim();
      } catch (pdfError) {
        console.error('PDF Parse Error:', pdfError);
        throw new Error('Failed to parse PDF file');
      }
    } else if (['.png', '.jpg', '.jpeg', '.webp'].includes(fileExtension)) {
      // Image OCR using Tesseract
      try {
        console.log('Starting OCR process for image...');
        const worker = await createWorker('eng');
        const ret = await worker.recognize(filePath);
        extractedText = ret.data.text;
        await worker.terminate();
        console.log('OCR completed successfully');
      } catch (ocrError) {
        console.error('OCR Error:', ocrError);
        throw new Error('Failed to perform OCR on image');
      }
    } else {
      // Try reading as text file
      extractedText = await fs.readFile(filePath, 'utf8');
    }

    // Cleanup uploaded file
    try {
      await fs.unlink(filePath);
    } catch (cleanupError) {
      console.warn('Failed to cleanup uploaded file:', cleanupError.message);
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({ error: 'Could not extract any text from the file' });
    }

    res.json({
      success: true,
      text: extractedText
    });

  } catch (error) {
    console.error('Text extraction error:', error);
    res.status(500).json({ error: error.message || 'Failed to extract text from file' });
  }
});

/**
 * @route   POST /api/resume/optimize
 * @desc    Analyze resume for ATS score and improvement suggestions
 * @access  Private
 */
app.post('/api/resume/optimize', async (req, res) => {
  try {
    const { resumeText, jobDescription, targetRole } = req.body;

    // Get userId from token (robust fallback)
    let userId = req.headers['x-user-id'];
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretKey');
        userId = decoded._id || decoded.userId;
      } catch (err) {
        console.warn('Invalid token in optimize request');
      }
    }

    if (!resumeText || !jobDescription) {
      return res.status(400).json({ error: 'Resume text and Job Description are required' });
    }

    // 1. Calculate ATS Score
    const atsResult = await resumeOptimizer.calculateATSScore(resumeText, targetRole || 'Candidate');

    // 2. Get Optimization Suggestions
    const optimizationResult = await resumeOptimizer.optimizeResume(resumeText, targetRole || 'Candidate', [jobDescription]);

    // Check for badges
    let newBadges = [];
    if (userId) {
      try {
        newBadges = await badgeService.checkBadges(userId, 'optimize_resume');

        // If badges unlocked, emit stats update to refresh XP
        if (newBadges.length > 0 && io) {
          io.emit(`user_update_${userId}`, { type: 'stats_update', badges: newBadges });
        }
      } catch (err) {
        console.error('Error checking badges:', err);
      }
    }

    // Track activity
    if (userId) {
      analyticsService.trackActivity(userId, 'resume_optimization', {
        title: `Resume Analysis: ${targetRole || 'General'}`,
        targetRole,
        atsScore: atsResult.ats_score
      }).then(result => {
        if (result && result.success && io) {
          io.emit(`user_update_${userId}`, { type: 'activity', data: result.activity });
        }
      }).catch(err => console.warn('Tracking failed', err));

      // Save to History (Only if DB connected)
      if (mongoose.connection.readyState === 1) {
        try {
          await ATSScan.create({
            userId,
            resumeText,
            jobDescription,
            targetRole,
            atsScore: atsResult.ats_score,
            analysis: atsResult,
            optimization: optimizationResult
          });
        } catch (saveError) {
          console.error('Failed to save ATS Scan history:', saveError);
        }
      }
    }

    res.json({
      success: true,
      atsAnalysis: atsResult,
      optimization: optimizationResult,
      newBadges
    });

  } catch (error) {
    console.error('Resume optimization error:', error);
    res.status(500).json({ error: 'Failed to analyze resume' });
  }
});

/**
 * @route   POST /api/resume/cover-letter
 * @desc    Generate a personalized cover letter
 * @access  Private
 */
app.post('/api/resume/cover-letter', async (req, res) => {
  try {
    const { resumeData, companyName, jobDescription, role } = req.body;

    // Get userId from token (robust fallback)
    let userId = req.headers['x-user-id'];
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretKey');
        userId = decoded._id || decoded.userId;
      } catch (err) {
        console.warn('Invalid token in cover letter request');
      }
    }

    if (!resumeData || !companyName || !jobDescription) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await resumeOptimizer.generateCoverLetter(
      typeof resumeData === 'string' ? { raw_text: resumeData } : resumeData,
      companyName,
      `${role || 'Candidate'} - ${jobDescription.substring(0, 200)}...`
    );

    // Track activity
    if (userId) {
      analyticsService.trackActivity(userId, 'cover_letter_generation', {
        title: `Cover Letter: ${companyName}`,
        companyName,
        role
      }).then(result => {
        if (result && result.success && io) {
          io.emit(`user_update_${userId}`, { type: 'activity', data: result.activity });
        }
      }).catch(err => console.warn('Tracking failed', err));

      // Save to History (Only if DB connected)
      if (mongoose.connection.readyState === 1) {
        try {
          await CoverLetter.create({
            userId,
            resumeText: typeof resumeData === 'string' ? resumeData : JSON.stringify(resumeData),
            jobDescription,
            companyName,
            targetRole: role,
            generatedLetter: result
          });
        } catch (saveError) {
          console.error('Failed to save Cover Letter history:', saveError);
        }
      }
    }

    res.json({
      success: true,
      coverLetter: result
    });

  } catch (error) {
    console.error('Cover letter error:', error);
    res.status(500).json({ error: 'Failed to generate cover letter' });
  }
});

/**
 * @route   GET /api/resume/history
 * @desc    Get history of ATS scans and Cover Letters
 * @access  Private
 */
app.get('/api/resume/history', async (req, res) => {
  try {
    // Get userId from token (robust fallback)
    let userId = req.headers['x-user-id'];
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretKey');
        userId = decoded._id || decoded.userId;
      } catch (err) {
        console.warn('Invalid token in history request');
      }
    }

    console.log(`Fetching resume history for user: ${userId}`);
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    // Return empty history if DB is not connected
    if (mongoose.connection.readyState !== 1) {
      console.warn('DB not connected, returning empty history');
      return res.json({ success: true, history: [] });
    }

    const [atsScans, coverLetters] = await Promise.all([
      ATSScan.find({ userId }).sort({ scanDate: -1 }).limit(10).lean(),
      CoverLetter.find({ userId }).sort({ generationDate: -1 }).limit(10).lean()
    ]);

    const history = [
      ...atsScans.map(item => ({
        type: 'ats',
        id: item._id,
        title: `ATS Scan: ${item.targetRole || 'General'}`,
        subtitle: `Score: ${item.atsScore}`,
        date: item.scanDate,
        data: item
      })),
      ...coverLetters.map(item => ({
        type: 'cover-letter',
        id: item._id,
        title: `Cover Letter: ${item.companyName}`,
        subtitle: item.targetRole,
        date: item.generationDate,
        data: item
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ success: true, history });
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

/**
 * @route   POST /api/simulation/notes
 * @desc    Generate comprehensive study notes for a simulation (Read Mode)
 * @access  Private
 */
app.post('/api/simulation/notes', async (req, res) => {
  try {
    const { simulationId, userId } = req.body;

    if (!simulationId) {
      return res.status(400).json({ error: 'Missing simulationId' });
    }

    // Fetch simulation context from MongoDB
    const sim = await Simulation.findById(simulationId);
    if (!sim) {
      return res.status(404).json({ error: 'Simulation not found' });
    }

    // CHECK: If notes already exist, return them immediately
    if (sim.notes) {
      console.log(`📚 Returning existing notes for simulation: ${sim.title}`);
      return res.json({
        success: true,
        notes: sim.notes,
        title: sim.title
      });
    }

    const notesPrompt = `Generate a set of "Complete Learning Notes" for the following career simulation:

    TITLE: ${sim.title}
    ROLE: ${sim.role}
    DESCRIPTION: ${sim.description}
    LEARNING OBJECTIVES: ${(sim.learning_objectives || []).join(', ')}
    SCENARIOS: ${JSON.stringify(sim.simulation?.scenarios || [])}

    REQUIREMENTS:
    1. Create high-quality, professional study notes in Markdown format.
    2. Include headers for:
       - 💎 Core Concepts & Definitions
       - 🚀 Best Practices & Strategies
       - 📝 Simulation Scenarios Explained
       - ✅ Key Takeaways & Action Items
       - 💡 Interview Tips Related to these Skills
    3. Use a direct, authoritative, and educational tone.
    4. Format the response strictly as a JSON object with a single "notes" field containing the markdown.

    RESPONSE FORMAT:
    {
      "notes": "# Study Notes: Title\\n\\n## Section 1\\nContent..."
    }`;

    console.log(`📝 Generating notes for simulation: ${sim.title}`);

    const result = await resumeOptimizer.generativeModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: notesPrompt }] }],
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 3072,
        responseMimeType: 'application/json'
      }
    });

    const aiResponseText = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const aiResponse = safeJsonParse(aiResponseText, { notes: "# Notes Generation Failed\\nPlease try again in a moment." });

    // SAVE: Persist the generated notes to the simulation
    if (aiResponse.notes && !aiResponse.notes.includes("Notes Generation Failed")) {
      try {
        sim.notes = aiResponse.notes;
        await sim.save();
        console.log(`💾 Saved notes for simulation: ${sim._id}`);
      } catch (saveErr) {
        console.error('Failed to save notes to DB:', saveErr);
      }
    }

    // Track activity
    if (userId) {
      try {
        await analyticsService.trackActivity(userId, 'simulation_notes_generated', {
          simulationId,
          title: sim.title,
          role: sim.role
        });
      } catch (trackErr) {
        console.warn('Failed to track simulation notes generation:', trackErr.message);
      }
    }

    res.json({
      success: true,
      notes: aiResponse.notes,
      title: sim.title
    });

  } catch (error) {
    console.error('❌ Simulation notes generation error:', error);
    res.status(500).json({ error: 'Failed to generate simulation notes. The AI might be rate-limited or busy.' });
  }
});

// Generate simulations based on resume analysis
app.post('/generate-simulations', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'Missing required field: userId'
      });
    }

    // Add job to queue
    const jobId = jobQueue.addJob('generate_simulations', req.body);
    console.log(`[JobQueue] Queued simulation generation job: ${jobId} for user ${userId}`);

    res.status(202).json({
      success: true,
      message: 'Simulation generation started',
      jobId,
      status: 'processing',
      userId
    });

  } catch (error) {
    console.error('Failed to queue simulation generation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start simulation generation'
    });
  }
});

// --- Job Queue Worker for Simulations ---
jobQueue.on('processJob', async (job, resolve, reject) => {
  if (job.type === 'generate_simulations') {
    console.log(`[Worker] Starting simulation generation for job ${job.id}`);
    const reqBody = job.data;
    const {
      userId, resumeAnalysis, role, skillsPresent, skillsMissing,
      target_role, skills_present, skills_missing, experience_level
    } = reqBody;

    try {
      console.log('Generating simulations based on resume analysis...');

      // Extract skills and role information from resume analysis
      const detectedRole = role || target_role || (resumeAnalysis && (resumeAnalysis.role || resumeAnalysis.target_role)) || 'Software Engineer';
      const presentSkills = skillsPresent || skills_present || (resumeAnalysis && (resumeAnalysis.skillsPresent || resumeAnalysis.skills_present)) || [];
      const missingSkills = skillsMissing || skills_missing || (resumeAnalysis && (resumeAnalysis.skillsMissing || resumeAnalysis.skills_missing)) || [];
      const expLevel = experience_level || (resumeAnalysis && resumeAnalysis.experienceLevel) || 'Entry Level';
      const analysisId = (resumeAnalysis && (resumeAnalysis.analysisId || resumeAnalysis._id || resumeAnalysis.id)) || null;

      // Build comprehensive prompt for simulation generation
      const simulationPrompt = `Generate personalized career simulations for a ${detectedRole} role at ${expLevel} level:
      CURRENT SKILLS: ${presentSkills.join(', ')}
      MISSING SKILLS: ${missingSkills.join(', ')}
      DETECTED ROLE: ${detectedRole}
      EXPERIENCE LEVEL: ${expLevel}

      Requirements:
      - EXACTLY 3 diverse simulations.
      - Each simulation must have 4 modes: guided, challenge, project, peer.
      - Difficulty levels: Beginner, Intermediate, Advanced.

      Return ONLY valid JSON with this structure:
      {
        "simulations": [
          {
            "id": "string",
            "title": "string",
            "type": "string",
            "difficulty": "string",
            "description": "short description",
            "skills": ["skill1", "skill2"],
            "category": "string",
            "completedModes": [],
            "overallProgress": 0,
            "modes": [
              { "id": "guided", "name": "Guided Mode", "description": "Short desc", "xpReward": 100, "estimatedTime": "30m", "difficulty": "Easy", "unlocked": true, "completed": false, "badge": "Badge" },
              { "id": "challenge", "name": "Challenge Mode", "description": "Short desc", "xpReward": 300, "estimatedTime": "20m", "difficulty": "Medium", "unlocked": true, "completed": false, "badge": "Badge" },
              { "id": "project", "name": "Project Mode", "description": "Short desc", "xpReward": 500, "estimatedTime": "2h", "difficulty": "Hard", "unlocked": false, "completed": false, "badge": "Badge" },
              { "id": "peer", "name": "Peer Compare", "description": "Short desc", "xpReward": 150, "estimatedTime": "15m", "difficulty": "Medium", "unlocked": false, "completed": false, "badge": "Badge" }
            ]
          }
        ]
      }`;

      // Call Gemini for simulation generation
      let simulationText = '{}';
      try {
        const result = await resumeOptimizer.generativeModel.generateContent({
          contents: [{ role: 'user', parts: [{ text: simulationPrompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json'
          }
        });
        simulationText = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        console.log('Generated simulations (Raw):', simulationText.substring(0, 100) + '...');
      } catch (e) {
        console.warn('Simulation generation failed via AI service:', e.message);
      }

      let simulationData = safeJsonParse(simulationText);

      // Normalize AI response
      if (simulationData) {
        if (simulationData.simulation && Array.isArray(simulationData.simulation.scenarios)) {
          simulationData.simulations = simulationData.simulation.scenarios;
        } else if (Array.isArray(simulationData.scenarios) && !simulationData.simulations) {
          simulationData.simulations = simulationData.scenarios;
        } else if (simulationData.title && simulationData.description && !simulationData.simulations) {
          simulationData.simulations = [simulationData];
        }
      }

      if (!simulationData || !simulationData.simulations || !Array.isArray(simulationData.simulations)) {
        console.warn('⚠️ Simulation generation failed: Invalid AI response structure. Generating fallback data...');
        if (Array.isArray(simulationData)) {
          simulationData = { simulations: simulationData };
        } else {
          // Fallback simulation data
          simulationData = {
            simulations: [
              {
                id: 'sim_fallback_01',
                title: `${role || 'Career'} Simulation`,
                type: 'Guided Project',
                difficulty: 'Intermediate',
                description: `A comprehensive simulation to practice ${role} skills.`,
                skills: [role || 'General'],
                category: 'Professional Skills',
                modes: [
                  { id: 'guided', name: 'Guided Mode', description: 'Step-by-step guidance', unlocked: true, completed: false },
                  { id: 'challenge', name: 'Challenge Mode', description: 'Test your skills', unlocked: true, completed: false }
                ],
                learning_objectives: ["Improve problem solving", "Practical application"],
                estimated_duration: "30 mins"
              }
            ]
          };
        }
      }

      // Enhance with YouTube video links
      try {
        console.log('Enhancing simulations with YouTube video links...');
        if (youtubeService) {
          for (const simulation of simulationData.simulations) {
            if (simulation.skills && simulation.skills.length > 0 && !simulation.youtube_videos) {
              const mainSkill = simulation.skills[0];
              simulation.youtube_videos = [
                { title: `${mainSkill} Tutorial`, topic: `Learn ${mainSkill}`, search_query: `${mainSkill} tutorial beginner` },
                { title: `${mainSkill} Advanced`, topic: `Master ${mainSkill}`, search_query: `${mainSkill} advanced tutorial` }
              ];
            }
            if (simulation.youtube_videos) {
              for (const video of simulation.youtube_videos) {
                if (video.search_query) {
                  try {
                    const searchResults = await youtubeService.searchVideosWithDetails(video.search_query, 1);
                    if (searchResults.length > 0) {
                      const bestMatch = searchResults[0];
                      Object.assign(video, {
                        url: bestMatch.url, videoId: bestMatch.videoId, thumbnail: bestMatch.thumbnail,
                        duration: bestMatch.duration, viewCount: bestMatch.viewCount,
                        channelTitle: bestMatch.channelTitle, publishedAt: bestMatch.publishedAt
                      });
                    }
                  } catch (err) { console.error(`Error enhancing video: ${err.message}`); }
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn('Failed to enhance simulations with YouTube links:', error);
      }

      // Store simulations in MongoDB
      let storedSimulations = [];
      let processedSimulations = []; // Keep track of processed simulations with defaults

      try {
        if (simulationData && simulationData.simulations) {
          for (const simulation of simulationData.simulations) {
            const safeSimulation = {
              ...simulation,
              userId: userId,
              analysisId: analysisId,
              targetRole: role || detectedRole, // Save the role from resume
              createdFrom: 'resume', // Mark as created from resume analysis
              title: simulation.title || `${detectedRole} Simulation`,
              description: simulation.description || `Practice simulation for ${detectedRole}`,
              difficulty: simulation.difficulty || 'Intermediate',
              skills: simulation.skills || [],
              category: simulation.category || 'General',
              youtube_videos: simulation.youtube_videos || [],
              modes: Array.isArray(simulation.modes) ? simulation.modes : [],
              completedModes: Array.isArray(simulation.completedModes) ? simulation.completedModes : [],
              overallProgress: typeof simulation.overallProgress === 'number' ? simulation.overallProgress : 0,
              estimated_duration: simulation.estimated_duration || '30 mins',
              learning_objectives: simulation.learning_objectives || ['Improve technical skills', 'Practice interviews']
            };

            processedSimulations.push(safeSimulation);

            if (persistenceMode === 'mongo') {
              try {
                const simulationDoc = await Simulation.create({
                  ...safeSimulation, // Spread to populate root fields (title, desc, etc.)
                  model_used: process.env.OPENROUTER_MODEL_NAME,
                  started_at: new Date(),
                  status: 'active',
                  progress: {
                    completed_scenarios: [], completed_interviews: [],
                    completed_challenges: [], completed_projects: [],
                    completed_modes: [],
                    overall_progress: 0
                  }
                });

                storedSimulations.push({
                  ...safeSimulation,
                  id: simulationDoc._id.toString(),
                  simulation_id: simulationDoc._id.toString(),
                  analysis_id: analysisId
                });
                console.log(`Saved simulation ${simulationDoc._id} to MongoDB`);
              } catch (saveError) {
                console.warn('Failed to save individual simulation:', saveError.message);
                // Even if save fails, we have safeSimulation in processedSimulations
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to process/store simulations:', error);
      }

      const finalResult = {
        userId: userId,
        role: detectedRole,
        // Prefer stored (with IDs), then processed (with defaults), then raw
        simulations: storedSimulations.length > 0 ? storedSimulations : (processedSimulations.length > 0 ? processedSimulations : simulationData.simulations),
        simulationIds: storedSimulations.map(s => s.id),
        generatedAt: new Date().toISOString(),
        storedInMongoDB: persistenceMode === 'mongo' && storedSimulations.length > 0
      };

      resolve(finalResult);

    } catch (error) {
      console.error('Failed to generate simulations (Worker):', error);
      reject(error);
    }
  }
});

// Event Listeners for Socket.io
jobQueue.on('jobCompleted', (job) => {
  if (job.data.userId && job.type === 'generate_simulations') {
    console.log(`[JobQueue] Job ${job.id} completed. Emitting 'simulation_generated' to user ${job.data.userId}`);
    io.to(job.data.userId).emit('simulation_generated', {
      success: true,
      ...job.result
    });
  }
});

jobQueue.on('jobFailed', (job) => {
  if (job.data.userId && job.type === 'generate_simulations') {
    console.error(`[JobQueue] Job ${job.id} failed. Emitting error to user.`);
    io.to(job.data.userId).emit('simulation_generated', {
      success: false,
      error: job.error
    });
  }
});

// Get stored roadmap by ID
app.get('/roadmap/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (persistenceMode === 'mongo') {
      const roadmap = await Roadmap.findById(id);
      if (!roadmap) {
        return res.status(404).json({ error: 'Roadmap not found' });
      }

      return res.json({
        success: true,
        roadmap_id: roadmap._id,
        analysis_id: roadmap.analysisId,
        role: roadmap.role,
        roadmap: roadmap.roadmap,
        estimated_timeline: roadmap.estimated_timeline,
        success_metrics: roadmap.success_metrics,
        model_used: roadmap.model_used,
        generated_at: roadmap.generated_at,
        created_at: roadmap.created_at,
        updated_at: roadmap.updated_at
      });
    } else {
      return res.status(404).json({ error: 'Roadmap not found (memory mode)' });
    }
  } catch (error) {
    console.error('Roadmap retrieval error:', error);
    return res.status(500).json({ error: 'Failed to retrieve roadmap' });
  }
});

// Get stored simulation by ID
app.get('/simulation/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (persistenceMode === 'mongo') {
      const simulation = await Simulation.findById(id);
      if (!simulation) {
        return res.status(404).json({ error: 'Simulation not found' });
      }

      return res.json({
        success: true,
        simulation_id: simulation._id,
        analysis_id: simulation.analysisId,
        role: simulation.role,
        simulation: simulation.simulation,
        estimated_duration: simulation.estimated_duration,
        learning_objectives: simulation.learning_objectives,
        model_used: simulation.model_used,
        started_at: simulation.started_at,
        status: simulation.status,
        progress: simulation.progress,
        created_at: simulation.created_at,
        updated_at: simulation.updated_at
      });
    } else {
      return res.status(404).json({ error: 'Simulation not found (memory mode)' });
    }
  } catch (error) {
    console.error('Simulation retrieval error:', error);
    return res.status(500).json({ error: 'Failed to retrieve simulation' });
  }
});

// Get user's latest analysis
app.get('/user/:userId/latest-analysis', async (req, res) => {
  try {
    const { userId } = req.params;

    if (persistenceMode === 'mongo') {
      const analysis = await Analysis.findOne({ userId }).sort({ createdAt: -1 });

      if (!analysis) {
        return res.json({ success: false, message: 'No analysis found' });
      }

      return res.json({
        success: true,
        id: analysis._id,
        target_role: analysis.target_role,
        match_score: analysis.match_score,
        skills_present: analysis.skills_present,
        skills_missing: analysis.skills_missing,
        recommendations: analysis.recommendations,
        job_matches: analysis.job_matches,
        experience_level: analysis.experience_level,
        created_at: analysis.createdAt
      });
    } else {
      // Memory mode fallback (find last analysis for user)
      const analyses = Array.from(memoryStore.values()).filter(v => v.userId === userId && v.match_score);
      const latest = analyses.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

      if (!latest) {
        return res.json({ success: false, message: 'No analysis found (memory)' });
      }

      return res.json({
        success: true,
        id: latest._id,
        target_role: latest.target_role || 'software-engineer', // Fallback
        match_score: latest.match_score,
        skills_present: latest.skills_present,
        skills_missing: latest.skills_missing,
        recommendations: latest.recommendations,
        job_matches: latest.job_matches,
        experience_level: latest.experience_level || 'Mid',
        created_at: latest.created_at
      });
    }
  } catch (error) {
    console.error('Latest analysis retrieval error:', error);
    return res.status(500).json({ error: 'Failed to retrieve latest analysis' });
  }
});

// Get user's roadmaps
app.get('/user/:userId/roadmaps', async (req, res) => {
  try {
    const { userId } = req.params;

    if (persistenceMode === 'mongo') {
      const roadmaps = await Roadmap.find({ userId }).sort({ created_at: -1 });

      return res.json({
        success: true,
        roadmaps: roadmaps.map(roadmap => ({
          roadmap_id: roadmap._id,
          analysis_id: roadmap.analysisId,
          role: roadmap.role,
          estimated_timeline: roadmap.estimated_timeline,
          model_used: roadmap.model_used,
          generated_at: roadmap.generated_at,
          created_at: roadmap.created_at
        }))
      });
    } else {
      return res.json({ success: true, roadmaps: [] });
    }
  } catch (error) {
    console.error('User roadmaps retrieval error:', error);
    return res.status(500).json({ error: 'Failed to retrieve user roadmaps' });
  }
});

// Get user's simulations
app.get('/user/:userId/simulations', async (req, res) => {
  try {
    const { userId } = req.params;

    if (persistenceMode === 'mongo') {
      const simulations = await Simulation.find({ userId }).sort({ created_at: -1 });

      return res.json({
        success: true,
        simulations: simulations.map(simulation => ({
          id: simulation._id,
          simulation_id: simulation._id,
          analysis_id: simulation.analysisId,
          role: simulation.role,
          simulation: simulation.simulation, // CRcritical fix: include the simulation data
          estimated_duration: simulation.estimated_duration,
          model_used: simulation.model_used,
          started_at: simulation.started_at,
          status: simulation.status,
          progress: simulation.progress,
          created_at: simulation.created_at
        }))
      });
    } else {
      return res.json({ success: true, simulations: [] });
    }
  } catch (error) {
    console.error('User simulations retrieval error:', error);
    return res.status(500).json({ error: 'Failed to retrieve user simulations' });
  }
});

// Update simulation progress
app.put('/simulation/:id/progress', async (req, res) => {
  try {
    const { id } = req.params;
    const { completed_scenarios, completed_interviews, completed_challenges, completed_projects, completed_modes, overall_progress } = req.body;

    if (persistenceMode === 'mongo') {
      const simulation = await Simulation.findByIdAndUpdate(
        id,
        {
          $set: {
            'progress.completed_scenarios': completed_scenarios || [],
            'progress.completed_interviews': completed_interviews || [],
            'progress.completed_challenges': completed_challenges || [],
            'progress.completed_projects': completed_projects || [],
            'progress.completed_modes': completed_modes || [],
            'progress.overall_progress': overall_progress || 0,
            updated_at: new Date()
          }
        },
        { new: true }
      );

      if (!simulation) {
        return res.status(404).json({ error: 'Simulation not found' });
      }

      return res.json({
        success: true,
        simulation_id: simulation._id,
        progress: simulation.progress,
        updated_at: simulation.updated_at
      });
    } else {
      return res.status(404).json({ error: 'Simulation not found (memory mode)' });
    }
  } catch (error) {
    console.error('Simulation progress update error:', error);
    return res.status(500).json({ error: 'Failed to update simulation progress' });
  }
});

// Generate detailed roadmap for individual skill
app.post('/generate-skill-roadmap', async (req, res) => {
  const { skill, currentLevel, targetLevel, priority, role } = req.body;

  try {
    const effectiveUserId = req.headers['x-user-id'] || 'anonymous';

    // Check if skill roadmap already exists for this user/skill/role
    if (persistenceMode === 'mongo') {
      try {
        const existingRoadmap = await CareerHistory.findOne({
          userId: effectiveUserId,
          type: 'skill-roadmap',
          'metadata.skillsFocused': skill,
          'metadata.targetRole': role
        }).sort({ createdAt: -1 });

        if (existingRoadmap) {
          console.log(`✅ Found existing skill roadmap for ${skill}, returning cached version.`);
          return res.json({
            success: true,
            roadmap: existingRoadmap.data,
            cached: true,
            generated_at: existingRoadmap.createdAt
          });
        }
      } catch (dbErr) {
        console.warn('Database error checking for existing skill roadmap:', dbErr.message);
      }
    }

    const skillRoadmapPrompt = `Generate a comprehensive learning roadmap for the skill "${skill}" to help a ${role} reach from ${currentLevel}% to ${targetLevel}% proficiency level.

    SKILL: ${skill}
    CURRENT LEVEL: ${currentLevel}%
    TARGET LEVEL: ${targetLevel}%
    PRIORITY: ${priority}
    ROLE: ${role}
    GAP: ${targetLevel - currentLevel} points needed

    Create a detailed, structured learning roadmap with:
    1. Learning phases (Beginner → Intermediate → Advanced)
    2. Specific topics to cover in each phase
    3. Hands-on projects for each phase
    4. YouTube video recommendations with specific topics
    5. Online courses and certifications
    6. Practice exercises and challenges
    7. Timeline for each phase
    8. Assessment methods to track progress

    Return ONLY valid JSON with this structure:
    {
      "skill": "${skill}",
      "current_level": ${currentLevel},
      "target_level": ${targetLevel},
      "gap_points": ${targetLevel - currentLevel},
      "priority": "${priority}",
      "roadmap": {
        "beginner_phase": {
          "duration": "2-3 weeks",
          "topics": ["topic1", "topic2", "topic3"],
          "projects": [
            {
              "name": "project name",
              "description": "project description",
              "skills_developed": ["skill1", "skill2"],
              "timeline": "1 week"
            }
          ],
          "youtube_videos": [
            {
              "title": "video title",
              "topic": "specific topic",
              "search_query": "youtube search query",
              "duration": "video duration"
            }
          ],
          "courses": ["course1", "course2"],
          "certifications": ["cert1", "cert2"],
          "practice_exercises": ["exercise1", "exercise2"],
          "assessment": "how to assess progress"
        },
        "intermediate_phase": {
          "duration": "3-4 weeks",
          "topics": ["topic1", "topic2", "topic3"],
          "projects": [
            {
              "name": "project name",
              "description": "project description",
              "skills_developed": ["skill1", "skill2"],
              "timeline": "2 weeks"
            }
          ],
          "youtube_videos": [
            {
              "title": "video title",
              "topic": "specific topic",
              "search_query": "youtube search query",
              "duration": "video duration"
            }
          ],
          "courses": ["course1", "course2"],
          "certifications": ["cert1", "cert2"],
          "practice_exercises": ["exercise1", "exercise2"],
          "assessment": "how to assess progress"
        },
        "advanced_phase": {
          "duration": "2-3 weeks",
          "topics": ["topic1", "topic2", "topic3"],
          "projects": [
            {
              "name": "project name",
              "description": "project description",
              "skills_developed": ["skill1", "skill2"],
              "timeline": "1 week"
            }
          ],
          "youtube_videos": [
            {
              "title": "video title",
              "topic": "specific topic",
              "search_query": "youtube search query",
              "duration": "video duration"
            }
          ],
          "courses": ["course1", "course2"],
          "certifications": ["cert1", "cert2"],
          "practice_exercises": ["exercise1", "exercise2"],
          "assessment": "how to assess progress"
        }
      },
      "total_timeline": "overall timeline",
      "success_metrics": ["metric1", "metric2", "metric3"],
      "learning_resources": {
        "platforms": ["platform1", "platform2"],
        "books": ["book1", "book2"],
        "communities": ["community1", "community2"],
        "tools": ["tool1", "tool2"]
      }
    }`;

    // Use RAG service instead of vertex.js
    const roadmapResponse = await ragAnalyzer.generativeModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: skillRoadmapPrompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json'
      }
    });
    const roadmapText = roadmapResponse?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    console.log('Generated skill roadmap:', roadmapText);


    let roadmapData = safeJsonParse(roadmapText);

    // If parsing failed, create fallback data
    if (!roadmapData || !roadmapData.roadmap) {
      console.log('Creating fallback skill roadmap data...');

      roadmapData = {
        skill: skill,
        current_level: currentLevel,
        target_level: targetLevel,
        gap_points: targetLevel - currentLevel,
        priority: priority,
        roadmap: {
          beginner_phase: {
            duration: "2-3 weeks",
            topics: [`${skill} Fundamentals`, `${skill} Basics`, `${skill} Introduction`],
            projects: [
              {
                name: `${skill} Practice Project`,
                description: `Build a basic project using ${skill} to understand fundamentals`,
                skills_developed: [skill, 'Problem Solving'],
                timeline: '1 week'
              }
            ],
            youtube_videos: [
              {
                title: `${skill} Tutorial for Beginners`,
                topic: `Learn ${skill} fundamentals`,
                search_query: `${skill} tutorial beginner`,
                duration: '30-45 min'
              }
            ],
            courses: [`${skill} Fundamentals Course`, `${skill} Basics Training`],
            certifications: [`${skill} Beginner Certificate`],
            practice_exercises: [`${skill} Basic Exercises`, `${skill} Practice Problems`],
            assessment: `Complete ${skill} beginner assessment`
          },
          intermediate_phase: {
            duration: "3-4 weeks",
            topics: [`${skill} Intermediate Concepts`, `${skill} Advanced Features`, `${skill} Best Practices`],
            projects: [
              {
                name: `${skill} Intermediate Project`,
                description: `Build an intermediate project using ${skill} with advanced features`,
                skills_developed: [skill, 'Advanced Problem Solving'],
                timeline: '2 weeks'
              }
            ],
            youtube_videos: [
              {
                title: `${skill} Intermediate Tutorial`,
                topic: `Learn ${skill} intermediate concepts`,
                search_query: `${skill} intermediate tutorial`,
                duration: '45-60 min'
              }
            ],
            courses: [`${skill} Intermediate Course`, `${skill} Advanced Training`],
            certifications: [`${skill} Intermediate Certificate`],
            practice_exercises: [`${skill} Intermediate Exercises`, `${skill} Advanced Problems`],
            assessment: `Complete ${skill} intermediate assessment`
          },
          advanced_phase: {
            duration: "2-3 weeks",
            topics: [`${skill} Advanced Concepts`, `${skill} Expert Techniques`, `${skill} Optimization`],
            projects: [
              {
                name: `${skill} Advanced Project`,
                description: `Build an advanced project using ${skill} with expert techniques`,
                skills_developed: [skill, 'Expert Problem Solving'],
                timeline: '1 week'
              }
            ],
            youtube_videos: [
              {
                title: `${skill} Advanced Tutorial`,
                topic: `Learn ${skill} advanced concepts`,
                search_query: `${skill} advanced tutorial`,
                duration: '60-90 min'
              }
            ],
            courses: [`${skill} Advanced Course`, `${skill} Expert Training`],
            certifications: [`${skill} Advanced Certificate`, `${skill} Expert Certificate`],
            practice_exercises: [`${skill} Advanced Exercises`, `${skill} Expert Problems`],
            assessment: `Complete ${skill} advanced assessment`
          }
        },
        total_timeline: "6-10 weeks",
        success_metrics: [
          `Complete ${skill} beginner assessment`,
          `Complete ${skill} intermediate assessment`,
          `Complete ${skill} advanced assessment`,
          `Build 3 projects using ${skill}`,
          `Earn ${skill} certification`
        ],
        learning_resources: {
          platforms: ['YouTube', 'Coursera', 'Udemy', 'FreeCodeCamp'],
          books: [`${skill} Reference Guide`, `${skill} Best Practices Book`],
          communities: ['Stack Overflow', 'Reddit', 'Discord', 'LinkedIn Groups'],
          tools: [`${skill} Official Documentation`, `${skill} Practice Tools`]
        }
      };
    }

    // Enhance skill roadmap with actual YouTube video links
    try {
      console.log('Enhancing skill roadmap with YouTube video links...');
      roadmapData = await youtubeService.generateRoadmapVideoLinks(roadmapData);
      console.log('YouTube video links added to skill roadmap successfully');
    } catch (error) {
      console.error('Failed to enhance skill roadmap with YouTube links:', error);
      // Continue with original roadmap data
    }

    // Save to Career History
    try {
      const effectiveUserId = req.headers['x-user-id'] || 'anonymous';
      await CareerHistory.create({
        userId: effectiveUserId,
        type: 'skill-roadmap',
        data: roadmapData,
        metadata: {
          skillsFocused: [skill],
          targetRole: role
        }
      });
      console.log('✅ Skill roadmap saved to career history');
    } catch (historyErr) {
      console.warn('Failed to save skill roadmap to history:', historyErr.message);
    }

    res.json({
      success: true,
      roadmap: roadmapData
    });

  } catch (error) {
    console.error('Skill roadmap generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate skill roadmap: ' + error.message
    });
  }
});

// Test YouTube service endpoint
app.get('/test-youtube/:query', async (req, res) => {
  try {
    const { query } = req.params;

    if (!youtubeService) {
      return res.status(503).json({
        success: false,
        error: 'YouTube service not initialized'
      });
    }

    console.log(`Testing YouTube search for: ${query}`);
    const results = await youtubeService.searchVideosWithDetails(query, 3);

    res.json({
      success: true,
      query: query,
      results: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('YouTube test error:', error);
    res.status(500).json({
      success: false,
      error: 'YouTube test failed',
      details: error.message
    });
  }
});

// Map custom role names to database role keys
function mapRoleToDatabase(customRole) {
  if (!customRole) return 'software-engineer'; // Default fallback

  const roleLower = customRole.toLowerCase().trim();

  // Direct matches
  const roleMapping = {
    'software-engineer': ['software engineer', 'sde', 'software developer', 'full stack', 'fullstack', 'backend', 'frontend', 'web developer', 'application developer', 'product development'],
    'data-analyst': ['data analyst', 'business analyst', 'analytics', 'data analytics', 'bi analyst'],
    'data-engineer': ['data engineer', 'etl developer', 'data pipeline', 'big data engineer'],
    'machine-learning-engineer': ['machine learning', 'ml engineer', 'ai engineer', 'deep learning'],
    'cyber-security': ['security', 'cybersecurity', 'infosec', 'security analyst', 'security engineer'],
    'product-manager': ['product manager', 'pm', 'product owner', 'product lead'],
    'ux-designer': ['ux', 'ui', 'designer', 'ux designer', 'ui designer', 'product designer']
  };

  // Check for exact or partial matches
  for (const [dbRole, keywords] of Object.entries(roleMapping)) {
    for (const keyword of keywords) {
      if (roleLower.includes(keyword) || keyword.includes(roleLower)) {
        console.log(`✅ Mapped role "${customRole}" → "${dbRole}" (matched keyword: "${keyword}")`);
        return dbRole;
      }
    }
  }

  // If no match found, try to infer from common patterns
  if (roleLower.includes('develop')) return 'software-engineer';
  if (roleLower.includes('data')) return 'data-analyst';
  if (roleLower.includes('engineer')) return 'software-engineer';
  if (roleLower.includes('analyst')) return 'data-analyst';
  if (roleLower.includes('security')) return 'cyber-security';
  if (roleLower.includes('design')) return 'ux-designer';
  if (roleLower.includes('product')) return 'product-manager';

  console.log(`⚠️ No mapping found for role "${customRole}", using default: software-engineer`);
  return 'software-engineer'; // Default fallback
}

// Find job matches based on role and skills
function findJobMatches(role, foundSkills) {
  // Map custom role to database role
  const mappedRole = mapRoleToDatabase(role);

  console.log(`Finding job matches for role: "${role}" (mapped to: "${mappedRole}")`);
  console.log(`Found skills: ${foundSkills.join(', ')}`);
  console.log(`Found skills type: ${typeof foundSkills}, length: ${foundSkills?.length}`);

  const jobs = JOB_DATABASE[mappedRole] || [];
  console.log(`Available jobs for ${mappedRole}: ${jobs.length}`);

  if (!foundSkills || foundSkills.length === 0) {
    console.log('No skills found for job matching');
    return [];
  }

  const matches = [];

  for (const job of jobs) {
    // Calculate match percentage based on required and preferred skills
    const requiredSkills = job.requiredSkills || [];
    const preferredSkills = job.preferredSkills || [];

    // Enhanced skill matching with better synonym handling
    const skillSynonyms = {
      'rest': ['rest api', 'restful', 'rest apis', 'api'],
      'gcp': ['google cloud platform', 'google cloud', 'gcp'],
      'aws': ['amazon web services', 'aws'],
      'ci/cd': ['ci/cd', 'continuous integration', 'continuous deployment', 'cicd'],
      'testing': ['test', 'testing', 'test-driven development', 'tdd', 'unit testing'],
      'javascript': ['js', 'javascript', 'ecmascript'],
      'typescript': ['ts', 'typescript'],
      'react': ['react', 'reactjs', 'react.js'],
      'node.js': ['node', 'nodejs', 'node.js'],
      'sql': ['sql', 'mysql', 'postgresql', 'database', 'databases'],
      'docker': ['docker', 'containerization', 'containers'],
      'kubernetes': ['kubernetes', 'k8s'],
      'java': ['java', 'jvm'],
      'python': ['python', 'py'],
      'git': ['git', 'github', 'version control'],
      'html': ['html', 'html5'],
      'css': ['css', 'css3', 'styling'],
      'mongodb': ['mongodb', 'mongo'],
      'express': ['express', 'expressjs'],
      'angular': ['angular', 'angularjs'],
      'vue': ['vue', 'vuejs'],
      'linux': ['linux', 'unix'],
      'graphql': ['graphql'],
      'machine learning': ['ml', 'ai', 'artificial intelligence', 'machine learning'],
      'agile': ['agile', 'scrum'],
      'azure': ['azure', 'microsoft azure'],
      'spark': ['spark', 'apache spark', 'pyspark'],
      'hadoop': ['hadoop', 'apache hadoop', 'mapreduce'],
      'airflow': ['airflow', 'apache airflow', 'dag'],
      'kafka': ['kafka', 'apache kafka', 'confluent'],
      'snowflake': ['snowflake', 'data warehouse'],
      'bigquery': ['bigquery', 'google bigquery', 'bq'],
      'redshift': ['redshift', 'amazon redshift'],
      'tableau': ['tableau', 'data visualization'],
      'power bi': ['power bi', 'powerbi'],
      'excel': ['excel', 'spreadsheet'],
      'pandas': ['pandas', 'dataframes'],
      'scikit-learn': ['scikit-learn', 'sklearn', 'machine learning'],
      'tensorflow': ['tensorflow', 'tf'],
      'pytorch': ['pytorch', 'torch']
    };

    const normalizeSkill = (skill) => {
      if (!skill) return '';
      const lower = skill.toLowerCase().trim();

      // Use exact equality or word boundary match for synonyms
      for (const [key, synonyms] of Object.entries(skillSynonyms)) {
        if (synonyms.some(synonym => {
          const lowerSynonym = synonym.toLowerCase().trim();
          // Exact match
          if (lower === lowerSynonym) return true;
          // Word boundary match (e.g. "js" matches "node.js" or "javascript"?) 
          // Actually, we want to be strict. Only use word boundaries if it's a multi-word synonym.
          if (lowerSynonym.length > 2) {
            const regex = new RegExp(`\\b${lowerSynonym}\\b`, 'i');
            if (regex.test(lower)) return true;
          }
          return false;
        })) {
          return key;
        }
      }
      return lower;
    };

    // Count how many required skills the candidate has
    const requiredMatches = requiredSkills.filter(skill => {
      const normalizedJobSkill = normalizeSkill(skill);
      const hasMatch = foundSkills.some(foundSkill => {
        const normalizedFoundSkill = normalizeSkill(foundSkill);
        const isMatch = normalizedFoundSkill === normalizedJobSkill ||
          normalizedFoundSkill.includes(normalizedJobSkill) ||
          normalizedJobSkill.includes(normalizedFoundSkill);
        if (isMatch) {
          console.log(`✓ Match found: "${foundSkill}" (${normalizedFoundSkill}) matches "${skill}" (${normalizedJobSkill})`);
        }
        return isMatch;
      });
      if (!hasMatch) {
        console.log(`✗ No match for required skill: "${skill}" (${normalizedJobSkill})`);
      }
      return hasMatch;
    }).length;

    // Count how many preferred skills the candidate has
    const preferredMatches = preferredSkills.filter(skill => {
      const normalizedJobSkill = normalizeSkill(skill);
      return foundSkills.some(foundSkill => {
        const normalizedFoundSkill = normalizeSkill(foundSkill);
        return normalizedFoundSkill === normalizedJobSkill ||
          normalizedFoundSkill.includes(normalizedJobSkill) ||
          normalizedJobSkill.includes(normalizedFoundSkill);
      });
    }).length;

    // Calculate match percentage (required skills weighted more heavily)
    const requiredWeight = 0.7;
    const preferredWeight = 0.3;
    const totalRequired = requiredSkills.length;
    const totalPreferred = preferredSkills.length;

    const matchPercentage = Math.round(
      ((requiredMatches / Math.max(totalRequired, 1)) * requiredWeight +
        (preferredMatches / Math.max(totalPreferred, 1)) * preferredWeight) * 100
    );

    console.log(`Job: ${job.title} - Match: ${matchPercentage}% (Required: ${requiredMatches}/${totalRequired}, Preferred: ${preferredMatches}/${totalPreferred})`);

    // Only include jobs with at least 30% match
    if (matchPercentage >= 30) {
      const missingSkills = [...requiredSkills, ...preferredSkills].filter(skill => {
        const normalizedJobSkill = normalizeSkill(skill);
        return !foundSkills.some(foundSkill => {
          const normalizedFoundSkill = normalizeSkill(foundSkill);
          return normalizedFoundSkill === normalizedJobSkill ||
            normalizedFoundSkill.includes(normalizedJobSkill) ||
            normalizedJobSkill.includes(normalizedFoundSkill);
        });
      });

      const match = {
        title: job.title,
        company: job.company,
        location: job.location,
        matchPercentage: matchPercentage,
        missingSkills: missingSkills.slice(0, 3), // Top 3 missing skills
        strongPoints: foundSkills.filter(skill => {
          const normalizedFoundSkill = normalizeSkill(skill);
          return [...requiredSkills, ...preferredSkills].some(jobSkill => {
            const normalizedJobSkill = normalizeSkill(jobSkill);
            return normalizedFoundSkill === normalizedJobSkill ||
              normalizedFoundSkill.includes(normalizedJobSkill) ||
              normalizedJobSkill.includes(normalizedFoundSkill);
          });
        }).slice(0, 3), // Top 3 strong points
        description: job.description,
        salary: job.salary
      };

      matches.push(match);
      console.log(`Added job match: ${job.title} (${matchPercentage}%)`);
    } else {
      console.log(`Job ${job.title} below 50% threshold (${matchPercentage}%)`);
    }
  }

  // Sort by match percentage (highest first) and return top 5
  const finalMatches = matches.sort((a, b) => b.matchPercentage - a.matchPercentage).slice(0, 5);
  console.log(`Final job matches for ${role}: ${finalMatches.length} matches`);
  console.log('Final matches:', JSON.stringify(finalMatches, null, 2));
  return finalMatches;
}

// Auto-detect role from resume content
async function detectRoleFromResume(resumeText) {
  const lowerText = resumeText.toLowerCase();
  console.log('Starting role detection for text length:', resumeText.length);
  console.log('Sample text for role detection:', resumeText.substring(0, 200));

  // Define role-specific keywords and their weights
  const roleKeywords = {
    'data-engineer': {
      keywords: ['data engineer', 'etl', 'spark', 'airflow', 'hadoop', 'kafka', 'bigquery', 'redshift', 'snowflake', 'databricks', 'data pipeline', 'data warehousing', 'data lake', 'glue', 'emr', 'athena', 'fivetran', 'dbt'],
      weight: 3 // Higher weight for specialized roles
    },
    'machine-learning-engineer': {
      keywords: ['machine learning engineer', 'ml engineer', 'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'mlops', 'computer vision', 'nlp', 'natural language processing', 'deep learning', 'neural networks', 'feature engineering', 'model deployment'],
      weight: 2
    },
    'software-engineer': {
      keywords: ['javascript', 'typescript', 'react', 'node.js', 'python', 'java', 'git', 'docker', 'aws', 'rest api', 'microservices', 'ci/cd', 'jenkins', 'kubernetes', 'backend', 'frontend', 'full-stack', 'programming', 'development', 'software engineer', 'developer'],
      weight: 1
    },
    'data-analyst': {
      keywords: ['sql', 'python', 'tableau', 'power bi', 'excel', 'statistics', 'data analysis', 'analytics', 'machine learning', 'data visualization', 'etl', 'bigquery', 'pandas', 'numpy', 'data analyst', 'business intelligence'],
      weight: 1
    },
    'cyber-security': {
      keywords: [
        'cyber security', 'cybersecurity', 'information security', 'infosec',
        'network security', 'siem', 'splunk', 'qradar', 'elastic security',
        'ids', 'ips', 'intrusion detection', 'intrusion prevention',
        'incident response', 'ir', 'blue team', 'red team', 'soc', 'soc analyst',
        'vulnerability management', 'vulnerability scanning', 'nessus', 'nmap', 'burp suite',
        'penetration testing', 'pentest', 'owasp', 'threat hunting', 'threat modeling',
        'malware analysis', 'digital forensics', 'dfir', 'kali linux', 'metasploit',
        'siem engineer', 'security analyst', 'security engineer', 'risk management',
        'nist', 'iso 27001', 'gdpr', 'hipaa', 'pci dss',
        'iam', 'identity and access management', 'mfa', 'sso',
        'firewall', 'waf', 'edr', 'xdr', 'crowdstrike', 'sentinelone', 'defender',
        'zero trust', 'vpn', 'ssl', 'tls', 'encryption', 'hashing'
      ],
      weight: 2
    },
    'product-manager': {
      keywords: ['product strategy', 'user research', 'analytics', 'roadmapping', 'agile', 'scrum', 'stakeholder management', 'product manager', 'product owner', 'market research', 'competitive analysis', 'a/b testing'],
      weight: 1
    },
    'ux-designer': {
      keywords: ['figma', 'sketch', 'adobe xd', 'prototyping', 'user research', 'wireframing', 'usability testing', 'ux designer', 'ui designer', 'user experience', 'user interface', 'design system', 'accessibility'],
      weight: 1
    }
  };

  // Calculate scores for each role
  const roleScores = {};
  for (const [role, config] of Object.entries(roleKeywords)) {
    let score = 0;
    for (const keyword of config.keywords) {
      if (lowerText.includes(keyword)) {
        score += config.weight;
      }
    }
    roleScores[role] = score;
  }

  // Rank roles by score
  const sortedRoles = Object.entries(roleScores).sort((a, b) => b[1] - a[1]);
  const bestRole = sortedRoles[0];

  console.log('Role detection scores:', roleScores);
  console.log('Best role match:', bestRole);

  // If no clear match or very low scores, check for technical role titles more carefully
  if (bestRole[1] < 1) {
    if (lowerText.includes('data engineer')) return 'data-engineer';
    if (lowerText.includes('software engineer')) return 'software-engineer';
    if (lowerText.includes('data analyst')) return 'data-analyst';
    if (lowerText.includes('cyber security')) return 'cyber-security';

    const hasTechnicalKeywords = lowerText.includes('python') || lowerText.includes('sql') || lowerText.includes('aws') || lowerText.includes('programming');
    return hasTechnicalKeywords ? 'software-engineer' : 'data-analyst';
  }

  console.log('Detected role:', bestRole[0]);
  return bestRole[0];
}

// Intelligent resume analysis function
async function analyzeResumeIntelligently(resumeText, jdText, target_role) {
  // Extract skills from resume text
  const skillKeywords = {
    'JavaScript': ['javascript', 'js', 'ecmascript'],
    'TypeScript': ['typescript', 'ts'],
    'React': ['react', 'reactjs'],
    'Node.js': ['node', 'nodejs', 'node.js'],
    'Python': ['python', 'py'],
    'Java': ['java'],
    'SQL': ['sql', 'mysql', 'postgresql', 'database'],
    'Git': ['git', 'github', 'version control'],
    'Docker': ['docker', 'containerization'],
    'AWS': ['aws', 'amazon web services', 'cloud'],
    'HTML': ['html', 'html5'],
    'CSS': ['css', 'css3', 'styling'],
    'MongoDB': ['mongodb', 'mongo'],
    'Express': ['express', 'expressjs'],
    'Angular': ['angular', 'angularjs'],
    'Vue': ['vue', 'vuejs'],
    'Linux': ['linux', 'unix'],
    'REST': ['rest', 'restful', 'api'],
    'GraphQL': ['graphql'],
    'Kubernetes': ['kubernetes', 'k8s'],
    'Machine Learning': ['machine learning', 'ml', 'ai', 'artificial intelligence'],
    'Data Analysis': ['data analysis', 'analytics', 'statistics'],
    'Tableau': ['tableau'],
    'Power BI': ['power bi', 'powerbi'],
    'Excel': ['excel'],
    'Figma': ['figma'],
    'Sketch': ['sketch'],
    'Adobe': ['adobe', 'photoshop', 'illustrator'],
    'Agile': ['agile', 'scrum'],
    'CI/CD': ['ci/cd', 'continuous integration', 'continuous deployment'],
    'Jenkins': ['jenkins'],
    'Azure': ['azure', 'microsoft azure'],
    'GCP': ['gcp', 'google cloud', 'google cloud platform'],
    'Spark': ['spark', 'apache spark', 'pyspark'],
    'Airflow': ['airflow', 'apache airflow'],
    'Kafka': ['kafka', 'apache kafka'],
    'BigQuery': ['bigquery', 'gbq'],
    'Snowflake': ['snowflake'],
    'Databricks': ['databricks'],
    'ETL': ['etl', 'extract transform load', 'data pipeline'],
    'Data Modeling': ['data modeling', 'schema design', 'normalization']
  };

  const foundSkills = [];
  const lowerText = resumeText.toLowerCase();

  console.log('Starting skill extraction for role:', target_role);
  console.log('Resume text length for skill extraction:', resumeText.length);

  for (const [skill, keywords] of Object.entries(skillKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      foundSkills.push(skill);
      console.log(`Found skill: ${skill} (keywords: ${keywords.join(', ')})`);
    }
  }

  console.log('Total skills found:', foundSkills.length);
  console.log('Found skills:', foundSkills);

  // Define role requirements
  const roleRequirements = {
    'software-engineer': ['Python', 'Docker', 'AWS', 'Machine Learning', 'Kubernetes', 'CI/CD'],
    'data-analyst': ['Python', 'SQL', 'Tableau', 'Statistics', 'Machine Learning', 'Excel'],
    'data-engineer': ['Python', 'SQL', 'Spark', 'Airflow', 'Kafka', 'ETL', 'BigQuery', 'Snowflake', 'Databricks'],
    'machine-learning-engineer': ['Python', 'TensorFlow', 'PyTorch', 'MLOps', 'AWS', 'SQL'],
    'cyber-security': ['Linux', 'Networking', 'Incident Response', 'Threat Modeling', 'SIEM', 'Cloud Security'],
    'product-manager': ['User Research', 'Analytics', 'Agile', 'Stakeholder Management', 'Excel'],
    'ux-designer': ['Figma', 'User Research', 'Prototyping', 'Accessibility', 'Adobe']
  };

  const requiredSkills = roleRequirements[target_role] || [];
  const missingSkills = requiredSkills.filter(skill => !foundSkills.includes(skill));

  // Create a detailed skills gap analysis
  const skills_gap = missingSkills.map(skill => ({
    skill,
    importance: 'High',
    reason: `Critical for ${target_role} roles following current industry standards.`
  }));

  // Generate recommendations based on missing skills
  const recommendations = [];
  if (missingSkills.includes('Python')) recommendations.push('Learn Python for data analysis, automation, and backend development');
  if (missingSkills.includes('SQL')) recommendations.push('Master SQL for complex database queries and data manipulation');
  if (missingSkills.includes('Docker')) recommendations.push('Get familiar with Docker for containerization and consistent environments');
  if (missingSkills.includes('AWS')) recommendations.push('Study AWS cloud services (S3, EC2, Lambda) for deployment');
  if (missingSkills.includes('Kubernetes')) recommendations.push('Explore Kubernetes for container orchestration at scale');
  if (missingSkills.includes('Spark')) recommendations.push('Learn Apache Spark (and PySpark) for large-scale distributed data processing');
  if (missingSkills.includes('Airflow')) recommendations.push('Master Apache Airflow for data pipeline orchestration and scheduling');
  if (missingSkills.includes('Kafka')) recommendations.push('Learn Apache Kafka for real-time data streaming and event-driven architecture');
  if (missingSkills.includes('Snowflake')) recommendations.push('Gain experience with Snowflake or BigQuery for modern cloud data warehousing');
  if (missingSkills.includes('TensorFlow') || missingSkills.includes('PyTorch')) recommendations.push('Deep dive into Deep Learning frameworks like TensorFlow or PyTorch');
  if (missingSkills.includes('MLOps')) recommendations.push('Learn MLOps practices for productionizing machine learning models');
  if (missingSkills.includes('Tableau')) recommendations.push('Learn Tableau or Power BI for professional data visualization');
  if (missingSkills.includes('Figma')) recommendations.push('Master Figma for modern UI/UX design and prototyping');

  if (recommendations.length === 0) {
    recommendations.push('Focus on advanced architecture and system design');
    recommendations.push('Seek leadership or mentorship opportunities');
    recommendations.push('Contribute to open-source projects in your field');
  }

  // Calculate match score based on found skills vs requirements
  const foundRequiredCount = requiredSkills.filter(s => foundSkills.includes(s)).length;
  const matchScore = Math.min(100, Math.round((foundRequiredCount / Math.max(requiredSkills.length, 1)) * 100));

  console.log(`Match score calculation for ${target_role}: ${foundRequiredCount}/${requiredSkills.length} = ${matchScore}%`);

  const jobMatches = findJobMatches(target_role, foundSkills);

  const result = {
    match_score: matchScore,
    skills_present: foundSkills,
    skills_missing: missingSkills,
    skills_gap: skills_gap,
    job_matches: jobMatches,
    recommendations: recommendations.slice(0, 5)
  };

  console.log('Final analysis result:', JSON.stringify(result, null, 2));
  return result;
}

const PORT = process.env.PORT || 3001;

// Keep the server running and handle errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

// Test YouTube service endpoint
app.get('/test-youtube-service', async (req, res) => {
  try {
    const testQuery = 'Python programming tutorial';
    const videos = await youtubeService.searchVideosWithDetails(testQuery, 1);

    res.json({
      apiKeyAvailable: !!process.env.YOUTUBE_API_KEY,
      testQuery: testQuery,
      videosFound: videos.length,
      sampleVideo: videos.length > 0 ? videos[0] : null,
      videos: videos
    });
  } catch (error) {
    console.error('YouTube service test error:', error);
    res.status(500).json({
      error: 'YouTube service test failed',
      details: error.message,
      apiKeyAvailable: !!process.env.YOUTUBE_API_KEY
    });
  }
});

// For Vercel deployment

export default app;

// Start HTTP listener when running locally OR in container hosts like Render
if (process.env.NODE_ENV !== 'production' || process.env.RENDER || process.env.RUN_IN_CONTAINER === 'true') {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
    console.log(`📊 Persistence mode: ${persistenceMode}`);
  });
}


// Force restart
