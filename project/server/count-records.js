import 'dotenv/config';
import mongoose from 'mongoose';
import JobPosting from './src/models/JobPosting.js';
import Skill from './src/models/Skill.js';
import Occupation from './src/models/Occupation.js';

const MONGO_URI = process.env.MONGO_URI;
const MONGO_DB = process.env.MONGO_DB || 'career-companion';

async function run() {
    try {
        await mongoose.connect(MONGO_URI, { dbName: MONGO_DB });
        console.log('✅ Connected to MongoDB');

        const jobCount = await JobPosting.countDocuments();
        const skillCount = await Skill.countDocuments();
        const occupationCount = await Occupation.countDocuments();

        console.log('\n📊 DATABASE STATS:');
        console.log(`- Job Postings: ${jobCount}`);
        console.log(`- Skills: ${skillCount}`);
        console.log(`- Occupations: ${occupationCount}`);

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

run();
