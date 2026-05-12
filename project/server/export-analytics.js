import 'dotenv/config';
import mongoose from 'mongoose';
import JobPosting from './src/models/JobPosting.js';
import Skill from './src/models/Skill.js';
import fs from 'fs';

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

async function addCommonSkills() {
    const commonSkills = [
        { name: 'Python', cat: 'Programming' },
        { name: 'SQL', cat: 'Database' },
        { name: 'Java', cat: 'Programming' },
        { name: 'Machine Learning', cat: 'AI/ML' },
        { name: 'Data Analysis', cat: 'Data' },
        { name: 'React', cat: 'Frontend' },
        { name: 'Node.js', cat: 'Backend' },
        { name: 'AWS', cat: 'Cloud' },
        { name: 'Communication', cat: 'Soft Skill' },
        { name: 'Problem Solving', cat: 'Soft Skill' },
        { name: 'Statistics', cat: 'Data' },
        { name: 'Tableau', cat: 'Visualization' },
        { name: 'Excel', cat: 'Data' }
    ];

    for (const s of commonSkills) {
        await Skill.findOneAndUpdate(
            { skillName: s.name },
            { skillId: `custom_${s.name.toLowerCase()}`, skillName: s.name, skillCategory: s.cat, source: 'Custom' },
            { upsert: true }
        );
    }
    console.log('✅ Added common tech skills');
}

async function exportFinalAnalytics() {
    const jobs = await JobPosting.find().lean();

    // 1. Export Roles & Salaries (for Power BI Salary Dashboard)
    const salaryData = jobs.map(j => ({
        title: j.normalizedTitle,
        min: j.salaryMin,
        max: j.salaryMax,
        location: j.location.split(',')[0],
        company: j.companyName
    }));

    // 2. Export Skill Demand (for Skill Gap Dashboard)
    const skillFreq = {};
    jobs.forEach(j => {
        j.requiredSkills.forEach(s => {
            skillFreq[s] = (skillFreq[s] || 0) + 1;
        });
    });

    const skillData = Object.entries(skillFreq).map(([skill, count]) => ({
        skill,
        demandCount: count,
        demandPct: (count / jobs.length * 100).toFixed(1)
    }));

    // Save to JSON for user to download
    fs.writeFileSync('power_bi_export.json', JSON.stringify({ salaryData, skillData }, null, 2));
    console.log('✅ Exported analytics data to power_bi_export.json');
}

async function run() {
    await connectDB();
    await addCommonSkills();
    // Rerun analytics logic inside the export
    await exportFinalAnalytics();
    console.log('\n🏁 Analytics & Export complete');
    mongoose.connection.close();
}

run();
