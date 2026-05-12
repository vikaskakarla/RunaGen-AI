import { OllamaClient } from './ollama-client.js';
import { OpenRouterClient } from './open-router-client.js';

/**
 * Unified AI Client with Intelligent Fallback Chain
 * Priority: Ollama (local) → OpenRouter Key 1 → OpenRouter Key 2
 */

// Module-level state for sticky fallback
let fallbackState = {
    currentProvider: 'ollama', // 'ollama', 'openrouter-primary', 'openrouter-secondary'
    timestamp: 0,
    cooldownMs: 10 * 60 * 1000 // 10 minutes
};

export class UnifiedAIClient {
    constructor() {
        // Initialize all providers
        this.ollamaClient = new OllamaClient();
        this.openRouterClient = new OpenRouterClient();

        // Check if providers are configured
        this.hasOllama = true; // Ollama is always available if installed
        this.hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
        this.hasOpenRouterFallback = !!process.env.OPENROUTER_API_KEY2;

        console.log('🌐 UnifiedAIClient initialized with fallback chain:');
        console.log(`   1. Ollama (Local) ${this.hasOllama ? '✓' : '✗'}`);
        console.log(`   2. OpenRouter Primary ${this.hasOpenRouter ? '✓' : '✗'}`);
        console.log(`   3. OpenRouter Secondary ${this.hasOpenRouterFallback ? '✓' : '✗'}`);
    }

    getGenerativeModel(config = {}) {
        return new UnifiedAIModel(
            this.ollamaClient,
            this.openRouterClient,
            this.hasOllama,
            this.hasOpenRouter,
            config
        );
    }
}

class UnifiedAIModel {
    constructor(ollamaClient, openRouterClient, hasOllama, hasOpenRouter, config) {
        this.ollamaClient = ollamaClient;
        this.openRouterClient = openRouterClient;
        this.hasOllama = hasOllama;
        this.hasOpenRouter = hasOpenRouter;
        this.config = config;
    }

    async generateContent(request) {
        // Check if sticky fallback has expired
        const now = Date.now();
        if (fallbackState.currentProvider !== 'ollama' &&
            (now - fallbackState.timestamp) > fallbackState.cooldownMs) {
            console.log('🔄 Sticky fallback expired. Reverting to Ollama...');
            fallbackState.currentProvider = 'ollama';
        }

        // Try providers in order based on current state
        const providers = this.getProviderOrder();

        for (let i = 0; i < providers.length; i++) {
            const provider = providers[i];

            try {
                console.log(`🎯 Attempting ${provider.name}...`);

                // For Ollama, check availability first
                if (provider.type === 'ollama') {
                    const isAvailable = await this.ollamaClient.isAvailable();
                    if (!isAvailable) {
                        console.warn('⚠️ Ollama is not available. Trying next provider...');
                        continue;
                    }
                }

                const model = provider.client.getGenerativeModel(this.config);
                const response = await model.generateContent(request);

                // Success! Update sticky fallback if we're not on primary
                if (provider.type !== 'ollama' && fallbackState.currentProvider !== provider.type) {
                    console.log(`✅ ${provider.name} succeeded. Setting as sticky fallback for 10 minutes.`);
                    fallbackState.currentProvider = provider.type;
                    fallbackState.timestamp = Date.now();
                }

                return response;

            } catch (error) {
                console.warn(`❌ ${provider.name} failed: ${error.message}`);

                // If this is the last provider, throw the error
                if (i === providers.length - 1) {
                    throw new Error(`All AI providers failed. Last error: ${error.message}`);
                }

                // Otherwise, continue to next provider
                console.log(`⏭️ Falling back to next provider...`);
            }
        }

        throw new Error('No AI providers available');
    }

    getProviderOrder() {
        const providers = [];

        // Start with current sticky provider if not ollama
        if (fallbackState.currentProvider === 'openrouter-primary' && this.hasOpenRouter) {
            providers.push({
                type: 'openrouter-primary',
                name: 'OpenRouter Primary',
                client: this.openRouterClient
            });
        } else if (fallbackState.currentProvider === 'openrouter-secondary' && this.hasOpenRouter) {
            providers.push({
                type: 'openrouter-secondary',
                name: 'OpenRouter Secondary',
                client: this.openRouterClient
            });
        }

        // Add Ollama as primary (unless we're already on a sticky fallback)
        if (this.hasOllama && fallbackState.currentProvider === 'ollama') {
            providers.push({
                type: 'ollama',
                name: 'Ollama (Local)',
                client: this.ollamaClient
            });
        }

        // Add OpenRouter as fallback
        if (this.hasOpenRouter) {
            // Only add if not already added as sticky
            if (fallbackState.currentProvider !== 'openrouter-primary') {
                providers.push({
                    type: 'openrouter-primary',
                    name: 'OpenRouter Primary',
                    client: this.openRouterClient
                });
            }
            if (fallbackState.currentProvider !== 'openrouter-secondary') {
                providers.push({
                    type: 'openrouter-secondary',
                    name: 'OpenRouter Secondary',
                    client: this.openRouterClient
                });
            }
        }

        // If Ollama wasn't added yet (because we're on sticky), add it as final fallback
        if (this.hasOllama && fallbackState.currentProvider !== 'ollama') {
            providers.push({
                type: 'ollama',
                name: 'Ollama (Local)',
                client: this.ollamaClient
            });
        }

        return providers;
    }
}
