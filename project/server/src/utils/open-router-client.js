import axios from 'axios';
// Module-level state for sticky fallback to persist across instances
let fallbackState = {
    useFallbackKey: false,
    useFallbackModel: false,
    timestamp: 0,
    cooldownMs: 10 * 60 * 1000 // 10 minutes
};

export class OpenRouterClient {
    constructor() {
        this.apiKey = process.env.OPENROUTER_API_KEY;
        this.fallbackApiKey = process.env.OPENROUTER_API_KEY2;
        this.primaryModel = process.env.OPENROUTER_MODEL_NAME || 'google/gemini-2.0-flash-exp:free';
        this.fallbackModel = process.env.OPENROUTER_MODEL_NAME2 || 'meta-llama/llama-3.1-8b-instruct:free';

        if (this.apiKey) {
            console.log('🚀 OpenRouterClient initialized (Super-Resilient Mode)');
            if (this.fallbackApiKey) {
                console.log('🛡️ Fallback API key detected.');
            }
        } else {
            console.warn('⚠️ OpenRouterClient: OPENROUTER_API_KEY is not set.');
        }
    }

    getGenerativeModel(config = {}) {
        // Use primary model if not specified in config
        const initialModel = config.model || this.primaryModel;

        return new OpenRouterModel(
            this.apiKey,
            initialModel,
            this.fallbackApiKey,
            this.fallbackModel
        );
    }
}

class OpenRouterModel {
    constructor(apiKey, model, fallbackApiKey, fallbackModel) {
        this.apiKey = apiKey;
        this.primaryModel = model;
        this.fallbackApiKey = fallbackApiKey;
        this.fallbackModel = fallbackModel;
    }

    async generateContent(request) {
        // Check if sticky fallback has expired
        const now = Date.now();
        if ((fallbackState.useFallbackKey || fallbackState.useFallbackModel) && (now - fallbackState.timestamp) > fallbackState.cooldownMs) {
            console.log('🔄 Sticky fallback expired. Reverting to PRIMARY configuration...');
            fallbackState.useFallbackKey = false;
            fallbackState.useFallbackModel = false;
        }

        const maxRetries = 3;
        let attempt = 0;

        while (attempt < maxRetries) {
            const activeApiKey = fallbackState.useFallbackKey ? this.fallbackApiKey : this.apiKey;
            // If primary model fails, we try fallback model. If that also fails, we eventually error out.
            const activeModel = fallbackState.useFallbackModel ? this.fallbackModel : this.primaryModel;

            if (!activeApiKey) {
                if (fallbackState.useFallbackKey) {
                    // If we were told to use fallback but don't have it, revert to primary and fail if that's missing too
                    fallbackState.useFallbackKey = false;
                    return this.generateContent(request);
                }
                throw new Error('OpenRouter API key is missing');
            }

            try {
                const modeLabel = (fallbackState.useFallbackKey ? 'KEY-FALLBACK' : 'PRIMARY') +
                    (fallbackState.useFallbackModel ? '+MODEL-FALLBACK' : '');

                if (attempt > 0) {
                    console.log(`OpenRouter: Retry ${attempt}/${maxRetries} [${modeLabel}] using ${activeModel}...`);
                } else {
                    console.log(`OpenRouter: Sending request [${modeLabel}] to ${activeModel}...`);
                }

                const payload = this.buildPayload(request, activeModel);

                const response = await axios.post(
                    'https://openrouter.ai/api/v1/chat/completions',
                    payload,
                    {
                        headers: {
                            'Authorization': `Bearer ${activeApiKey}`,
                            'HTTP-Referer': 'https://custom-code-prototype.com',
                            'X-Title': 'Custom Code Prototype',
                            'Content-Type': 'application/json',
                        },
                        timeout: 30000 // 30s timeout
                    }
                );

                return this.convertResponseToVertexFormat(response.data);
            } catch (error) {
                const errorMessage = error.response?.data?.error?.message || error.message;
                const statusCode = error.response?.status;

                // Enhanced transient error detection
                const isRateLimit = statusCode === 429 || errorMessage.includes('Rate limit') || errorMessage.includes('credits');
                const isProviderError = errorMessage.includes('Provider returned error') || statusCode === 502 || statusCode === 503 || statusCode === 504;
                const isTransient = isRateLimit || isProviderError;

                console.warn(`⚠️ OpenRouter Error (${fallbackState.useFallbackModel ? 'FALLBACK' : 'PRIMARY'} model): ${errorMessage}`);

                // STRATEGY:
                // 1. If Primary Key fails -> Switch to Fallback Key (Sticky)
                // 2. If Primary Model (Gemini) fails with Provider Error -> Switch to Fallback Model (DeepSeek) (Sticky)

                let changedState = false;

                if (isTransient) {
                    // If primary key failed, try fallback key
                    if (!fallbackState.useFallbackKey && this.fallbackApiKey) {
                        console.warn(`🚨 PRIMARY KEY failure. Switching to STICKY FALLBACK KEY...`);
                        fallbackState.useFallbackKey = true;
                        fallbackState.timestamp = Date.now();
                        changedState = true;
                    }
                    // If provider error (model issue), try fallback model
                    else if (!fallbackState.useFallbackModel && isProviderError && this.fallbackModel !== this.primaryModel) {
                        console.warn(`🚨 MODEL failure (${activeModel}). Switching to STICKY FALLBACK MODEL (${this.fallbackModel})...`);
                        fallbackState.useFallbackModel = true;
                        fallbackState.timestamp = Date.now();
                        changedState = true;
                    }
                }

                if (changedState) {
                    attempt = 0; // Reset attempts when config changes
                    continue;
                }

                if (isTransient && attempt < maxRetries - 1) {
                    const delay = (Math.pow(2, attempt) * 1000) + (Math.random() * 1000);
                    console.log(`⏳ Retrying ${activeModel} in ${delay.toFixed(0)}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    attempt++;
                    continue;
                }

                console.error(`❌ OpenRouter Final Error with model ${activeModel}:`, errorMessage);
                throw new Error(`OpenRouter API call failed after ${attempt + 1} attempts: ${errorMessage}`);
            }
        }
    }

    buildPayload(request, model) {
        const messages = this.convertContentsToMessages(request.contents);
        const payload = {
            model: model,
            messages: messages,
            temperature: request.generationConfig?.temperature || 0.7,
            max_tokens: request.generationConfig?.maxOutputTokens || 1024,
        };

        if (request.generationConfig?.responseMimeType === 'application/json') {
            payload.response_format = { type: "json_object" };
        }
        return payload;
    }

    convertContentsToMessages(contents) {
        // Handle both simple prompt cases and VertexAI multi-part format
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
        const content = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '';

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
                    promptTokenCount: data.usage?.prompt_tokens || 0,
                    candidatesTokenCount: data.usage?.completion_tokens || 0,
                    totalTokenCount: data.usage?.total_tokens || 0
                }
            }
        };
    }
}
