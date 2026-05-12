import dotenv from 'dotenv';
dotenv.config();

import { OllamaClient } from './src/utils/ollama-client.js';

async function testOllama() {
    console.log('🧪 Testing Ollama Connection...\n');

    try {
        // Initialize Ollama client
        const ollamaClient = new OllamaClient();

        // Check if Ollama is available
        console.log('1️⃣ Checking Ollama availability...');
        const isAvailable = await ollamaClient.isAvailable();

        if (!isAvailable) {
            console.error('❌ Ollama is not available. Make sure Ollama is running.');
            console.log('\nTo start Ollama:');
            console.log('  1. Open a new terminal');
            console.log('  2. Run: ollama serve');
            console.log('  3. Or just run: ollama run deepseek-r1:7b');
            process.exit(1);
        }

        console.log('✅ Ollama is available!\n');

        // Test content generation
        console.log('2️⃣ Testing content generation...');
        const model = ollamaClient.getGenerativeModel();

        const testPrompt = 'Explain what a software engineer does in one sentence.';
        console.log(`Prompt: "${testPrompt}"\n`);

        const startTime = Date.now();
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: testPrompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 100 }
        });

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        const response = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;

        console.log('✅ Response received!\n');
        console.log('Response:', response);
        console.log(`\nTime taken: ${duration}s`);
        console.log('Tokens:', result?.response?.usageMetadata);

        console.log('\n🎉 Ollama test completed successfully!');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('Error details:', error);
        process.exit(1);
    }
}

testOllama();
