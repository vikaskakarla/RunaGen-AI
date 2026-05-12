import mongoose from 'mongoose';

const SimulationSchema = new mongoose.Schema(
  {
    userId: { type: String, index: true },
    analysisId: { type: String, index: true }, // Links to the resume analysis that created this
    targetRole: { type: String }, // Role from the resume (e.g., 'software-engineer')
    createdFrom: { type: String, enum: ['resume', 'manual'], default: 'manual' }, // Track creation source
    // Root-level fields for dashboard display
    title: { type: String, required: true },
    description: { type: String, required: true },
    difficulty: { type: String, required: true },
    skills: [{ type: String }],
    category: { type: String },
    youtube_videos: [{
      title: { type: String },
      topic: { type: String },
      url: { type: String },
      thumbnail: { type: String },
      duration: { type: String },
      views: { type: String },
      channelName: { type: String }
    }],
    modes: [{
      id: { type: String },
      name: { type: String },
      description: { type: String },
      type: { type: String },
      difficulty: { type: String },
      estimatedTime: { type: String },
      xpReward: { type: Number },
      unlocked: { type: Boolean, default: false },
      completed: { type: Boolean, default: false },
      icon: { type: String } // Stored as string name of icon
    }],
    simulation: {
      scenarios: [{
        id: { type: String, required: true },
        title: { type: String, required: true },
        description: { type: String, required: true },
        difficulty: { type: String, required: true },
        duration: { type: String, required: true },
        skills_tested: [{ type: String }],
        outcomes: [{ type: String }]
      }],
      interview_simulations: [{
        company: { type: String, required: true },
        role: { type: String, required: true },
        questions: [{
          question: { type: String, required: true },
          type: { type: String, required: true },
          expected_answer: { type: String, required: true },
          tips: [{ type: String }]
        }],
        difficulty: { type: String, required: true }
      }],
      skill_challenges: [{
        skill: { type: String, required: true },
        challenge_type: { type: String, required: true },
        description: { type: String, required: true },
        time_limit: { type: String, required: true },
        evaluation_criteria: [{ type: String }]
      }],
      projects: [{
        name: { type: String, required: true },
        description: { type: String, required: true },
        technologies: [{ type: String }],
        timeline: { type: String, required: true },
        deliverables: [{ type: String }]
      }],
      networking_opportunities: [{
        event: { type: String, required: true },
        type: { type: String, required: true },
        description: { type: String, required: true },
        networking_tips: [{ type: String }]
      }],
      salary_negotiation: {
        scenarios: [{
          situation: { type: String, required: true },
          current_salary: { type: String, required: true },
          target_salary: { type: String, required: true },
          negotiation_tips: [{ type: String }]
        }]
      }
    },
    estimated_duration: { type: String, required: true },
    learning_objectives: [{ type: String }],
    model_used: { type: String, default: 'openrouter' },
    started_at: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'completed', 'paused'], default: 'active' },
    progress: {
      completed_scenarios: [{ type: String }],
      completed_interviews: [{ type: String }],
      completed_challenges: [{ type: String }],
      completed_projects: [{ type: String }],
      completed_modes: [{ type: String }],
      overall_progress: { type: Number, default: 0, min: 0, max: 100 }
    },
    notes: { type: String } // Persisted expert guide notes
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('Simulation', SimulationSchema);
