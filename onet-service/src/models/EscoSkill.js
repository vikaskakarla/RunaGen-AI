import mongoose from 'mongoose';

const escoSkillSchema = new mongoose.Schema({
  uri: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  code: String,
  preferredLabel: {
    en: String,
    es: String,
    fr: String,
    de: String
  },
  alternativeLabels: [String],
  description: {
    en: String
  },
  skillType: {
    type: String,
    enum: ['skill', 'knowledge', 'competence', 'attitude']
  },
  reuseLevel: {
    type: String,
    enum: ['cross-sector', 'sector-specific', 'occupation-specific', 'transversal']
  },
  relatedSkills: [String],
  relatedOccupations: [String],
  lastUpdated: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

escoSkillSchema.index({ 'preferredLabel.en': 'text', 'description.en': 'text' });

const EscoSkill = mongoose.model('EscoSkill', escoSkillSchema);

export default EscoSkill;
