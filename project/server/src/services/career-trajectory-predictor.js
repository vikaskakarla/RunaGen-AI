import 'dotenv/config';
import { enhancedRAGAnalyzer } from './enhanced-rag-service.js';
import { safeJsonParse } from '../utils/ai-helpers.js';

// 🎯 HACKATHON FEATURE: AI Career Trajectory Prediction
export class CareerTrajectoryPredictor {
  constructor() {
    this.isConfigured = false;
    this.initializeAI();
  }

  async initializeAI() {
    try {
      console.log('🤖 Career Trajectory: Initializing Unified AI Client (Ollama → OpenRouter)...');
      const { UnifiedAIClient } = await import('../utils/unified-ai-client.js');
      this.vertexAI = new UnifiedAIClient();
      this.generativeModel = this.vertexAI.getGenerativeModel();
      this.isConfigured = true;
    } catch (e) {
      console.error('❌ Career Trajectory: AI initialization failed:', e.message);
      throw e;
    }
  }

  // Predict career trajectory based on current skills and market trends
  async predictCareerTrajectory(resumeData, targetRole, timeframe = '5-years') {
    // Validate inputs
    if (!resumeData || !targetRole) {
      throw new Error('Invalid input data for career trajectory prediction. Missing resumeData or targetRole.');
    }

    // If not configured, throw error
    if (!this.isConfigured) {
      throw new Error('Career trajectory predictor is not configured. OPENROUTER_API_KEY may be missing.');
    }

    try {
      // Use RAG analysis to get market insights
      let ragInsights = null;
      try {
        // Create a timeout promise for RAG analysis (8 seconds)
        const ragTimeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('RAG analysis timed out')), 8000)
        );

        const ragAnalysisPromise = enhancedRAGAnalyzer.analyzeResumeWithEnhancedRAG(
          `Skills: ${resumeData.skills?.join(', ') || 'N/A'}\nExperience: ${resumeData.experienceLevel || 'Entry Level'}\nCurrent Role: ${resumeData.currentRole || 'Not specified'}`,
          `Target Role: ${targetRole}`,
          targetRole
        );

        // Race between analysis and timeout
        const ragAnalysis = await Promise.race([ragAnalysisPromise, ragTimeoutPromise]);

        ragInsights = ragAnalysis;
        console.log('RAG analysis completed for career trajectory');
      } catch (ragError) {
        console.warn('RAG analysis skipped/failed (using standard prediction):', ragError.message);
      }

      const prompt = `Generate a career trajectory for a ${resumeData.experienceLevel || 'Entry Level'} professional targeting ${targetRole} over ${timeframe}.

PROFILE: Skills: ${resumeData.skills?.join(', ') || 'N/A'}, Current: ${resumeData.currentRole || 'Not specified'}

${ragInsights ? `MARKET DATA: Present: ${ragInsights.skills_present?.join(', ') || 'N/A'}, Missing: ${ragInsights.skills_missing?.join(', ') || 'N/A'}, Match: ${ragInsights.match_score || 0}%` : ''}

Return ONLY this JSON structure:
{
  "career_path": [
    {
      "year": 1,
      "role": "Junior Software Engineer",
      "skills_to_develop": ["Docker", "Kubernetes", "System Design"],
      "expected_salary_range": "$70,000 - $85,000",
      "probability": 85,
      "key_milestones": ["Complete certification", "Lead small project"],
      "market_demand": "High"
    }
  ],
  "alternative_paths": [
    {
      "path_name": "Technical Leadership Track",
      "roles": ["Senior Engineer", "Tech Lead", "Engineering Manager"],
      "timeline": "3-5 years",
      "success_probability": 70
    }
  ],
  "skill_evolution": {
    "technical_skills": ["Advanced React", "Cloud Architecture", "AI/ML"],
    "soft_skills": ["Leadership", "Strategic Thinking", "Mentoring"],
    "emerging_skills": ["Generative AI", "Edge Computing", "Quantum Computing"]
  },
  "market_insights": [
    "AI/ML skills will be crucial in next 2 years",
    "Remote work capabilities increasingly important",
    "Cross-functional collaboration skills in high demand"
  ],
  "risk_factors": [
    "Technology obsolescence risk: Medium",
    "Market saturation risk: Low",
    "Economic downturn impact: Medium"
  ],
  "success_probability": 78,
  "recommended_actions": [
    "Focus on cloud technologies in year 1",
    "Build leadership experience through mentoring",
    "Stay updated with AI/ML trends"
  ]
}

Return only valid JSON.`;

      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI request timeout')), 120000)
      );

      const aiPromise = this.generativeModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096, // Reduced from 8192 for speed
          responseMimeType: 'application/json'
        }
      });

      const result = await Promise.race([aiPromise, timeoutPromise]);

      const response = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!response) {
        throw new Error('Empty response from AI model. Career trajectory prediction failed.');
      }

      const trajectory = safeJsonParse(response);

      if (!trajectory) {
        console.error('Failed to parse AI response. Raw response:', response.substring(0, 500));
        throw new Error('AI model returned invalid or malformed data. Prediction failed.');
      }

      return {
        ...trajectory,
        prediction_timestamp: new Date().toISOString(),
        model_used: this.model,
        success: true,
        rag_insights: ragInsights ? {
          skills_analysis: ragInsights.skills_present ? ragInsights.skills_present : [],
          missing_skills: ragInsights.skills_missing ? ragInsights.skills_missing : [],
          market_match_score: ragInsights.match_score || 0,
          external_sources_used: ragInsights.external_sources_used || 0
        } : null
      };

    } catch (error) {
      console.error('Career trajectory prediction failed:', error.message);
      throw error;
    }
  }

  // Generate salary predictions based on role and location
  async generateSalaryPredictions(role, location, experienceLevel) {
    try {
      const prompt = `Predict salary ranges for career progression in ${role} role.

CONTEXT:
Role: ${role}
Location: ${location}
Experience Level: ${experienceLevel}

Generate salary predictions in JSON format:
{
  "current_salary_range": {
    "min": 75000,
    "max": 95000,
    "currency": "USD",
    "confidence": 85
  },
  "salary_progression": [
    {
      "year": 1,
      "role_level": "Mid-level",
      "salary_range": {"min": 85000, "max": 105000},
      "growth_percentage": 12
    }
  ],
  "location_adjustments": {
    "san_francisco": {"multiplier": 1.4, "cost_of_living": "Very High"},
    "austin": {"multiplier": 1.1, "cost_of_living": "Medium"},
    "remote": {"multiplier": 0.9, "cost_of_living": "Variable"}
  },
  "negotiation_insights": [
    "Stock options can add 20-30% to total compensation",
    "Remote work flexibility valued at $5-10k equivalent"
  ]
}

Return only valid JSON.`;

      const result = await this.generativeModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json'
        }
      });

      const response = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const salaryData = safeJsonParse(response);

      if (!salaryData) {
        throw new Error('Salary prediction failed due to parsing error.');
      }

      return salaryData;

    } catch (error) {
      console.error('Salary prediction failed:', error.message);
      throw error;
    }
  }



}

export const careerTrajectoryPredictor = new CareerTrajectoryPredictor();