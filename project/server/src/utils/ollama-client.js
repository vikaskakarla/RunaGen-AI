import axios from 'axios';

/**
 * Ollama Client - Local AI model integration
 * Provides the same interface as OpenRouterClient for seamless integration
 */
export class OllamaClient {
    constructor() {
        this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        this.model = process.env.OLLAMA_MODEL_NAME || 'deepseek-r1:7b';

        console.log(`🤖 OllamaClient initialized (Local Mode)`);
        console.log(`   Base URL: ${this.baseUrl}`);
        console.log(`   Model: ${this.model}`);
    }

    /**
     * Check if Ollama is available and responsive
     */
    async isAvailable() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/tags`, {
                timeout: 5000 // Quick check (5s)
            });
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    getGenerativeModel(config = {}) {
        const model = config.model || this.model;
        return new OllamaModel(this.baseUrl, model);
    }
}

class OllamaModel {
    constructor(baseUrl, model) {
        this.baseUrl = baseUrl;
        this.model = model;
    }

    async generateContent(request) {
        try {
            console.log(`🤖 Ollama: Generating content with ${this.model}...`);

            const messages = this.convertContentsToMessages(request.contents);

            const payload = {
                model: this.model,
                messages: messages,
                stream: false,
                options: {
                    temperature: request.generationConfig?.temperature || 0.7,
                    num_predict: request.generationConfig?.maxOutputTokens || 512, // Reduced for faster responses
                }
            };

            // Add JSON mode if requested
            if (request.generationConfig?.responseMimeType === 'application/json') {
                payload.format = 'json';
            }

            const response = await axios.post(
                `${this.baseUrl}/api/chat`,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    timeout: 600000 // Increased to 600s (10 minutes) for complex operations
                }
            );

            return this.convertResponseToVertexFormat(response.data);
        } catch (error) {
            const errorMessage = error.response?.data?.error || error.message;
            console.error(`❌ Ollama Error: ${errorMessage}`);
            throw new Error(`Ollama API call failed: ${errorMessage}`);
        }
    }

    convertContentsToMessages(contents) {
        if (!contents || !Array.isArray(contents)) return [];

        return contents.map(content => {
            const textPart = content.parts ? content.parts.find(p => p.text) : null;
            return {
                role: content.role === 'model' ? 'assistant' : content.role || 'user',
                content: textPart ? textPart.text : (typeof content.text === 'string' ? content.text : '')
            };
        });
    }

    convertResponseToVertexFormat(data) {
        const content = data.message?.content || '';

        return {
            response: {
                candidates: [
                    {
                        content: {
                            parts: [
                                { text: content }
                            ]
                        }
                    }
                ],
                usageMetadata: {
                    promptTokenCount: data.prompt_eval_count || 0,
                    candidatesTokenCount: data.eval_count || 0,
                    totalTokenCount: (data.prompt_eval_count || 0) + (data.eval_count || 0)
                }
            }
        };
    }
}
