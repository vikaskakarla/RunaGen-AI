// test-openrouter.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { OpenRouterClient } from './src/utils/open-router-client.js';

async function testOpenRouter() {
    console.log('🧪 Testing OpenRouter Client...');

    if (!process.env.OPENROUTER_API_KEY) {
        console.error('❌ OPENROUTER_API_KEY not found in environment');
        process.exit(1);
    }

    const client = new OpenRouterClient();
    // Don't specify model, let it use the one from .env
    const model = client.getGenerativeModel();

    console.log(`Using model: ${model.model}`);

    try {
        const prompt = 'Explain what RunaGen AI Prototype is in one sentence.';
        console.log(`📤 Sending prompt: "${prompt}"`);

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 100
            }
        });

        const responseText = result.response.candidates[0].content.parts[0].text;
        console.log('✅ Response received:');
        console.log(responseText);

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testOpenRouter();
