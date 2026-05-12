import mongoose from 'mongoose';

const skillSchema = new mongoose.Schema({
    skillId: {
        type: String,
        unique: true,
        required: true
    },
    skillName: {
        type: String,
        required: true,
        trim: true
    },
    skillCategory: String,
    skillType: {
        type: String,
        enum: ['technical', 'soft', 'other'],
        default: 'technical'
    },
    description: String,
    relatedSkills: [String],
    source: {
        type: String,
        default: 'ESCO'
    },
    extractedAt: {
        type: Date,
        default: Date.now
    }
});

skillSchema.index({ skillName: 'text' });
skillSchema.index({ skillCategory: 1 });

const Skill = mongoose.model('Skill', skillSchema);
export default Skill;
