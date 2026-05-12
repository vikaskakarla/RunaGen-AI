import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';
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

/**
 * Converts an array of objects to a CSV string
 */
function convertToCSV(data) {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const rows = data.map(obj =>
        headers.map(header => {
            let val = obj[header];
            // Handle arrays and objects
            if (Array.isArray(val)) val = val.join('; ');
            if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
            // Escape quotes and wrap in quotes
            val = String(val).replace(/"/g, '""');
            return `"${val}"`;
        }).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
}

async function exportCollection(Model, fileName) {
    console.log(`📡 Exporting ${Model.modelName}...`);
    const data = await Model.find().lean();

    if (data.length === 0) {
        console.log(`⚠️ No data found in ${Model.modelName} collection.`);
        return;
    }

    // Remove MongoDB internal fields
    const cleanedData = data.map(item => {
        const { _id, __v, ...rest } = item;
        return rest;
    });

    const csv = convertToCSV(cleanedData);
    fs.writeFileSync(fileName, csv);
    console.log(`✅ Exported to ${fileName} (${data.length} records)`);
}

async function run() {
    await connectDB();

    await exportCollection(JobPosting, 'jobs_export.csv');
    await exportCollection(Skill, 'skills_export.csv');
    await exportCollection(Occupation, 'occupations_export.csv');

    console.log('\n🏁 CSV Export complete!');
    mongoose.connection.close();
}

run();
