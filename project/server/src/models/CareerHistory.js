import mongoose from 'mongoose';

const careerHistorySchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    type: {
        type: String,
        required: true,
        enum: ['roadmap', 'trajectory', 'resume-optimizer', 'skill-roadmap'],
        index: true
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    analysisId: {
        type: String,
        index: true
    },
    metadata: {
        companyName: String,
        targetRole: String,
        skillsFocused: [String],
        duration: String
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index for efficient queries
careerHistorySchema.index({ userId: 1, createdAt: -1 });
careerHistorySchema.index({ userId: 1, type: 1, createdAt: -1 });

const CareerHistory = mongoose.model('CareerHistory', careerHistorySchema);

export default CareerHistory;
