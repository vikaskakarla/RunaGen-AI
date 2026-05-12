import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { safeJsonParse } from '../utils/ai-helpers.js';

export class ResumeOptimizer {
  constructor() {
    this.isConfigured = false;
    this.initializeAI();
  }

  async initializeAI() {
    try {
      console.log('🤖 Resume Optimizer: Initializing Unified AI Client (Ollama → OpenRouter)...');
      const { UnifiedAIClient } = await import('../utils/unified-ai-client.js');
      this.vertexAI = new UnifiedAIClient();
      this.generativeModel = this.vertexAI.getGenerativeModel();
      this.isConfigured = true;
    } catch (e) {
      console.error('❌ Resume Optimizer: AI initialization failed:', e.message);
      throw e;
    }
  }

  // 🎯 HACKATHON FEATURE: AI Resume Optimization
  async optimizeResume(resumeText, targetRole, jobDescriptions = []) {
    if (!this.isConfigured) {
      throw new Error('Resume Optimizer AI not configured');
    }

    const prompt = `You are an expert resume optimizer and ATS specialist. Optimize this resume for the target role: ${targetRole}.
    
    ORIGINAL RESUME:
    ${resumeText}
    
    JOB CONTEXT:
    ${jobDescriptions.slice(0, 3).join('\n\n')}
    
    Return a JSON object with:
    {
      "optimized_resume": "...",
      "key_improvements": [ { "section": "...", "original": "...", "optimized": "...", "reason": "..." } ],
      "ats_score": number,
      "keyword_optimization": { "added_keywords": [], "keyword_density": "...", "missing_keywords": [] },
      "formatting_improvements": [],
      "achievement_enhancements": [],
      "skills_analysis": { "relevant_skills": [], "missing_critical_skills": [], "skill_match_score": number }
    }`;

    try {
      const result = await this.generativeModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4096, responseMimeType: 'application/json' }
      });
      const response = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const data = safeJsonParse(response);
      if (!data) throw new Error('Failed to parse resume optimization AI response');

      return {
        ...data,
        optimization_timestamp: new Date().toISOString(),
        success: true
      };
    } catch (error) {
      console.error('Resume optimization failed:', error.message);
      throw error;
    }
  }

  // Generate a customized cover letter
  async generateCoverLetter(resumeData, companyName, roleDescription) {
    if (!this.isConfigured) {
      throw new Error('Resume Optimizer AI not configured');
    }

    const prompt = `Generate a highly personalized cover letter.
    
    RESUME DATA: ${JSON.stringify(resumeData)}
    COMPANY: ${companyName}
    ROLE: ${roleDescription}
    
    Return JSON:
    {
      "cover_letter": "...",
      "key_highlights": [],
      "personalization_elements": [],
      "call_to_action": "..."
    }`;

    try {
      const result = await this.generativeModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 2048, responseMimeType: 'application/json' }
      });
      const response = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const data = safeJsonParse(response);
      if (!data) throw new Error('Failed to parse cover letter AI response');

      return {
        ...data,
        generation_timestamp: new Date().toISOString(),
        success: true
      };
    } catch (error) {
      console.error('Cover letter generation failed:', error.message);
      throw error;
    }
  }

  // Calculate ATS Score and provide analysis
  async calculateATSScore(resumeText, targetRole) {
    if (!this.isConfigured) {
      throw new Error('Resume Optimizer AI not configured');
    }

    const prompt = `Analyze this resume against the role: ${targetRole}.
    
    RESUME: ${resumeText}
    
    Return JSON:
    {
      "ats_score": number,
      "score_breakdown": { "keyword_match": number, "formatting": number, "section_structure": number, "readability": number },
      "keyword_analysis": { "matched_keywords": [], "missing_keywords": [], "keyword_density": "..." },
      "formatting_issues": [],
      "improvement_suggestions": [],
      "pass_probability": number
    }`;

    try {
      const result = await this.generativeModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1024, responseMimeType: 'application/json' }
      });
      const response = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const data = safeJsonParse(response);
      if (!data) throw new Error('Failed to parse ATS score AI response');

      return {
        ...data,
        analysis_timestamp: new Date().toISOString(),
        success: true
      };
    } catch (error) {
      console.error('ATS scoring failed:', error.message);
      throw error;
    }
  }

}

export const resumeOptimizer = new ResumeOptimizer();