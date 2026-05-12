import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Occupation from './models/Occupation.js';

dotenv.config();

async function checkStats() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    const count = await Occupation.countDocuments();
    const latest = await Occupation.findOne().sort({ lastUpdated: -1 });
    
    console.log('='.repeat(50));
    console.log('📊 Database Statistics');
    console.log('='.repeat(50));
    console.log(`Total Occupations: ${count}`);
    console.log(`Last Updated: ${latest?.lastUpdated || 'N/A'}`);
    console.log('='.repeat(50) + '\n');

    if (count > 0) {
      // Sample occupations
      const samples = await Occupation.find().limit(5).select('code title');
      console.log('Sample Occupations:');
      samples.forEach(occ => {
        console.log(`  - ${occ.title} (${occ.code})`);
      });
      console.log('');
    }

    await mongoose.connection.close();
    console.log('✓ Connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkStats();
