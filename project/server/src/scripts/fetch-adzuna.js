import 'dotenv/config';
import mongoose from 'mongoose';
import axios from 'axios';
import JobPosting from '../models/JobPosting.js';

// Adzuna API Config
const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID || 'YOUR_APP_ID';
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY || 'YOUR_APP_KEY';
const ADZUNA_BASE_URL = 'https://api.adzuna.com/v1/api/jobs/in/search/1'; // Switched to 'in' for India

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

async function fetchJobs(query = 'data scientist', resultsPerPage = 10) {
    try {
        console.log(`🔍 Fetching jobs for: ${query}...`);

        if (ADZUNA_APP_ID === 'YOUR_APP_ID' || ADZUNA_APP_KEY === 'YOUR_APP_KEY') {
            console.warn('⚠️ Warning: Using placeholder Adzuna API keys. Please update your .env file.');
            // If keys are placeholders, we might want to return mock data for testing or just fail
            // For now, let's try calling it anyway or fail gracefully
        }

        const response = await axios.get(ADZUNA_BASE_URL, {
            params: {
                app_id: ADZUNA_APP_ID,
                app_key: ADZUNA_APP_KEY,
                results_per_page: resultsPerPage,
                what: query
            }
        });

        const jobs = response.data.results;
        console.log(`✅ Successfully fetched ${jobs.length} jobs from Adzuna`);

        for (const job of jobs) {
            const jobData = {
                jobId: job.id,
                jobTitle: job.title,
                companyName: job.company.display_name,
                location: job.location.display_name,
                salaryMin: job.salary_min,
                salaryMax: job.salary_max,
                description: job.description,
                postedDate: new Date(job.created),
                source: 'Adzuna',
                extractedAt: new Date()
            };

            // Upsert to avoid duplicates
            await JobPosting.findOneAndUpdate(
                { jobId: job.id },
                jobData,
                { upsert: true, new: true }
            );
        }

        console.log(`💾 Data saved/updated in MongoDB`);
    } catch (err) {
        console.error('❌ Error fetching from Adzuna:', err.response?.data || err.message);
    }
}

async function run() {
    await connectDB();
    await fetchJobs('data scientist');
    await fetchJobs('software engineer');
    await fetchJobs('data analyst');
    console.log('🏁 Data collection complete');
    mongoose.connection.close();
}

run();
