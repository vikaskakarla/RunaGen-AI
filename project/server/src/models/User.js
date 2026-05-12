import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    unique: true,
    sparse: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,15})+$/, 'Please fill a valid email address']
  },
  password: {
    type: String,
    minlength: 8
  },
  careerInterest: {
    type: String,
    default: ''
  },
  experienceLevel: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced', ''],
    default: 'Beginner'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  university: String,
  currentCompany: String,
  bio: String,

  preferences: {
    industries: [String],
    locations: [String],
    workMode: { type: String, enum: ['remote', 'on-site', 'hybrid'] },
    targetRoles: [String]
  },

  // Real-time Analytics Fields
  xp: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  },
  xpToNext: {
    type: Number,
    default: 1000
  },
  skillsGapScore: {
    type: Number,
    default: 0
  },
  streak: {
    current: { type: Number, default: 0 },
    max: { type: Number, default: 0 },
    lastActivityDate: Date
  },
  dailyStats: [{
    date: String, // YYYY-MM-DD format
    count: { type: Number, default: 0 },
    minutes: { type: Number, default: 0 }
  }],
  badges: [{
    id: String,
    name: String,
    icon: String,
    earned: Boolean,
    unlockedAt: Date,
    description: String,
    type: { type: String },
    color: String,
    rarity: String
  }],
  recentActivity: [{
    type: { type: String }, // 'simulation', 'skill', 'badge', 'mentor'
    title: String,
    points: Number,
    timestamp: { type: Date, default: Date.now }
  }],

  // Weekly Stats for Goals Tracking
  weeklyStats: {
    simulations: { type: Number, default: 0 },
    mentorChats: { type: Number, default: 0 },
    xpEarned: { type: Number, default: 0 }
  },

  // Additional Profile Fields for Full Persistence
  personality: {
    type: String,
    default: "Analytical Explorer"
  },
  personalityTracks: [String],
  personalityDate: Date,
  lastQuizScore: { type: Number },

  manualSkills: [String],

  settings: {
    isStudent: { type: Boolean, default: true },
    isPublic: { type: Boolean, default: false },
    notifications: {
      product: { type: Boolean, default: true },
      reminders: { type: Boolean, default: true },
      mentor: { type: Boolean, default: true }
    }
  },

  // Skills Profile from Resume Analysis
  skillsProfile: {
    skills: [String],                    // Skills found in resume
    skillGaps: [{                        // Missing skills for target role
      skill: String,
      currentLevel: Number,
      targetLevel: Number,
      priority: String,
      gap: Number
    }],
    targetCompany: String,               // Target company name
    targetRole: String,                  // Target role name
    analysisId: String,                  // Reference to analysis document
    lastUpdated: { type: Date, default: Date.now }
  },

  // AI Quiz Session
  quizSession: {
    isActive: { type: Boolean, default: false },
    questions: [{
      id: Number,
      text: String,
      options: [{ label: String, value: String }],
      correctAnswer: String, // Value of the correct option
      reasoning: String // Explanation of the answer
    }],
    currentQuestionIndex: { type: Number, default: 0 },
    answers: { type: Map, of: String }, // questionId -> answerValue
    startedAt: Date
  }
});

const User = mongoose.model('User', userSchema);
export default User;
