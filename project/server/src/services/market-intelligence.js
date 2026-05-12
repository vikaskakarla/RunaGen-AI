import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { safeJsonParse } from '../utils/ai-helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🎯 HACKATHON FEATURE: Real-Time Market Intelligence
export class MarketIntelligenceService {
  constructor() {
    this.isConfigured = false;
    this.initializeAI();
  }

  async initializeAI() {
    try {
      console.log('🤖 Market Intelligence: Initializing Unified AI Client (Ollama → OpenRouter)...');
      const { UnifiedAIClient } = await import('../utils/unified-ai-client.js');
      this.vertexAI = new UnifiedAIClient();
      this.generativeModel = this.vertexAI.getGenerativeModel();
      this.isConfigured = true;
    } catch (e) {
      console.error('❌ Market Intelligence: AI initialization failed:', e.message);
      throw e;
    }
  }

  // Get skill demand trends and predictions via AI
  async getSkillDemandTrends(skills) {
    if (!this.isConfigured) {
      throw new Error('Market Intelligence AI not configured');
    }

    const prompt = `Analyze current (2024-2025) market demand trends for these skills: ${skills.join(', ')}.
    Return a JSON object with:
    {
      "skill_trends": [
        { "skill": "Skill Name", "demand": 0-100, "growth": 0-100, "avgSalary": number, "trend": "rising/stable/hot/emerging" }
      ],
      "ai_insights": {
        "skill_insights": [ { "skill": "...", "market_position": "...", "future_outlook": "...", "learning_priority": "...", "complementary_skills": [] } ],
        "market_summary": { "hot_skills": [], "declining_skills": [], "emerging_skills": [], "skill_gaps": [] },
        "recommendations": []
      }
    }`;

    try {
      const result = await this.generativeModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2048, responseMimeType: 'application/json' }
      });
      const response = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const data = safeJsonParse(response);
      if (!data) throw new Error('Failed to parse skill trends AI response');

      return {
        ...data,
        market_timestamp: new Date().toISOString(),
        success: true
      };
    } catch (error) {
      console.error('Skill demand analysis failed:', error.message);
      throw error;
    }
  }

  // Get company hiring trends via AI
  async getCompanyHiringTrends(companies = []) {
    if (!this.isConfigured) {
      throw new Error('Market Intelligence AI not configured');
    }

    const prompt = `Analyze current tech hiring trends for these companies: ${companies.length > 0 ? companies.join(', ') : 'Top Tech Companies (Google, Microsoft, Amazon, Meta, etc.)'}.
    Return a JSON object with:
    {
      "company_trends": [
        { "company": "Company Name", "hiringRate": 0-100, "avgSalary": number, "openPositions": number, "trend": "active/aggressive/selective/stable" }
      ],
      "market_outlook": "General overview of the current tech hiring landscape"
    }`;

    try {
      const result = await this.generativeModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1024, responseMimeType: 'application/json' }
      });
      const response = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const data = safeJsonParse(response);
      if (!data) throw new Error('Failed to parse company trends AI response');

      return {
        ...data,
        market_timestamp: new Date().toISOString(),
        success: true
      };
    } catch (error) {
      console.error('Company hiring trends analysis failed:', error.message);
      throw error;
    }
  }

  // Get location market trends via AI
  async getLocationMarketTrends(locations = []) {
    if (!this.isConfigured) {
      throw new Error('Market Intelligence AI not configured');
    }

    const prompt = `Analyze market trends for these locations: ${locations.length > 0 ? locations.join(', ') : 'Major Tech Hubs'}.
    Return a JSON object with:
    {
      "location_trends": [
        { "location": "Location Name", "demandIndex": 0-100, "salaryMultiplier": number, "costOfLiving": number, "trend": "rising/stable/expensive/growing/hot" }
      ],
      "geographic_shifts": "Brief overview of geographic tech shifts"
    }`;

    try {
      const result = await this.generativeModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1024, responseMimeType: 'application/json' }
      });
      const response = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const data = safeJsonParse(response);
      if (!data) throw new Error('Failed to parse location trends AI response');

      return {
        ...data,
        market_timestamp: new Date().toISOString(),
        success: true
      };
    } catch (error) {
      console.error('Location market trends analysis failed:', error.message);
      throw error;
    }
  }

  // 🎯 HACKATHON FEATURE: Generate real-world job matches
  async generateJobMatches(role, skills) {
    if (!this.isConfigured) {
      throw new Error('Market Intelligence AI not configured');
    }

    console.log(`🤖 Generating AI job matches for role: ${role}...`);

    const prompt = `Act as a high-end Recruitment AI and Market Intelligence Specialist. Generate 5 HIGHLY REALISTIC and CURRENT (2024-2025) job openings for the role: ${role}.
    
    The candidate has these skills: ${skills.join(', ')}.

    STRICT GUIDELINES:
    1. TARGET COMPANIES: Major tech firms (e.g., Google, Microsoft, Amazon, Meta, NVIDIA) AND industry-specific leaders (e.g., Jane Street for Fintech, OpenAI for AI, Stripe for Payments, or top Indian startups like Zomato, Swiggy, Zerodha).
    2. REALISM: Titles and descriptions must reflect actual hiring patterns in 2024-2025 (e.g., emphasis on Generative AI, Cloud Native, scalable systems).
    3. LOCATIONS: Include major hubs like Bangalore, Hyderabad, SF Bay Area, London, or explicitly mention 'Remote'.
    4. SALARY: Provide accurate market-rate salary ranges in ₹ (LPA for India) or $ (for US/Global).
    5. URLS: Use ONLY official career site links (e.g., https://careers.google.com, https://amazon.jobs, https://www.microsoft.com/en-us/hr/careers). DO NOT provide generic search engine links (e.g. google.com/search) or third-party aggregators if an official portal exists. Use AI to predict the most likely career page URL for the company.

    Return a JSON object with:
    {
      "job_matches": [
        {
          "title": "Exact Job Title (e.g. Senior Software Engineer, Backend)",
          "company": "Company Name",
          "location": "City, Country or 'Remote'",
          "matchPercentage": number (0-100 logic-based score),
          "missingSkills": ["Specific missing skills for THIS job"],
          "strongPoints": ["Candidate's top matching skills"],
          "description": "Compelling 1-2 sentence overview focusing on why it's a match.",
          "salary": "Realistic range (e.g. ₹25L - ₹45L or $140k - $190k)",
          "url": "Official career link"
        }
      ]
    }`;

    try {
      const result = await this.generativeModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 2048, responseMimeType: 'application/json' }
      });
      const response = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const data = safeJsonParse(response);

      if (!data || !data.job_matches) {
        throw new Error('Failed to parse job matches AI response');
      }

      console.log(`✅ Successfully generated ${data.job_matches.length} AI job matches`);

      return {
        job_matches: data.job_matches,
        market_timestamp: new Date().toISOString(),
        success: true
      };
    } catch (error) {
      console.error('Job matches generation failed:', error.message);
      throw error;
    }
  }

  // Generate a comprehensive market intelligence report
  async generateMarketReport(userProfile) {
    if (!this.isConfigured) {
      throw new Error('Market Intelligence AI not configured');
    }

    try {
      const [skillTrends, companyTrends, locationTrends] = await Promise.all([
        this.getSkillDemandTrends(userProfile.skills || []),
        this.getCompanyHiringTrends([]),
        this.getLocationMarketTrends(['San Francisco', 'New York', 'Austin', 'Remote', 'London'])
      ]);

      return {
        user_profile: {
          name: userProfile.name,
          currentRole: userProfile.currentRole,
          experienceLevel: userProfile.experienceLevel
        },
        skill_analysis: skillTrends,
        company_insights: companyTrends,
        location_insights: locationTrends,
        market_summary: {
          overall_outlook: 'Dynamic growth with focus on AI and Cloud',
          report_timestamp: new Date().toISOString()
        },
        success: true
      };
    } catch (error) {
      console.error('Market report generation failed:', error.message);
      throw error;
    }
  }


}

export const marketIntelligenceService = new MarketIntelligenceService();