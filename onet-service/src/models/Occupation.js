import mongoose from 'mongoose';

const occupationSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  title: { 
    type: String, 
    required: true,
    index: true 
  },
  description: String,
  
  skills: [{
    name: String,
    level: Number,
    importance: Number
  }],
  
  abilities: [{
    name: String,
    level: Number,
    importance: Number
  }],
  
  knowledge: [{
    name: String,
    level: Number,
    importance: Number
  }],
  
  tasks: [String],
  
  technology: [{
    name: String,
    example: [String]
  }],
  
  education: String,
  experience: String,
  jobZone: Number,
  
  salary: {
    median: Number,
    range: {
      min: Number,
      max: Number
    }
  },
  
  outlook: String,
  
  lastUpdated: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Text search index
occupationSchema.index({ 
  title: 'text', 
  description: 'text',
  'skills.name': 'text'
});

const Occupation = mongoose.model('Occupation', occupationSchema);

export default Occupation;
