import mongoose from 'mongoose';

const escoOccupationSchema = new mongoose.Schema({
  uri: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  code: String,
  iscoGroup: String,
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
  scopeNote: {
    en: String
  },
  regulatedProfessionNote: String,
  essentialSkills: [String],
  optionalSkills: [String],
  relatedOccupations: [String],
  lastUpdated: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

escoOccupationSchema.index({ 'preferredLabel.en': 'text', 'description.en': 'text' });

const EscoOccupation = mongoose.model('EscoOccupation', escoOccupationSchema);

export default EscoOccupation;
