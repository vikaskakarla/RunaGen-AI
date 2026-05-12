import mongoose from 'mongoose';

const coverLetterSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    resumeText: {
        type: String
    },
    jobDescription: {
        type: String,
        required: true
    },
    companyName: {
        type: String,
        required: true
    },
    targetRole: {
        type: String
    },
    generatedLetter: {
        type: Object, // Stores the full generated letter object
        required: true
    },
    generationDate: {
        type: Date,
        default: Date.now
    }
});

const CoverLetter = mongoose.model('CoverLetter', coverLetterSchema);
export default CoverLetter;
