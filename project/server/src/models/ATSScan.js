import mongoose from 'mongoose';

const atsScanSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    resumeText: {
        type: String,
        required: true
    },
    jobDescription: {
        type: String,
        required: true
    },
    targetRole: {
        type: String
    },
    atsScore: {
        type: Number,
        required: true
    },
    analysis: {
        type: Object, // Stores formatted analysis breakdown
        required: true
    },
    optimization: {
        type: Object // Stores optimization suggestions
    },
    scanDate: {
        type: Date,
        default: Date.now
    }
});

const ATSScan = mongoose.model('ATSScan', atsScanSchema);
export default ATSScan;
