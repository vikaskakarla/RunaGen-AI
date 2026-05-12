// list-models.js
import axios from 'axios';

async function listModels() {
    try {
        const response = await axios.get('https://openrouter.ai/api/v1/models');
        const models = response.data.data;

        console.log('Found', models.length, 'models.');

        const deepseekModels = models.filter(m => m.id.includes('deepseek'));
        console.log('\nDeepSeek Models:');
        deepseekModels.forEach(m => console.log(`- ${m.id} (${m.pricing.prompt === '0' ? 'FREE' : 'PAID'})`));

        const geminiModels = models.filter(m => m.id.includes('gemini'));
        console.log('\nGemini Models:');
        geminiModels.slice(0, 10).forEach(m => console.log(`- ${m.id} (${m.pricing.prompt === '0' ? 'FREE' : 'PAID'})`));

    } catch (error) {
        console.error('Error fetching models:', error.message);
    }
}

listModels();
