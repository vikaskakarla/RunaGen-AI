import 'dotenv/config';
import mongoose from 'mongoose';
import axios from 'axios';
import Skill from '../models/Skill.js';

const ESCO_BASE_URL = 'https://ec.europa.eu/esco/api/search'; // Using search to get a list
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

async function fetchSkills(limit = 100) {
    try {
        console.log(`🔍 Fetching skills from ESCO...`);

        const response = await axios.get(ESCO_BASE_URL, {
            params: {
                language: 'en',
                type: 'skill',
                limit: limit
            }
        });

        const skills = response.data._embedded?.results || [];

        console.log(`✅ Successfully fetched ${skills.length} skills from ESCO`);

        for (const skill of skills) {
            const skillData = {
                skillId: skill.uri,
                skillName: skill.title,
                skillCategory: skill.className || 'General',
                description: skill.description || '',
                source: 'ESCO',
                extractedAt: new Date()
            };

            await Skill.findOneAndUpdate(
                { skillId: skill.uri },
                skillData,
                { upsert: true, new: true }
            );
        }

        console.log(`💾 Skills saved/updated in MongoDB`);
    } catch (err) {
        console.error('❌ Error fetching from ESCO:', err.message);
    }
}

async function run() {
    await connectDB();
    await fetchSkills(500);
    console.log('🏁 ESCO Skills collection complete');
    mongoose.connection.close();
}

run();
