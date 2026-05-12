import { OpenRouterClient } from '../utils/open-router-client.js';

const client = new OpenRouterClient();
const model = client.getGenerativeModel({ responseMimeType: 'application/json' });

const extractJSON = (text) => {
    try {
        // 1. Try finding JSON object block
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
            return JSON.parse(match[0]);
        }
        // 2. Try cleaning code blocks if no direct match
        const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(clean);
    } catch (e) {
        console.error("JSON Parse Failed. Raw text:", text);
        throw e;
    }
};

export const quizService = {
    /**
     * Generates 5 technical/skill-based questions based on user background.
     */
    async generateQuiz(userProfile) {
        const prompt = `
      Generate 5 multiple-choice technical/skill-based questions to assess a user's knowledge.
      The user is a ${userProfile.experienceLevel} level ${userProfile.careerInterest} interested in ${userProfile.preferences?.industries?.join(', ') || 'technology'}.
      
      Output JSON strictly in this format:
      {
        "questions": [
          {
            "id": 1,
            "text": "Technical question text here?",
            "options": [
              { "label": "Option A", "value": "A" },
              { "label": "Option B", "value": "B" },
              { "label": "Option C", "value": "C" },
              { "label": "Option D", "value": "D" }
            ],
            "correctAnswer": "B", 
            "reasoning": "Explanation of why B is correct."
          }
        ]
      }
      
      CRITICAL: The correctAnswer MUST exactly match THE VALUE (e.g., "A", "B", "C", or "D") of one of the options. Do not include the label text or any other characters.
      Ensure questions are challenging but appropriate for the experience level.
      Keep content concise.
    `;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                maxOutputTokens: 4096,
                temperature: 0.7
            }
        });

        const responseText = result.response.candidates[0].content.parts[0].text;
        const json = extractJSON(responseText);
        return json.questions;
    },

    /**
     * Calculates score and generates a summary based on quiz performance.
     */
    async analyzeQuizResult(questions, userAnswers) {
        let correctCount = 0;
        const results = questions.map((q, index) => {
            // Frontend sends index as key, so we use index here
            const userAnswer = (userAnswers[index] || '').trim();
            const correctAnswer = (q.correctAnswer || '').trim();

            // Loose comparison to handle case/format inconsistencies from AI
            const isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase() ||
                userAnswer.toLowerCase() === `option ${correctAnswer.toLowerCase()}` ||
                `option ${userAnswer.toLowerCase()}` === correctAnswer.toLowerCase();

            if (isCorrect) correctCount++;
            return {
                id: q.id,
                text: q.text,
                userAnswer: userAnswers[index],
                correctAnswer: q.correctAnswer,
                isCorrect,
                reasoning: q.reasoning
            };
        });

        const score = Math.round((correctCount / questions.length) * 100);

        return {
            score,
            totalQuestions: questions.length,
            correctCount,
            results
        };
    }
};
