import mongoose from 'mongoose';

const AnalysisSchema = new mongoose.Schema(
  {
    userId: { type: String, index: true },
    target_role: { type: String, required: true },
    match_score: { type: Number, required: true },
    skills_present: { type: [String], default: [] },
    skills_missing: { type: [String], default: [] },
    recommendations: { type: [String], default: [] },
    strengths: { type: [String], default: [] },
    concerns: { type: [String], default: [] },
    industry_insights: { type: [String], default: [] },
    experience_level: { type: String, default: '—' },
    career_tracks: { type: [String], default: [] },
    job_matches: { type: [mongoose.Schema.Types.Mixed], default: [] }, // title, company, location, matchPercentage, missingSkills, strongPoints, description, salary, url

    // New persisted fields
    career_trajectory: { type: mongoose.Schema.Types.Mixed, default: null }, // Full career path object
    market_report: { type: mongoose.Schema.Types.Mixed, default: null }, // Market intelligence object
    salary_data: { type: mongoose.Schema.Types.Mixed, default: null }, // Salary predictions object

    // Consistency fields for skill gap analysis
    resumeHash: { type: String, index: true }, // Hash of resume text for deduplication
    companyName: { type: String }, // Company name from job description
    jobDescriptionHash: { type: String, index: true }, // Hash of job description for exact matching
    analysisKey: { type: String, unique: true, sparse: true }, // Composite key: resumeHash + jobDescriptionHash
    extractedRole: { type: String }, // Original role title extracted from JD
    jobDescriptionText: { type: String }, // Full JD text for reference (if provided)

    file_url: { type: String },
    rag_enhanced: { type: Boolean, default: false },
    model_used: { type: String }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('Analysis', AnalysisSchema);


