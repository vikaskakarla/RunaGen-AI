import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from both root and server directories
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
// RAG-enhanced resume analysis with Gemini via OpenRouter
export class RAGResumeAnalyzer {
  constructor() {
    this.isConfigured = false;
    this.initializeAI();
    this.knowledgeBase = this.buildKnowledgeBase();
  }

  async initializeAI() {
    try {
      console.log('🤖 RAG Service: Initializing Unified AI Client (Ollama → OpenRouter)...');
      const { UnifiedAIClient } = await import('../utils/unified-ai-client.js');
      this.vertexAI = new UnifiedAIClient();
      this.generativeModel = this.vertexAI.getGenerativeModel();
      this.isConfigured = true;
    } catch (e) {
      console.error('❌ RAG Service: AI initialization failed:', e.message);
      throw e;
    }
  }

  // Build a knowledge base of industry standards, best practices, and role requirements
  buildKnowledgeBase() {
    return {
      'data-analyst': {
        skills: [
          'SQL', 'Python', 'R', 'Tableau', 'Power BI', 'Excel', 'Statistics',
          'Machine Learning', 'Data Visualization', 'ETL', 'BigQuery', 'Pandas',
          'NumPy', 'Matplotlib', 'Seaborn', 'Jupyter', 'Git', 'Docker'
        ],
        responsibilities: [
          'Data cleaning and preprocessing', 'Statistical analysis', 'Dashboard creation',
          'Report generation', 'Stakeholder communication', 'Data quality assurance',
          'A/B testing', 'Predictive modeling', 'Business intelligence'
        ],
        certifications: ['Google Analytics', 'Tableau Desktop Specialist', 'AWS Certified Data Analytics'],
        tools: ['Tableau', 'Power BI', 'Looker', 'Google Analytics', 'Mixpanel', 'Amplitude']
      },
      'data-engineer': {
        skills: [
          'Python', 'SQL', 'Spark', 'Airflow', 'Hadoop', 'Kafka', 'AWS', 'BigQuery',
          'Snowflake', 'Redshift', 'ETL', 'Data Modeling', 'NoSQL', 'Cassandra',
          'Docker', 'Kubernetes', 'CI/CD', 'Git'
        ],
        responsibilities: [
          'Building data pipelines', 'Data warehousing', 'Data modeling',
          'ETL/ELT process development', 'Database optimization', 'Data platform scaling',
          'Infrastructure management', 'Data governance', 'Performance tuning'
        ],
        certifications: ['AWS Certified Data Analytics', 'Google Cloud Professional Data Engineer', 'Databricks Certified Data Engineer'],
        tools: ['Apache Spark', 'Apache Airflow', 'Kafka', 'Docker', 'Kubernetes', 'Terraform']
      },
      'software-engineer': {
        skills: [
          'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java', 'C++',
          'Git', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'REST APIs',
          'GraphQL', 'Microservices', 'CI/CD', 'Testing', 'Agile', 'Scrum'
        ],
        responsibilities: [
          'Full-stack development', 'Code review', 'System design', 'API development',
          'Database design', 'Performance optimization', 'Security implementation',
          'DevOps practices', 'Technical documentation', 'Mentoring junior developers'
        ],
        certifications: ['AWS Certified Developer', 'Google Cloud Professional Developer', 'Microsoft Azure Developer'],
        tools: ['VS Code', 'IntelliJ', 'Postman', 'Jenkins', 'GitHub Actions', 'Docker', 'Kubernetes']
      },
      'product-manager': {
        skills: [
          'Product Strategy', 'User Research', 'Analytics', 'Roadmapping', 'SQL',
          'A/B Testing', 'Stakeholder Management', 'Agile', 'Scrum', 'Design Thinking',
          'Market Research', 'Competitive Analysis', 'Data Analysis', 'Communication'
        ],
        responsibilities: [
          'Product roadmap development', 'User story creation', 'Cross-functional collaboration',
          'Market research', 'Competitive analysis', 'Feature prioritization',
          'Stakeholder communication', 'Metrics definition', 'Go-to-market strategy'
        ],
        certifications: ['Google Analytics', 'Certified Scrum Product Owner', 'PMP'],
        tools: ['Jira', 'Confluence', 'Figma', 'Mixpanel', 'Google Analytics', 'Slack']
      },
      'ux-designer': {
        skills: [
          'Figma', 'Sketch', 'Adobe XD', 'Prototyping', 'User Research', 'Wireframing',
          'Usability Testing', 'Information Architecture', 'Interaction Design',
          'Visual Design', 'Design Systems', 'Accessibility', 'HTML/CSS', 'JavaScript'
        ],
        responsibilities: [
          'User research and interviews', 'Wireframe creation', 'Prototype development',
          'Usability testing', 'Design system maintenance', 'Stakeholder collaboration',
          'Accessibility compliance', 'Design documentation', 'User journey mapping'
        ],
        certifications: ['Google UX Design Certificate', 'Nielsen Norman Group UX Certification'],
        tools: ['Figma', 'Sketch', 'Adobe XD', 'InVision', 'Maze', 'Hotjar', 'UserTesting']
      }
    };
  }

  // Enhanced prompt with RAG context
  buildRAGPrompt(resumeText, jdText, role) {
    const knowledge = this.knowledgeBase[role] || {};

    return `You are an expert Recruitment AI and Career Strategist. Analyze the provided resume against the job description for the role of ${role.toUpperCase()}.

INDUSTRY STANDARDS FOR ${role.toUpperCase()} (2024-2025):
- Common Core Skills: ${knowledge.skills?.join(', ') || 'N/A'}
- Typical Responsibilities: ${knowledge.responsibilities?.join(', ') || 'N/A'}

TASK:
1. Identify all relevant skills present in the resume.
2. Cross-reference the resume with the specific Job Description (JD) provided.
3. Determine critical skill gaps based on the JD AND current market expectations for a ${role}. 
4. Provide a match score (0-100) reflecting how well the candidate fits the specific JD requirements.
5. Offer 3-5 high-impact, actionable recommendations to improve the resume or bridge key gaps.

RETURN ONLY a valid JSON object with these exact fields:
{
  "skills_present": ["skill1", "skill2", "..."],
  "skills_missing": ["critical_missing_skill1", "critical_missing_skill2", "..."],
  "match_score": number,
  "recommendations": ["actionable_advice1", "actionable_advice2", "..."],
  "strengths": ["specific_strength1", "specific_strength2"],
  "concerns": ["specific_concern1"],
  "industry_insights": ["market_trend_related_to_this_role", "hiring_insight"]
}

IMPORTANT: 
- Return ONLY the JSON object, no other text.
- Be critical and realistic based on the CURRENT (2024-2025) job market.
- If the JD is empty, use general industry standards for the role.

RESUME TEXT:
${resumeText.substring(0, 3000)}

JOB DESCRIPTION:
${jdText || 'N/A - Optimize for general market requirements for: ' + role}

JSON Response:`;
  }

  // Helper methods for extracting data when JSON parsing fails
  extractArrayFromText(text, fieldName) {
    const regex = new RegExp(`"${fieldName}"\\s*:\\s*\\[([^\\]]+)\\]`, 'i');
    const match = text.match(regex);
    if (match) {
      try {
        return JSON.parse(`[${match[1]}]`);
      } catch {
        // Fallback: extract items manually
        return match[1].split(',').map(item => item.trim().replace(/['"]/g, '')).filter(Boolean);
      }
    }
    return [];
  }

  extractNumberFromText(text, fieldName) {
    const regex = new RegExp(`"${fieldName}"\\s*:\\s*(\\d+)`, 'i');
    const match = text.match(regex);
    return match ? parseInt(match[1]) : null;
  }

  // Main RAG-enhanced analysis function
  async analyzeResumeWithRAG(resumeText, jdText, role) {
    try {
      // Ensure AI is initialized
      if (!this.generativeModel) {
        console.log('🤖 RAG Service: AI not yet fully initialized, waiting...');
        await this.initializeAI();
      }

      if (!this.generativeModel) {
        throw new Error('AI generative model could not be initialized');
      }

      console.log('Starting RAG-enhanced analysis...');
      if (!this.isConfigured) {
        return await this.analyzeResumeWithFallback(resumeText, jdText, role);
      }
      const prompt = this.buildRAGPrompt(resumeText, jdText, role);

      const result = await this.generativeModel.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }]
      });

      const text = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!text) {
        throw new Error('Empty response from Vertex AI');
      }

      // Extract JSON from response with better error handling
      let jsonStr = text.trim();

      // Try to find JSON object boundaries
      const firstBrace = jsonStr.indexOf('{');
      const lastBrace = jsonStr.lastIndexOf('}');

      if (firstBrace >= 0 && lastBrace > firstBrace) {
        jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
      }

      // Clean up common JSON issues
      jsonStr = jsonStr
        .replace(/,\s*}/g, '}')  // Remove trailing commas before }
        .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
        .replace(/'/g, '"')      // Replace single quotes with double quotes
        .replace(/(\w+):/g, '"$1":')  // Quote unquoted keys
        .replace(/:\s*([^",{\[\s][^",}\]\]]*?)([,}\]])/g, ': "$1"$2'); // Quote unquoted string values

      let analysis;
      try {
        analysis = JSON.parse(jsonStr);
      } catch (parseError) {
        console.warn('JSON parse failed, attempting to fix:', parseError.message);
        console.warn('Raw response:', text.substring(0, 500));

        // Try to extract individual fields as fallback
        const skillsPresent = this.extractArrayFromText(text, 'skills_present');
        const skillsMissing = this.extractArrayFromText(text, 'skills_missing');
        const matchScore = this.extractNumberFromText(text, 'match_score');

        analysis = {
          skills_present: skillsPresent,
          skills_missing: skillsMissing,
          match_score: matchScore || 50,
          recommendations: this.extractArrayFromText(text, 'recommendations') || [
            'Add more specific technical skills',
            'Include quantifiable achievements',
            'Highlight relevant project experience'
          ],
          strengths: this.extractArrayFromText(text, 'strengths') || [],
          concerns: this.extractArrayFromText(text, 'concerns') || [],
          industry_insights: this.extractArrayFromText(text, 'industry_insights') || []
        };
      }

      // Add RAG metadata
      analysis.rag_enhanced = true;
      analysis.model_used = this.model;
      analysis.analysis_timestamp = new Date().toISOString();

      return analysis;

    } catch (error) {
      console.error('RAG analysis error:', error);
      return await this.analyzeResumeWithFallback(resumeText, jdText, role);
    }
  }

  // Fallback to simple analysis if RAG fails
  async analyzeResumeWithFallback(resumeText, jdText, role) {
    const knowledge = this.knowledgeBase[role] || {};
    const lower = resumeText.toLowerCase();

    const skills = knowledge.skills || [];
    const present = skills.filter(skill => lower.includes(skill.toLowerCase()));
    const missing = skills.filter(skill => !present.includes(skill));
    const score = Math.round((present.length / skills.length) * 100);

    return {
      skills_present: present,
      skills_missing: missing.slice(0, 5), // Top 5 missing skills
      match_score: score,
      recommendations: [
        'Highlight specific achievements with metrics and numbers',
        'Include relevant certifications and professional development',
        'Showcase projects that demonstrate key technical skills',
        'Add industry-specific keywords and terminology',
        'Include quantifiable results from previous roles'
      ],
      strengths: present.slice(0, 3),
      concerns: missing.slice(0, 2),
      industry_insights: [
        'Consider adding more technical depth to key skills',
        'Include recent industry trends and technologies'
      ],
      rag_enhanced: false,
      model_used: 'fallback',
      analysis_timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const ragAnalyzer = new RAGResumeAnalyzer();
