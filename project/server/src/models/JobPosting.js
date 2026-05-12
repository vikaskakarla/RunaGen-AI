import mongoose from 'mongoose';

const jobPostingSchema = new mongoose.Schema({
    jobId: {
        type: String,
        unique: true,
        sparse: true
    },
    jobTitle: {
        type: String,
        required: true,
        trim: true
    },
    normalizedTitle: String,
    companyName: {
        type: String,
        required: true,
        trim: true
    },
    location: {
        type: String,
        required: true,
        trim: true
    },
    salaryMin: Number,
    salaryMax: Number,
    salaryCurrency: {
        type: String,
        default: 'INR'
    },
    description: String,
    requiredSkills: [String],
    experienceLevel: String,
    educationLevel: String,
    occupationCode: String,
    postedDate: Date,
    source: {
        type: String,
        enum: ['Adzuna', 'Manual', 'Other'],
        default: 'Adzuna'
    },
    extractedAt: {
        type: Date,
        default: Date.now
    }
});

// Indexing for faster search and analytics
jobPostingSchema.index({ jobTitle: 'text', companyName: 'text' });
jobPostingSchema.index({ location: 1 });
jobPostingSchema.index({ occupationCode: 1 });

const JobPosting = mongoose.model('JobPosting', jobPostingSchema);
export default JobPosting;
