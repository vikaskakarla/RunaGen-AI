import 'dotenv/config';
import mongoose from 'mongoose';
import axios from 'axios';
import Occupation from '../models/Occupation.js';

// O*NET Web Services Config
const ONET_USERNAME = process.env.ONET_USERNAME || 'YOUR_USERNAME';
const ONET_PASSWORD = process.env.ONET_PASSWORD || 'YOUR_PASSWORD';
const ONET_BASE_URL = 'https://services.onetcenter.org/ws/online/occupations';

const MONGO_URI = process.env.MONGO_URI;
const MONGO_DB = process.env.MONGO_DB || 'career-companion';

async function connectDB() {
    try {
        await mongoose.connect(MONGO_URI, { dbName: MONGO_DB });
        console.log('✅ Connected to MongoDB');
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err.message);
        process.exit(1);
    }
}

async function fetchOccupations(start = 1, end = 20) {
    try {
        console.log(`🔍 Fetching occupations from O*NET...`);

        if (ONET_USERNAME === 'YOUR_USERNAME' || ONET_PASSWORD === 'YOUR_PASSWORD') {
            console.warn('⚠️ Warning: Using placeholder O*NET credentials. Please update your .env file.');
            // Authenticated request would fail here, we are just implementing the structure
        }

        // O*NET uses Basic Auth
        const auth = Buffer.from(`${ONET_USERNAME}:${ONET_PASSWORD}`).toString('base64');

        const response = await axios.get(ONET_BASE_URL, {
            params: {
                start: start,
                end: end
            },
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json'
            }
        });

        const occupations = response.data.occupation || [];
        console.log(`✅ Successfully fetched ${occupations.length} occupations from O*NET`);

        for (const occ of occupations) {
            // For each occupation, we would typically fetch more details (skills, salary, etc.)
            // For now, we save the basic info
            const occupationData = {
                occupationCode: occ.code,
                occupationTitle: occ.title,
                description: occ.description || '',
                source: 'O*NET',
                extractedAt: new Date()
            };

            await Occupation.findOneAndUpdate(
                { occupationCode: occ.code },
                occupationData,
                { upsert: true, new: true }
            );
        }

        console.log(`💾 Occupation data saved/updated in MongoDB`);
    } catch (err) {
        console.error('❌ Error fetching from O*NET:', err.response?.data || err.message);
    }
}

async function run() {
    await connectDB();
    await fetchOccupations(1, 10);
    console.log('🏁 O*NET Occupation collection complete');
    mongoose.connection.close();
}

run();
