import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import occupationsRouter from './routes/occupations.js';
import searchRouter from './routes/search.js';
import Occupation from './models/Occupation.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// CORS configuration
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: corsOrigins,
  credentials: true
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'O*NET Data Service',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Stats endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const totalOccupations = await Occupation.countDocuments();
    const lastUpdated = await Occupation.findOne()
      .sort({ lastUpdated: -1 })
      .select('lastUpdated');

    res.json({
      success: true,
      stats: {
        totalOccupations,
        lastUpdated: lastUpdated?.lastUpdated || null,
        dataSource: 'O*NET Database',
        version: '1.0.0'
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats',
      message: error.message
    });
  }
});

// API Routes
app.use('/api/occupations', occupationsRouter);
app.use('/api/search', searchRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /health',
      'GET /api/stats',
      'GET /api/occupations',
      'GET /api/occupations/:code',
      'GET /api/occupations/:code/skills',
      'GET /api/search',
      'POST /api/search/match-skills'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Connect to MongoDB and start server
async function startServer() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB');

    app.listen(PORT, () => {
      console.log('\n' + '='.repeat(50));
      console.log('🚀 O*NET Data Service');
      console.log('='.repeat(50));
      console.log(`📡 Server running on port ${PORT}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/health`);
      console.log(`📊 Stats: http://localhost:${PORT}/api/stats`);
      console.log('='.repeat(50) + '\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
