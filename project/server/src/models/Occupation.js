import mongoose from 'mongoose';

const occupationSchema = new mongoose.Schema({
    occupationCode: {
        type: String,
        unique: true,
        required: true
    },
    occupationTitle: {
        type: String,
        required: true,
        trim: true
    },
    description: String,
    requiredSkills: [String],
    educationRequired: String,
    medianSalary: Number,
    growthRate: Number,
    source: {
        type: String,
        default: 'O*NET'
    },
    extractedAt: {
        type: Date,
        default: Date.now
    }
});

occupationSchema.index({ occupationTitle: 'text' });
occupationSchema.index({ occupationCode: 1 });

const Occupation = mongoose.model('Occupation', occupationSchema);
export default Occupation;
