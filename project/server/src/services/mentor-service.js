import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from both root and server directories
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { RAGResumeAnalyzer } from './rag-service.js';
import { enhancedRAGAnalyzer } from './enhanced-rag-service.js';
import YouTubeService from './youtube-service.js';
import { VectorStore } from '../../utils/vectorStore.js';
import { getEmbedding } from '../../utils/embeddings.js';
import MentorConversation from '../models/MentorConversation.js';
import UserInteraction from '../models/UserInteraction.js';
import { fileStorage } from '../utils/fileStorage.js';
// Redundant __filename / __dirname removed


export class MentorService {
  constructor() {
    this.isConfigured = false; // Initialize to false
    this.ragAnalyzer = new RAGResumeAnalyzer();
    this.enhancedRAG = enhancedRAGAnalyzer;
    this.vectorStore = new VectorStore();
    this.youtube = new YouTubeService();
    this.badgeRules = new Map();
    this.initializeBadgeRules();
    this.initializeAI();
  }

  async initializeAI() {
    try {
      console.log('🤖 MentorService: Initializing Unified AI Client (Ollama → OpenRouter)...');
      const { UnifiedAIClient } = await import('../utils/unified-ai-client.js');
      this.vertexAI = new UnifiedAIClient();
      this.generativeModel = this.vertexAI.getGenerativeModel();
      this.isConfigured = true;
    } catch (e) {
      console.error('❌ MentorService: AI initialization failed:', e.message);
      throw e;
    }
  }

  // Normalize actions to an array of objects
  normalizeActions(actions) {
    try {
      if (!actions) return [];
      // If actions is a string, try to parse JSON
      if (typeof actions === 'string') {
        const parsed = JSON.parse(actions);
        return Array.isArray(parsed) ? parsed : [parsed];
      }
      // If it's a single object, wrap in array
      if (!Array.isArray(actions)) {
        return [actions];
      }
      // If array elements are strings, try to parse each
      return actions.map(item => {
        if (typeof item === 'string') {
          try { return JSON.parse(item); } catch { return { note: item }; }
        }
        return item;
      });
    } catch {
      return [];
    }
  }

  // Ensure each action has a valid, user-friendly learn_link
  async ensureValidLearnLinks(actions) {
    try {
      const validated = [];
      for (const action of Array.isArray(actions) ? actions : []) {
        const actionCopy = { ...action };
        const link = actionCopy.learn_link || '';

        // Check if link looks valid (has proper URL structure)
        const isPlaceholder = typeof link === 'string' && /example\.com|localhost|127\.0\.0\.1|https:\/\/\.\.\.|https:\/\/\.\.\./i.test(link);
        const isNonEducational = typeof link === 'string' && /indeed\.com|linkedin\.com\/jobs/i.test(link);
        const looksValid = typeof link === 'string' && /^https?:\/\/.+/i.test(link) && !isPlaceholder && !isNonEducational;

        // If no valid link, create a YouTube search URL as fallback
        if (!looksValid) {
          const querySkill = actionCopy.skill || actionCopy.type || 'career planning';
          const query = `${querySkill} tutorial`;
          actionCopy.learn_link = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
          console.log(`📚 Generated fallback link for ${querySkill}: ${actionCopy.learn_link}`);
        } else {
          console.log(`✅ Using AI-generated link: ${actionCopy.learn_link}`);
        }

        validated.push(actionCopy);
      }
      return validated;
    } catch (error) {
      console.error('Error in ensureValidLearnLinks:', error);
      return Array.isArray(actions) ? actions : [];
    }
  }

  // Initialize badge rules engine
  initializeBadgeRules() {
    this.badgeRules.set('first_question', {
      condition: (events) => events.questions_asked >= 1,
      title: 'Curious Explorer',
      description: 'Asked your first question'
    });

    this.badgeRules.set('resume_analyzer', {
      condition: (events) => events.resume_analyses >= 1,
      title: 'Resume Analyzer',
      description: 'Completed resume analysis'
    });

    this.badgeRules.set('skill_explorer', {
      condition: (events) => events.skills_explored >= 3,
      title: 'Skill Explorer',
      description: 'Explored 3+ skills'
    });

    this.badgeRules.set('simulation_ace', {
      condition: (events) => events.simulation_score >= 80,
      title: 'Simulation Ace',
      description: 'Scored 80+ on a simulation'
    });

    this.badgeRules.set('career_pathfinder', {
      condition: (events) => events.career_paths_explored >= 2,
      title: 'Career Pathfinder',
      description: 'Explored 2+ career paths'
    });
  }

  // Context-aware intent classification
  async classifyIntent(message, conversationContext = [], previousIntent = 'general') {
    const lastExchanges = conversationContext.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n');
    const prompt = `
You are classifying the user's intent with conversation context. Allowed categories:
- resume_analysis, skill_suggestions, simulation, interview_prep, career_guidance, general

Rules:
- If the message is a follow-up (e.g., "give more resources", "continue", "what next"), keep the previous intent.
- If ambiguous, prefer the previous intent.
- Only switch when the new message clearly indicates a different category.

Previous intent: ${previousIntent}
Recent conversation:
${lastExchanges || '(none)'}

User message: "${message}"

Return only one category name from the list above.`;

    try {
      const result = await this.generativeModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 30 }
      });
      const response = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase();
      const validIntents = ['resume_analysis', 'skill_suggestions', 'simulation', 'interview_prep', 'career_guidance', 'general'];
      if (validIntents.includes(response)) return response;
      return previousIntent || 'general';
    } catch (error) {
      console.error('Intent classification failed:', error);
      return previousIntent || 'general';
    }
  }

  // Hybrid retrieval: BM25 + Vector search
  async hybridRetrieval(query, userId, topK = 10) {
    try {
      // 1. Vector similarity search
      const queryEmbedding = await getEmbedding(query);
      const vectorResults = await this.vectorStore.topK(queryEmbedding, topK * 2);

      // 2. BM25-style lexical search (simplified)
      const lexicalResults = await this.performLexicalSearch(query, topK * 2);

      // 3. Merge and deduplicate results
      const mergedResults = this.mergeSearchResults(vectorResults, lexicalResults);

      // 4. Re-rank using cross-encoder style scoring
      const rerankedResults = await this.rerankResults(query, mergedResults, topK);

      return rerankedResults;
    } catch (error) {
      console.error('Hybrid retrieval failed:', error);
      return [];
    }
  }

  // Simplified lexical search (can be enhanced with Elasticsearch)
  async performLexicalSearch(query, topK) {
    // This is a simplified implementation
    // In production, use Elasticsearch or similar
    const queryTerms = query.toLowerCase().split(/\s+/);
    const results = [];

    // Mock lexical search results
    // In real implementation, search your document index
    return results;
  }

  // Merge vector and lexical search results
  mergeSearchResults(vectorResults, lexicalResults) {
    const merged = new Map();

    // Add vector results with higher weight
    vectorResults.forEach((result, index) => {
      const key = result.item || result.docId;
      merged.set(key, {
        ...result,
        score: (result.score || 0) * 0.7, // Vector weight
        source: 'vector'
      });
    });

    // Add lexical results
    lexicalResults.forEach((result, index) => {
      const key = result.docId || result.item;
      if (merged.has(key)) {
        merged.get(key).score += (result.score || 0) * 0.3; // Lexical weight
        merged.get(key).source = 'hybrid';
      } else {
        merged.set(key, {
          ...result,
          score: (result.score || 0) * 0.3,
          source: 'lexical'
        });
      }
    });

    return Array.from(merged.values()).sort((a, b) => b.score - a.score);
  }

  // Cross-encoder style re-ranking
  async rerankResults(query, candidates, topK) {
    if (candidates.length === 0) return [];

    const prompt = `
You are a relevance rater. Rate each candidate document for relevance to the user query.

Query: "${query}"

Candidates:
${candidates.map((c, i) => `
INDEX: ${i}
DOC_ID: ${c.docId || c.item || 'unknown'}
TEXT: ${(c.text || c.item || '').substring(0, 400)}
METADATA: ${JSON.stringify(c.metadata || {})}
`).join('\n')}

For each candidate, return a line like: INDEX:${candidates.map((_, i) => i).join(',')} SCORE:0-100

Rate based on:
- Direct relevance to the query
- Quality and completeness of information
- Recency and authority of the source
- Specificity to the user's context

Return only the scores in the format above.
`;

    try {
      const result = await this.generativeModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 200 }
      });

      const response = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      const scores = this.parseRelevanceScores(response, candidates.length);

      // Apply scores and sort
      candidates.forEach((candidate, index) => {
        candidate.relevanceScore = scores[index] || 50;
      });

      return candidates
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, topK);

    } catch (error) {
      console.error('Re-ranking failed:', error);
      return candidates.slice(0, topK);
    }
  }

  // Parse relevance scores from model response
  parseRelevanceScores(response, candidateCount) {
    const scores = new Array(candidateCount).fill(50); // Default score

    try {
      const lines = response.split('\n');
      for (const line of lines) {
        if (line.includes('INDEX:') && line.includes('SCORE:')) {
          const indexMatch = line.match(/INDEX:(\d+)/);
          const scoreMatch = line.match(/SCORE:(\d+)/);

          if (indexMatch && scoreMatch) {
            const index = parseInt(indexMatch[1]);
            const score = parseInt(scoreMatch[1]);
            if (index >= 0 && index < candidateCount && score >= 0 && score <= 100) {
              scores[index] = score;
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to parse relevance scores:', error);
    }

    return scores;
  }

  // Generate structured mentor response
  async generateMentorResponse(userMessage, contextSnippets, intent, userProfile = {}) {
    const systemPrompt = this.buildSystemPrompt(intent, userProfile);
    const contextText = this.buildContextText(contextSnippets);
    const userPrompt = this.buildUserPrompt(userMessage, contextText, userProfile);

    try {
      const result = await this.generativeModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1200,
          responseMimeType: 'application/json'
        }
      });

      const response = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = this.parseStructuredResponse(response, contextSnippets);
      // Enrich links if actions present
      if (Array.isArray(parsed.actions) && parsed.actions.length > 0) {
        parsed.actions = await this.ensureValidLearnLinks(this.normalizeActions(parsed.actions));
      }
      return parsed;

    } catch (error) {
      console.error('Mentor response generation failed:', error);
      return this.getFallbackResponse(userMessage, contextSnippets);
    }
  }

  // Build system prompt based on intent
  buildSystemPrompt(intent, userProfile = {}) {
    const userName = userProfile.name || 'Friend';
    const basePrompt = `You are an expert AI Career Mentor. You are currently speaking with ${userName}. Address them by name naturally in your response when appropriate. Provide concise, actionable advice with specific next steps. Always return valid JSON in this exact schema:

{
  "reply_text": "Main response text (2-3 sentences)",
  "bullets": ["Key point 1", "Key point 2", "Key point 3"],
  "confidence": 85,
  "sources": [{"docId": "doc_123", "snippet": "Relevant text excerpt"}],
  "actions": [{"type": "suggest_skill", "skill": "Python", "why": "High demand", "learn_link": "https://www.youtube.com/watch?v=..."}],
  "badges": ["BadgeNameIfAny"]
}

CRITICAL - Confidence Scoring Guidelines:
- Only respond with 90%+ confidence when you have sufficient context
- If confidence < 90%, you MUST ask for clarification instead
- Score 90-95%: Good context, can provide solid advice
- Score 95-100%: Excellent context, highly specific and accurate advice
- Score < 90%: Insufficient information - ask for more details

CRITICAL - Source Citation Requirements:
- You MUST include at least 1-3 sources in EVERY response
- Sources must reference the provided context using docId
- Each source must include a relevant snippet (50-100 chars) from the context
- If you don't have context to cite, your confidence should be < 90%
- Never make up sources - only use what's provided in the context

CRITICAL - Learning Resources (learn_link):
- You MUST provide REAL, WORKING YouTube video links or educational resource URLs
- Use your knowledge of popular educational content to suggest specific videos
- Format: "https://www.youtube.com/watch?v=[VIDEO_ID]" or "https://www.youtube.com/playlist?list=[PLAYLIST_ID]"
- Examples of good resources:
  * For Python: "https://www.youtube.com/watch?v=rfscVS0vtbw" (freeCodeCamp Python course)
  * For React: "https://www.youtube.com/watch?v=Ke90Tje7VS0" (React tutorial)
  * For Data Science: "https://www.youtube.com/watch?v=ua-CiDNNj30" (Data Science course)
- You can also suggest:
  * Coursera courses: "https://www.coursera.org/learn/[course-name]"
  * Udemy courses: "https://www.udemy.com/course/[course-name]"
  * Official documentation: e.g., "https://docs.python.org/"
  * GitHub repositories: "https://github.com/[user]/[repo]"
- NEVER use placeholder links like "https://..." or "example.com"
- Provide 1-3 specific, actionable learning resources for each suggested skill

Guidelines:
- Be specific and actionable
- Provide 1-3 concrete next steps
- Only use provided context sources
- Confidence: 0-100 based on certainty and available context
- Actions: suggest skills, resources, or next steps with REAL learning links
- Badges: award based on user progress
- If you lack sufficient context for 90%+ confidence, set confidence to your actual level (it will trigger a clarification request)`;

    const intentSpecificPrompts = {
      resume_analysis: "Focus on skills gaps, strengths, and career alignment. Suggest specific improvements.",
      skill_suggestions: "Recommend relevant skills with learning paths and resources. Prioritize by demand and user goals.",
      simulation: "Provide coding challenges or data analysis tasks. Include difficulty levels and success criteria.",
      interview_prep: "Give practice questions, tips, and preparation strategies. Focus on behavioral and technical aspects.",
      career_guidance: "Offer industry insights, career paths, and strategic advice. Consider market trends and opportunities.",
      general: "Provide helpful career-related guidance. Be encouraging and supportive."
    };

    return `${basePrompt}\n\nContext: ${intentSpecificPrompts[intent] || intentSpecificPrompts.general}`;
  }

  // Build context text from retrieved snippets
  buildContextText(contextSnippets) {
    return contextSnippets.map((snippet, index) =>
      `SOURCE ${index + 1} (${snippet.docId || 'unknown'}):\n${(snippet.text || snippet.item || '').substring(0, 600)}`
    ).join('\n\n');
  }

  // Build user prompt with context
  buildUserPrompt(userMessage, contextText, userProfile) {
    return `
User Query: "${userMessage}"

User Profile: ${JSON.stringify(userProfile, null, 2)}

Retrieved Context:
${contextText}

Instructions:
1. Answer the user's question using the provided context
2. Be specific and actionable
3. **CRITICAL: You MUST cite sources using docId from context** - Include at least 1-3 sources in your response
4. For each source, include the docId and a relevant snippet (50-100 characters) from the context
5. Suggest relevant next actions
6. Award badges if user qualifies
7. Return only valid JSON in the specified schema
8. If you reference information from the context, you MUST include it in the sources array

Example sources format:
"sources": [
  {"docId": "resume:user123", "snippet": "5 years of Python experience with Django and Flask frameworks"},
  {"docId": "rag:1", "snippet": "Python developers in high demand, average salary $120k"}
]`;
  }

  // Parse structured response from model
  parseStructuredResponse(response, contextSnippets) {
    try {
      if (!response || typeof response !== 'string') {
        console.error('Invalid response type:', typeof response);
        return this.getFallbackResponse("", contextSnippets);
      }

      // Clean up response text
      let jsonStr = response.trim();

      // Remove markdown code fences if present
      jsonStr = jsonStr.replace(/```(?:json)?/gi, '').trim();

      // Extract JSON from response if wrapped in other text
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      // Try to fix common truncation issues before parsing
      jsonStr = this.attemptJsonRepair(jsonStr);

      // Parse JSON
      const parsed = JSON.parse(jsonStr);

      // Validate and clean up response
      return {
        reply_text: parsed.reply_text || "I'd be happy to help with your career questions!",
        bullets: Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 5) : [],
        confidence: Math.max(0, Math.min(100, parseInt(parsed.confidence) || 60)),
        sources: Array.isArray(parsed.sources) ? parsed.sources.slice(0, 3) : [],
        actions: Array.isArray(parsed.actions) ? parsed.actions.slice(0, 3) : [],
        badges: Array.isArray(parsed.badges) ? parsed.badges : []
      };

    } catch (error) {
      console.error('Failed to parse structured response:', error.message);
      console.error('Response preview:', response?.substring(0, 200));
      return this.getFallbackResponse("", contextSnippets);
    }
  }

  // Attempt to repair common JSON truncation issues
  attemptJsonRepair(jsonStr) {
    try {
      // Check if JSON is already valid
      JSON.parse(jsonStr);
      return jsonStr;
    } catch (e) {
      // Try to repair truncated JSON
      let repaired = jsonStr;

      // Close unclosed strings
      const quoteCount = (repaired.match(/"/g) || []).length;
      if (quoteCount % 2 !== 0) {
        repaired += '"';
      }

      // Close unclosed arrays
      const openBrackets = (repaired.match(/\[/g) || []).length;
      const closeBrackets = (repaired.match(/\]/g) || []).length;
      repaired += ']'.repeat(Math.max(0, openBrackets - closeBrackets));

      // Close unclosed objects
      const openBraces = (repaired.match(/\{/g) || []).length;
      const closeBraces = (repaired.match(/\}/g) || []).length;
      repaired += '}'.repeat(Math.max(0, openBraces - closeBraces));

      // Remove trailing commas before closing brackets/braces
      repaired = repaired.replace(/,(\s*[\]}])/g, '$1');

      return repaired;
    }
  }

  // Fallback response when parsing fails
  getFallbackResponse(userMessage, contextSnippets) {
    return {
      reply_text: "I'd be happy to help with your career questions! Could you provide more details about what you'd like to know?",
      bullets: [
        "I can help analyze your resume and skills",
        "I can suggest learning paths and resources",
        "I can provide career guidance and insights"
      ],
      confidence: 60,
      sources: contextSnippets.slice(0, 2).map(s => ({
        docId: s.docId || 'unknown',
        snippet: (s.text || s.item || '').substring(0, 200)
      })),
      actions: [],
      badges: []
    };
  }

  // Check and award badges based on user events
  async checkAndAwardBadges(userId, sessionEvents) {
    const newBadges = [];

    try {
      for (const [badgeId, rule] of this.badgeRules) {
        if (rule.condition(sessionEvents)) {
          // Check if user already has this badge
          const hasBadge = await this.checkUserBadge(userId, badgeId);
          if (!hasBadge) {
            await this.awardBadge(userId, badgeId, rule);
            newBadges.push(rule.title);
          }
        }
      }
    } catch (error) {
      console.error('Badge checking failed:', error);
    }

    return newBadges;
  }

  // Check if user already has a badge
  async checkUserBadge(userId, badgeId) {
    // Implement with your database
    // Return true if user already has this badge
    return false;
  }

  // Award badge to user
  async awardBadge(userId, badgeId, rule) {
    // Implement with your database
    console.log(`Awarding badge ${badgeId} to user ${userId}: ${rule.title}`);
  }

  // Save conversation to MongoDB or file storage
  async saveConversation(userId, sessionId, userMessage, assistantResponse, options = {}) {
    try {
      console.log('💾 Attempting to save conversation:', { userId, sessionId, userMessage: userMessage.substring(0, 50) + '...' });

      // Try MongoDB first
      try {
        // Find or create conversation
        let conversation = await MentorConversation.findOne({ sessionId });
        console.log('🔍 Found existing conversation:', !!conversation);

        if (!conversation) {
          console.log('📝 Creating new conversation document');
          conversation = new MentorConversation({
            userId,
            sessionId,
            messages: [],
            sessionMetadata: {
              startTime: new Date(),
              totalMessages: 0,
              userProfile: options.userProfile || {},
              resumeText: options.resumeText,
              jobDescription: options.jobDescription
            }
          });
        }

        // Add user message
        conversation.messages.push({
          role: 'user',
          content: userMessage,
          timestamp: new Date()
        });

        // Add assistant response
        conversation.messages.push({
          role: 'assistant',
          content: assistantResponse.reply_text,
          timestamp: new Date(),
          metadata: {
            intent: assistantResponse.intent,
            confidence: assistantResponse.confidence,
            processingTime: assistantResponse.processingTime,
            sources: assistantResponse.sources,
            actions: await this.ensureValidLearnLinks(this.normalizeActions(assistantResponse.actions)),
            badges: assistantResponse.badges
          }
        });

        // Update session metadata
        conversation.sessionMetadata.totalMessages = conversation.messages.length;
        conversation.sessionMetadata.endTime = new Date();

        await conversation.save();
        console.log('💾 Conversation saved to MongoDB Atlas successfully');

        // Save user interaction
        try {
          await this.saveUserInteraction(userId, sessionId, 'mentor_chat', userMessage, {
            intent: assistantResponse.intent,
            confidence: assistantResponse.confidence,
            processingTime: assistantResponse.processingTime,
            badgesEarned: assistantResponse.badges
          });
        } catch (interactionError) {
          console.warn('Failed to save user interaction:', interactionError.message);
        }

        return conversation;

      } catch (mongoError) {
        console.warn('⚠️ MongoDB save failed, falling back to file storage:', mongoError.message);
        console.error('MongoDB error details:', mongoError);

        // Fallback to file storage
        const conversationData = {
          userId,
          sessionId,
          messages: [],
          sessionMetadata: {
            startTime: new Date(),
            totalMessages: 0,
            userProfile: options.userProfile || {},
            resumeText: options.resumeText,
            jobDescription: options.jobDescription
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Add user message
        conversationData.messages.push({
          role: 'user',
          content: userMessage,
          timestamp: new Date()
        });

        // Add assistant response
        conversationData.messages.push({
          role: 'assistant',
          content: assistantResponse.reply_text,
          timestamp: new Date(),
          metadata: {
            intent: assistantResponse.intent,
            confidence: assistantResponse.confidence,
            processingTime: assistantResponse.processingTime,
            sources: assistantResponse.sources,
            actions: await this.ensureValidLearnLinks(this.normalizeActions(assistantResponse.actions)),
            badges: assistantResponse.badges
          }
        });

        // Update session metadata
        conversationData.sessionMetadata.totalMessages = conversationData.messages.length;
        conversationData.sessionMetadata.endTime = new Date();

        // Save to file storage
        await fileStorage.saveConversation(conversationData);
        console.log('💾 Conversation saved to file storage as fallback');

        return conversationData;
      }

    } catch (error) {
      console.error('❌ Failed to save conversation:', error);
      return null;
    }
  }

  // Save user interaction for analytics
  async saveUserInteraction(userId, sessionId, interactionType, action, details = {}) {
    try {
      const interaction = new UserInteraction({
        userId,
        sessionId,
        interactionType,
        action,
        details,
        metadata: {
          timestamp: new Date()
        }
      });

      await interaction.save();
      return interaction;
    } catch (error) {
      console.error('Failed to save user interaction:', error);
      return null;
    }
  }

  // Get recent conversations for a user
  async getRecentConversations(userId, limit = 10) {
    try {
      return await MentorConversation.getRecentConversations(userId, limit);
    } catch (error) {
      console.error('Failed to get recent conversations:', error);
      return [];
    }
  }

  // Migrate conversations from file storage to MongoDB
  async migrateFileStorageToMongoDB(userId) {
    try {
      console.log('🔄 Starting migration of file storage conversations to MongoDB for user:', userId);

      // Get conversations from file storage
      const fileConversations = await fileStorage.getRecentConversations(userId, 100);
      console.log(`📁 Found ${fileConversations.length} conversations in file storage`);

      let migratedCount = 0;
      let skippedCount = 0;

      for (const fileConv of fileConversations) {
        try {
          // Check if conversation already exists in MongoDB
          const existingConv = await MentorConversation.findOne({ sessionId: fileConv.sessionId });

          if (existingConv) {
            console.log(`⏭️ Skipping existing conversation: ${fileConv.sessionId}`);
            skippedCount++;
            continue;
          }

          // Create new MongoDB document
          const mongoConv = new MentorConversation({
            userId: fileConv.userId,
            sessionId: fileConv.sessionId,
            messages: fileConv.messages,
            sessionMetadata: fileConv.sessionMetadata,
            createdAt: fileConv.createdAt,
            updatedAt: fileConv.updatedAt
          });

          await mongoConv.save();
          console.log(`✅ Migrated conversation: ${fileConv.sessionId}`);
          migratedCount++;

        } catch (migrationError) {
          console.error(`❌ Failed to migrate conversation ${fileConv.sessionId}:`, migrationError.message);
        }
      }

      console.log(`🎉 Migration completed: ${migratedCount} migrated, ${skippedCount} skipped`);
      return { migrated: migratedCount, skipped: skippedCount };

    } catch (error) {
      console.error('❌ Migration failed:', error);
      return { migrated: 0, skipped: 0, error: error.message };
    }
  }

  // Get conversation by session ID
  async getConversationBySession(sessionId) {
    try {
      return await MentorConversation.getConversationBySession(sessionId);
    } catch (error) {
      console.error('Failed to get conversation by session:', error);
      return null;
    }
  }

  // Get user interaction history
  async getUserHistory(userId, days = 30) {
    try {
      return await UserInteraction.getUserInteractions(userId, 50);
    } catch (error) {
      console.error('Failed to get user history:', error);
      return [];
    }
  }

  // Get user statistics
  async getUserStats(userId) {
    try {
      const [conversationStats, interactionStats] = await Promise.all([
        MentorConversation.getUserStats(userId),
        UserInteraction.getInteractionAnalytics(userId, 30)
      ]);

      return {
        conversations: conversationStats[0] || {},
        interactions: interactionStats
      };
    } catch (error) {
      console.error('Failed to get user stats:', error);
      return { conversations: {}, interactions: [] };
    }
  }

  // Get conversation context for continuous memory
  async getConversationContext(userId, sessionId, limit = 10) {
    try {
      let conversation = null;
      if (sessionId) {
        conversation = await this.getConversationBySession(sessionId);
      }
      // Fallback: use user's most recent conversation if no session specified or not found
      if (!conversation) {
        try {
          const recent = await MentorConversation.find({ userId })
            .sort({ createdAt: -1 })
            .limit(1)
            .exec();
          conversation = recent?.[0] || null;
        } catch (_) {
          conversation = null;
        }
      }
      if (!conversation) return [];

      // Get recent messages for context
      const recentMessages = conversation.messages
        .slice(-limit)
        .map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          intent: msg.metadata?.intent,
          confidence: msg.metadata?.confidence
        }));

      return recentMessages;
    } catch (error) {
      console.error('Failed to get conversation context:', error);
      return [];
    }
  }

  // Enhanced file analysis with deeper insights
  async analyzeFileContent(fileContent, fileType, fileName, userId) {
    try {
      let analysisPrompt = '';

      switch (fileType.toLowerCase()) {
        case 'pdf':
          analysisPrompt = this.buildPDFAnalysisPrompt(fileContent, fileName);
          break;
        case 'docx':
        case 'doc':
          analysisPrompt = this.buildWordAnalysisPrompt(fileContent, fileName);
          break;
        case 'pptx':
        case 'ppt':
          analysisPrompt = this.buildPowerPointAnalysisPrompt(fileContent, fileName);
          break;
        case 'jpg':
        case 'jpeg':
        case 'png':
          analysisPrompt = this.buildImageAnalysisPrompt(fileContent, fileName);
          break;
        default:
          analysisPrompt = this.buildGenericFileAnalysisPrompt(fileContent, fileName);
      }

      const result = await this.generativeModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: analysisPrompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json'
        }
      });

      const response = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;
      return this.parseFileAnalysisResponse(response, fileType);

    } catch (error) {
      console.error('File analysis failed:', error);
      return this.getFileAnalysisFallback(fileType, fileName);
    }
  }

  // Build analysis prompts for different file types
  buildPDFAnalysisPrompt(content, fileName) {
    return `Analyze this PDF document for career insights and provide deep analysis:

FILE: ${fileName}
CONTENT: ${content.substring(0, 3000)}

Provide comprehensive analysis in JSON format:
{
  "document_type": "resume|portfolio|certificate|report|other",
  "key_skills": ["skill1", "skill2"],
  "experience_level": "entry|mid|senior|executive",
  "industry_focus": ["industry1", "industry2"],
  "strengths": ["strength1", "strength2"],
  "improvement_areas": ["area1", "area2"],
  "career_insights": {
    "market_position": "description",
    "growth_potential": "high|medium|low",
    "salary_insights": "estimated range",
    "next_steps": ["step1", "step2"]
  },
  "detailed_feedback": {
    "content_quality": "assessment",
    "presentation": "assessment", 
    "completeness": "assessment",
    "recommendations": ["rec1", "rec2"]
  },
  "confidence_score": 85
}

Return only valid JSON.`;
  }

  buildWordAnalysisPrompt(content, fileName) {
    return `Analyze this Word document for professional content and career insights:

FILE: ${fileName}
CONTENT: ${content.substring(0, 3000)}

Provide detailed analysis in JSON format:
{
  "document_purpose": "resume|cover_letter|proposal|report|other",
  "professional_highlights": ["highlight1", "highlight2"],
  "writing_quality": "assessment",
  "structure_analysis": "assessment",
  "career_relevance": "assessment",
  "improvement_suggestions": ["suggestion1", "suggestion2"],
  "market_alignment": "how well it aligns with market needs",
  "confidence_score": 85
}

Return only valid JSON.`;
  }

  buildPowerPointAnalysisPrompt(content, fileName) {
    return `Analyze this PowerPoint presentation for professional content and presentation quality:

FILE: ${fileName}
CONTENT: ${content.substring(0, 3000)}

Provide comprehensive analysis in JSON format:
{
  "presentation_type": "portfolio|business|educational|other",
  "slide_count": "estimated",
  "content_quality": "assessment",
  "visual_design": "assessment",
  "professional_impact": "assessment",
  "key_achievements": ["achievement1", "achievement2"],
  "presentation_skills": "assessment",
  "improvement_areas": ["area1", "area2"],
  "career_insights": {
    "communication_skills": "assessment",
    "project_management": "assessment",
    "technical_competency": "assessment"
  },
  "confidence_score": 85
}

Return only valid JSON.`;
  }

  buildImageAnalysisPrompt(content, fileName) {
    return `Analyze this image for professional content and career insights:

FILE: ${fileName}
CONTENT: [Image data - ${content.length} characters]

Provide detailed analysis in JSON format:
{
  "image_type": "resume|certificate|diagram|chart|other",
  "professional_content": "description",
  "visual_quality": "assessment",
  "content_relevance": "assessment",
  "career_insights": {
    "skills_demonstrated": ["skill1", "skill2"],
    "achievement_level": "assessment",
    "professional_presentation": "assessment"
  },
  "recommendations": ["rec1", "rec2"],
  "confidence_score": 85
}

Return only valid JSON.`;
  }

  buildGenericFileAnalysisPrompt(content, fileName) {
    return `Analyze this file for professional content and career insights:

FILE: ${fileName}
CONTENT: ${content.substring(0, 2000)}

Provide analysis in JSON format:
{
  "file_purpose": "description",
  "professional_relevance": "assessment",
  "content_quality": "assessment",
  "career_insights": "key insights",
  "recommendations": ["rec1", "rec2"],
  "confidence_score": 85
}

Return only valid JSON.`;
  }

  // Parse file analysis response
  parseFileAnalysisResponse(response, fileType) {
    try {
      const parsed = JSON.parse(response);
      return {
        ...parsed,
        fileType,
        analysisTimestamp: new Date().toISOString(),
        enhanced: true
      };
    } catch (error) {
      console.error('Failed to parse file analysis:', error);
      return this.getFileAnalysisFallback(fileType, 'unknown');
    }
  }

  // Fallback for file analysis
  getFileAnalysisFallback(fileType, fileName) {
    return {
      document_type: 'unknown',
      key_skills: [],
      experience_level: 'unknown',
      industry_focus: [],
      strengths: [],
      improvement_areas: [],
      career_insights: {
        market_position: 'Unable to analyze',
        growth_potential: 'unknown',
        salary_insights: 'Unable to determine',
        next_steps: ['Upload a more readable file format']
      },
      detailed_feedback: {
        content_quality: 'Unable to assess',
        presentation: 'Unable to assess',
        completeness: 'Unable to assess',
        recommendations: ['Try uploading a PDF or text file']
      },
      confidence_score: 30,
      fileType,
      analysisTimestamp: new Date().toISOString(),
      enhanced: false
    };
  }

  // Main mentor endpoint logic with enhanced memory
  async processMentorRequest(userId, sessionId, message, options = {}) {
    const startTime = Date.now();

    try {
      // Determine a sessionId to ensure continuity
      let resolvedSessionId = sessionId;
      if (!resolvedSessionId || typeof resolvedSessionId !== 'string') {
        // Try to reuse the latest session if it exists and is recent
        try {
          const recent = await MentorConversation.find({ userId })
            .sort({ createdAt: -1 })
            .limit(1)
            .exec();
          if (recent && recent.length > 0) {
            resolvedSessionId = recent[0].sessionId;
          }
        } catch (_) { }
      }
      if (!resolvedSessionId) {
        resolvedSessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      }
      // Use resolved session for the rest of the request
      sessionId = resolvedSessionId;
      options.sessionId = resolvedSessionId;

      // 1. Get conversation context for continuous memory
      const conversationContext = await this.getConversationContext(userId, sessionId, 8);

      // 2. Classify intent with context awareness, biasing to previous intent if ambiguous
      const previousIntent = conversationContext.reverse().find(m => m.role === 'assistant' && m.intent)?.intent || 'general';
      const intent = await this.classifyIntent(message, conversationContext, previousIntent);

      // 3. Gather context including conversation history
      const contextSnippets = [];

      // Add conversation context for memory
      if (conversationContext.length > 0) {
        const contextSummary = conversationContext
          .slice(-3) // Last 3 messages for context
          .map(msg => `${msg.role}: ${msg.content}`)
          .join('\n');

        contextSnippets.push({
          docId: `conversation:${sessionId}`,
          text: `Previous conversation context:\n${contextSummary}`,
          metadata: { type: 'conversation_history', sessionId, userId }
        });
      }

      // Add resume context if available
      if (options.resumeText) {
        contextSnippets.push({
          docId: `resume:${userId}`,
          text: options.resumeText,
          metadata: { type: 'resume', userId }
        });
      }

      // Add job description context if available
      if (options.jobDescription) {
        contextSnippets.push({
          docId: `job:${Date.now()}`,
          text: options.jobDescription,
          metadata: { type: 'job_description', userId }
        });
      }

      // Add file analysis context if available
      if (options.fileAnalysis) {
        contextSnippets.push({
          docId: `file_analysis:${Date.now()}`,
          text: `File Analysis Results:\n${JSON.stringify(options.fileAnalysis, null, 2)}`,
          metadata: { type: 'file_analysis', userId }
        });
      }

      // 4. Enhanced RAG retrieval for additional context
      try {
        const resumeText = options.resumeText || '';
        const jdText = options.jobDescription || '';
        const role = (options.userProfile && options.userProfile.targetRole) || 'data-analyst';
        const ragResult = await this.enhancedRAG.analyzeResumeWithEnhancedRAG(resumeText, jdText, role);
        // Use retrieved passages from enhanced RAG as grounded context
        if (Array.isArray(ragResult.retrieved_passages)) {
          ragResult.retrieved_passages.forEach((p, idx) => {
            contextSnippets.push({
              docId: `rag:${idx + 1}`,
              text: `${p.text}`,
              metadata: { type: 'enhanced_rag', source: p.publisher, date: p.date }
            });
          });
        }
        // Also add summarized skills info for mentor grounding
        contextSnippets.push({
          docId: 'rag:summary',
          text: `RAG summary\nSkills Present: ${(ragResult.skills_present || []).join(', ')}\nSkills Missing: ${(ragResult.skills_missing || []).join(', ')}`,
          metadata: { type: 'rag_summary' }
        });
      } catch (ragErr) {
        console.warn('Enhanced RAG context fetch failed, falling back to hybrid retrieval:', ragErr.message);
        const searchQuery = options.jobDescription || message;
        const retrievedContext = await this.hybridRetrieval(searchQuery, userId, 5);
        contextSnippets.push(...retrievedContext);
      }

      // 5. Generate structured response with enhanced context
      const userProfile = {
        ...options.userProfile,
        conversationHistory: conversationContext.length,
        sessionDuration: this.calculateSessionDuration(conversationContext)
      };

      const response = await this.generateMentorResponse(
        message,
        contextSnippets,
        intent,
        userProfile
      );

      // Check confidence threshold - require 80% or higher (lowered from 90% for testing)
      const MIN_CONFIDENCE_THRESHOLD = 80;
      if (response.confidence < MIN_CONFIDENCE_THRESHOLD) {
        console.log(`⚠️ Low confidence (${response.confidence}%) - requesting clarification`);
        return {
          reply_text: "I want to make sure I give you the most accurate advice possible. Could you provide more details about your question? For example, you could share:\n\n• Your current career level and goals\n• Specific skills you're interested in\n• The type of guidance you're looking for (resume, career path, skills, etc.)\n\nThis will help me provide you with more precise and helpful recommendations.",
          bullets: [
            "Share more context about your background",
            "Specify what aspect of your career you need help with",
            "Include any relevant details about your goals or challenges"
          ],
          confidence: response.confidence,
          sources: [],
          actions: [],
          badges: [],
          needsMoreInfo: true,
          originalConfidence: response.confidence,
          processingTime: Date.now() - startTime,
          intent,
          sessionId,
          conversationContext: conversationContext.length
        };
      }

      // 6. Check for badge awards
      const sessionEvents = {
        questions_asked: conversationContext.filter(m => m.role === 'user').length + 1,
        resume_analyses: options.resumeText ? 1 : 0,
        skills_explored: this.extractSkillsFromMessage(message),
        simulation_score: options.simulationScore || 0,
        career_paths_explored: this.extractCareerPathsFromMessage(message),
        files_analyzed: options.fileAnalysis ? 1 : 0
      };

      const newBadges = await this.checkAndAwardBadges(userId, sessionEvents);
      response.badges = [...response.badges, ...newBadges];

      // 7. Save conversation to MongoDB with enhanced metadata
      const processingTime = Date.now() - startTime;
      response.processingTime = processingTime;
      response.intent = intent;
      response.sessionId = sessionId;
      response.conversationContext = conversationContext.length;

      // Save to database
      console.log('🔄 About to save conversation to database...');
      const saveResult = await this.saveConversation(userId, sessionId, message, response, options);
      console.log('💾 Save result:', saveResult ? 'Success' : 'Failed');

      // 8. Log metrics
      console.log(`Enhanced mentor request processed: user=${userId}, intent=${intent}, context=${conversationContext.length}, time=${processingTime}ms`);

      // Include resolved sessionId so client can continue the thread
      return { ...response, sessionId: resolvedSessionId, intent };

    } catch (error) {
      console.error('Enhanced mentor request processing failed:', error);
      return this.getFallbackResponse(message, []);
    }
  }

  // Calculate session duration from conversation history
  calculateSessionDuration(conversationContext) {
    if (conversationContext.length < 2) return 0;

    const firstMessage = conversationContext[0];
    const lastMessage = conversationContext[conversationContext.length - 1];

    const startTime = new Date(firstMessage.timestamp);
    const endTime = new Date(lastMessage.timestamp);

    return Math.round((endTime - startTime) / 1000 / 60); // minutes
  }

  // Extract skills mentioned in message
  extractSkillsFromMessage(message) {
    const skillKeywords = ['python', 'javascript', 'react', 'sql', 'aws', 'docker', 'kubernetes', 'machine learning', 'data analysis'];
    const lowerMessage = message.toLowerCase();
    return skillKeywords.filter(skill => lowerMessage.includes(skill)).length;
  }

  // Extract career paths mentioned in message
  extractCareerPathsFromMessage(message) {
    const careerKeywords = ['data analyst', 'software engineer', 'product manager', 'ux designer', 'data scientist', 'devops'];
    const lowerMessage = message.toLowerCase();
    return careerKeywords.filter(career => lowerMessage.includes(career)).length;
  }
}

export default MentorService;
