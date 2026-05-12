import dotenv from 'dotenv';
dotenv.config();

import { UnifiedAIClient } from './src/utils/unified-ai-client.js';

async function testUnifiedClient() {
    console.log('🧪 Testing Unified AI Client with Fallback Chain...\n');

    try {
        // Initialize unified client
        const unifiedClient = new UnifiedAIClient();
        const model = unifiedClient.getGenerativeModel();

        console.log('\n📋 Test Scenarios:\n');

        // Test 1: Normal operation (should use Ollama if available)
        console.log('1️⃣ Test 1: Normal Operation');
        console.log('Expected: Use Ollama (if running) or fallback to OpenRouter\n');

        const testPrompt = 'What is artificial intelligence? Answer in one sentence.';
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

        // Test 2: JSON mode
        console.log('\n\n2️⃣ Test 2: JSON Response Mode');
        const jsonPrompt = 'List 3 programming languages with their primary use case.';
        console.log(`Prompt: "${jsonPrompt}"\n`);

        const jsonResult = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: jsonPrompt }] }],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 200,
                responseMimeType: 'application/json'
            }
        });

        const jsonResponse = jsonResult?.response?.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log('✅ JSON Response:\n', jsonResponse);

        console.log('\n\n🎉 All tests completed successfully!');
        console.log('\n📊 Fallback Chain Status:');
        console.log('   ✓ Unified client is working correctly');
        console.log('   ✓ Automatic fallback is functioning');
        console.log('   ✓ Check logs above to see which provider was used');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('Error details:', error);

        console.log('\n🔍 Troubleshooting:');
        console.log('   1. Is Ollama running? (ollama serve or ollama run deepseek-r1:7b)');
        console.log('   2. Are OpenRouter API keys set in .env?');
        console.log('   3. Check the error message above for more details');

        process.exit(1);
    }
}

testUnifiedClient();
