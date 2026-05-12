import 'dotenv/config';
import mongoose from 'mongoose';
import JobPosting from './src/models/JobPosting.js';
import Skill from './src/models/Skill.js';
import Occupation from './src/models/Occupation.js';

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

async function analyzeSkillGaps() {
    try {
        console.log('🧪 Starting Advanced Skill Mapping Analysis...');

        const standardizedSkills = await Skill.find().lean();
        console.log(`📑 Loaded ${standardizedSkills.length} standardized skills from ESCO`);
        const jobs = await JobPosting.find().lean();
        console.log(`💼 Analyzing ${jobs.length} job postings...`);

        // Industry Standard Projections (for missing API data)
        const projections = {
            'Data Scientist': { salaryAvg: 1200000, salaryLow: 800000, salaryHigh: 2200000 },
            'Data Analyst': { salaryAvg: 750000, salaryLow: 450000, salaryHigh: 1200000 },
            'Software Engineer': { salaryAvg: 1100000, salaryLow: 600000, salaryHigh: 1800000 }
        };

        for (const job of jobs) {
            const foundSkills = [];
            const jobDescription = job.description;

            for (const skill of standardizedSkills) {
                const escapedName = skill.skillName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`\\b${escapedName}\\b`, 'gi');
                if (regex.test(jobDescription)) {
                    foundSkills.push(skill.skillName);
                }
            }

            console.log(`   - Job: ${job.jobTitle} | Found Skills: ${foundSkills.length}`);

            const normalizedTitle = job.jobTitle.replace(/Junior |Senior |Lead |I|II|III /g, '').trim();

            // Fill missing salary with projections
            let sMin = job.salaryMin;
            let sMax = job.salaryMax;

            if (!sMin && projections[normalizedTitle]) {
                sMin = projections[normalizedTitle].salaryLow;
                sMax = projections[normalizedTitle].salaryHigh;
            }

            await JobPosting.findByIdAndUpdate(job._id, {
                requiredSkills: foundSkills,
                normalizedTitle: normalizedTitle,
                salaryMin: sMin,
                salaryMax: sMax
            });
        }

        const roleStats = {};
        const updatedJobs = await JobPosting.find().lean();

        updatedJobs.forEach(job => {
            const title = job.normalizedTitle;
            if (!roleStats[title]) {
                roleStats[title] = { count: 0, skillFrequency: {}, salads: [] };
            }
            roleStats[title].count++;
            if (job.salaryMin) roleStats[title].salads.push(job.salaryMin);

            job.requiredSkills.forEach(skill => {
                roleStats[title].skillFrequency[skill] = (roleStats[title].skillFrequency[skill] || 0) + 1;
            });
        });

        console.log('\n📊 REFINED SKILL GAP & SALARY ANALYSIS:');
        for (const [role, stats] of Object.entries(roleStats)) {
            console.log(`\n🔹 Role: ${role} (${stats.count} jobs)`);

            if (stats.salads.length > 0) {
                const avgSal = stats.salads.reduce((a, b) => a + b, 0) / stats.salads.length;
                console.log(`   - Market Avg Salary: ₹${(avgSal / 100000).toFixed(2)} LPA (Projected)`);
            }

            const topSkills = Object.entries(stats.skillFrequency)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            topSkills.forEach(([skill, freq]) => {
                const percentage = ((freq / stats.count) * 100).toFixed(1);
                console.log(`   - ${skill}: ${percentage}% demand`);
            });
        }

    } catch (err) {
        console.error('❌ Analysis Error:', err.message);
    }
}

async function run() {
    await connectDB();
    await analyzeSkillGaps();
    console.log('\n🏁 Analytics complete');
    mongoose.connection.close();
}

run();
