import mongoose from 'mongoose';

const simulationSessionSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    simulationId: {
        type: String,
        required: true,
        index: true
    },
    modeId: {
        type: String,
        required: true,
        enum: ['guided', 'challenge', 'project', 'peer']
    },
    messages: [{
        id: String,
        role: {
            type: String,
            enum: ['user', 'assistant', 'system']
        },
        content: String,
        timestamp: {
            type: Number,
            default: Date.now
        },
        suggestions: [String]
    }],
    currentStep: {
        type: Number,
        default: 1
    },
    totalSteps: {
        type: Number,
        default: 5
    },
    mission: String,
    points: {
        type: Number,
        default: 0
    },
    attempts: {
        type: Number,
        default: 1
    },
    guidedPlan: [{
        step: Number,
        title: String,
        instruction: String,
        mission_update: String,
        expected_output: String
    }],
    isCompleted: {
        type: Boolean,
        default: false
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound index to quickly find a specific session
simulationSessionSchema.index({ userId: 1, simulationId: 1, modeId: 1 }, { unique: true });

export default mongoose.model('SimulationSession', simulationSessionSchema);
