import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    simulationId: {
        type: String,
        required: true
    },
    simulationTitle: {
        type: String,
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    issueDate: {
        type: Date,
        default: Date.now
    },
    grade: {
        type: String,
        enum: ['A+', 'A', 'B+', 'B', 'PASS'],
        default: 'A'
    },
    skillsValidated: [String],
    certificateCode: {
        type: String,
        unique: true
    },
    metadata: {
        totalPoints: Number,
        completionTime: String,
        modesCompleted: [String]
    }
}, {
    timestamps: true
});

export default mongoose.model('Certificate', certificateSchema);
