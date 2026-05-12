import 'dotenv/config';
import mongoose from 'mongoose';
import JobPosting from './src/models/JobPosting.js';

const MONGO_URI = process.env.MONGO_URI;
const MONGO_DB = process.env.MONGO_DB || 'career-companion';

async function run() {
    try {
        await mongoose.connect(MONGO_URI, { dbName: MONGO_DB });
        console.log('✅ Connected to MongoDB');

        const jobs = await JobPosting.find().limit(5).lean();
        console.log('\n🔍 SAMPLE JOB DATA:');
        jobs.forEach((job, i) => {
            console.log(`\n--- Job ${i + 1} ---`);
            console.log(`Title: ${job.jobTitle}`);
            console.log(`Salary: ${job.salaryMin} - ${job.salaryMax}`);
            console.log(`Location: ${job.location}`);
            console.log(`Description Snippet: ${job.description.substring(0, 100)}...`);
        });

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

run();
