import 'dotenv/config';
import mongoose from 'mongoose';
import JobPosting from './src/models/JobPosting.js';

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

async function analyzeSalaryAndTrajectory() {
    try {
        console.log('🧪 Starting Salary & Trajectory Analysis...');

        // 1. Get all jobs
        const jobs = await JobPosting.find().lean();
        console.log(`💼 Analyzing ${jobs.length} job postings...`);

        const roleStats = {};

        jobs.forEach(job => {
            // Normalize role title (simplified)
            const normalizedTitle = job.jobTitle.replace(/Junior |Senior |Lead |I|II|III /g, '').trim();

            if (!roleStats[normalizedTitle]) {
                roleStats[normalizedTitle] = {
                    count: 0,
                    salaries: [],
                    locations: {},
                    skills: []
                };
            }

            roleStats[normalizedTitle].count++;
            if (job.salaryMin) roleStats[normalizedTitle].salaries.push(job.salaryMin);
            if (job.salaryMax) roleStats[normalizedTitle].salaries.push(job.salaryMax);

            const loc = job.location.split(',')[0].trim();
            roleStats[normalizedTitle].locations[loc] = (roleStats[normalizedTitle].locations[loc] || 0) + 1;
        });

        console.log('\n📊 SALARY INSIGHTS (India Market):');
        for (const [role, stats] of Object.entries(roleStats)) {
            if (stats.salaries.length > 0) {
                const avg = stats.salaries.reduce((a, b) => a + b, 0) / stats.salaries.length;
                const min = Math.min(...stats.salaries);
                const max = Math.max(...stats.salaries);

                console.log(`\n💰 Role: ${role}`);
                console.log(`   - Average Salary: ₹${(avg / 100000).toFixed(2)} LPA`);
                console.log(`   - Range: ₹${(min / 100000).toFixed(2)} - ₹${(max / 100000).toFixed(2)} LPA`);

                const topLocs = Object.entries(stats.locations)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3);
                console.log(`   - Top Locations: ${topLocs.map(l => l[0]).join(', ')}`);
            }
        }

        // 2. Mock Career Trajectory Probability (as we don't have historical transition data yet)
        // In a real project, this would be based on resumes or historical data
        // Here we use a rule-based logic for the presentation demo
        console.log('\n📈 CAREER TRAJECTORY PROBABILITY (Projected):');

        const trajectories = [
            { from: 'Data Analyst', to: 'Data Scientist', probability: '35%' },
            { from: 'Software Engineer', to: 'Senior Software Engineer', probability: '45%' },
            { from: 'Data Scientist', to: 'ML Engineer', probability: '28%' },
            { from: 'Junior Web Developer', to: 'Full Stack Developer', probability: '40%' }
        ];

        trajectories.forEach(t => {
            console.log(`   - ${t.from} ➔ ${t.to}: ${t.probability} likelihood`);
        });

    } catch (err) {
        console.error('❌ Analysis Error:', err.message);
    }
}

async function run() {
    await connectDB();
    await analyzeSalaryAndTrajectory();
    console.log('\n🏁 Analytics complete');
    mongoose.connection.close();
}

run();
