import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Occupation from './models/Occupation.js';

dotenv.config();

// O*NET API - Use the correct services endpoint
const ONET_BASE_URL = 'https://services.onetcenter.org/ws';
const ONET_USERNAME = process.env.ONET_USERNAME;
const ONET_PASSWORD = process.env.ONET_PASSWORD;

// Create axios instance with auth
const onetApi = axios.create({
  baseURL: ONET_BASE_URL,
  auth: {
    username: ONET_USERNAME,
    password: ONET_PASSWORD
  },
  headers: {
    'Accept': 'application/json'
  }
});

/**
 * Fetch all occupations from O*NET
 */
async function fetchOccupations() {
  try {
    console.log('📡 Fetching occupations list from O*NET API v2...');
    const response = await onetApi.get('/online/occupations');
    
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    
    // Handle different response formats
    if (response.data.occupation) {
      return response.data.occupation;
    }
    
    console.log('Response structure:', JSON.stringify(response.data, null, 2));
    return [];
  } catch (error) {
    console.error('❌ Error fetching occupations:', error.message);
    if (error.response?.status === 401) {
      console.error('⚠️  Authentication failed. Please check your O*NET credentials.');
      console.error('   Get credentials from: https://services.onetcenter.org/');
    }
    if (error.response?.data) {
      console.error('   API Response:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

/**
 * Fetch detailed information for a specific occupation
 */
async function fetchOccupationDetails(code) {
  try {
    console.log(`  📥 Fetching details for ${code}...`);
    
    const endpoints = [
      { name: 'details', url: `/online/occupations/${code}` },
      { name: 'skills', url: `/online/occupations/${code}/skills` },
      { name: 'abilities', url: `/online/occupations/${code}/abilities` },
      { name: 'knowledge', url: `/online/occupations/${code}/knowledge` },
      { name: 'tasks', url: `/online/occupations/${code}/tasks` },
      { name: 'technology', url: `/online/occupations/${code}/technology_skills` }
    ];

    const results = {};
    
    for (const endpoint of endpoints) {
      try {
        const response = await onetApi.get(endpoint.url);
        results[endpoint.name] = response.data;
        // Small delay between endpoint calls
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.log(`    ⚠️  ${endpoint.name} not available`);
        results[endpoint.name] = {};
      }
    }

    return {
      details: results.details || {},
      skills: results.skills?.skill || results.skills?.element || [],
      abilities: results.abilities?.ability || results.abilities?.element || [],
      knowledge: results.knowledge?.knowledge || results.knowledge?.element || [],
      tasks: results.tasks?.task || results.tasks?.element || [],
      technology: results.technology?.technology || results.technology?.element || []
    };
  } catch (error) {
    console.error(`  ❌ Error fetching details for ${code}:`, error.message);
    return null;
  }
}

/**
 * Transform O*NET data to our schema
 */
function transformOccupationData(code, title, details) {
  if (!details) return null;

  // Helper to extract value from different formats
  const getValue = (item, field) => {
    if (!item) return 0;
    return parseFloat(item[field] || item.value || item.score || 0);
  };

  const getName = (item) => {
    if (!item) return '';
    return item.element_name || item.name || item.title || '';
  };

  return {
    code,
    title,
    description: details.details?.description || details.details?.definition || '',
    skills: (details.skills || []).map(skill => ({
      name: getName(skill),
      level: getValue(skill, 'scale_value'),
      importance: getValue(skill, 'importance')
    })).filter(s => s.name),
    abilities: (details.abilities || []).map(ability => ({
      name: getName(ability),
      level: getValue(ability, 'scale_value'),
      importance: getValue(ability, 'importance')
    })).filter(a => a.name),
    knowledge: (details.knowledge || []).map(k => ({
      name: getName(k),
      level: getValue(k, 'scale_value'),
      importance: getValue(k, 'importance')
    })).filter(k => k.name),
    tasks: (details.tasks || [])
      .map(task => task.statement || task.description || task.task || '')
      .filter(Boolean),
    technology: (details.technology || []).map(tech => ({
      name: tech.title || tech.name || '',
      example: Array.isArray(tech.example) ? tech.example : 
               tech.example ? [tech.example] : []
    })).filter(t => t.name),
    education: details.details?.education_level || details.details?.education || '',
    experience: details.details?.experience_level || details.details?.experience || '',
    jobZone: parseInt(details.details?.job_zone || details.details?.zone || 0),
    lastUpdated: new Date()
  };
}

/**
 * Import occupation data into MongoDB
 */
async function importOccupation(occupationData) {
  try {
    await Occupation.findOneAndUpdate(
      { code: occupationData.code },
      occupationData,
      { upsert: true, new: true }
    );
    console.log(`✓ Imported: ${occupationData.title} (${occupationData.code})`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to import ${occupationData.code}:`, error.message);
    return false;
  }
}

/**
 * Main import function
 */
async function importOnetData(options = {}) {
  const { limit = null, startFrom = 0, specificCodes = null } = options;

  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    // Fetch occupations list
    let occupations = await fetchOccupations();
    console.log(`📊 Found ${occupations.length} occupations\n`);

    // Filter if specific codes provided
    if (specificCodes && specificCodes.length > 0) {
      occupations = occupations.filter(occ => specificCodes.includes(occ.code));
      console.log(`🔍 Filtered to ${occupations.length} specific occupations\n`);
    }

    // Apply limit and offset
    if (startFrom > 0) {
      occupations = occupations.slice(startFrom);
    }
    if (limit) {
      occupations = occupations.slice(0, limit);
    }

    console.log(`⚙️  Processing ${occupations.length} occupations...\n`);

    let successCount = 0;
    let failCount = 0;

    // Process each occupation
    for (let i = 0; i < occupations.length; i++) {
      const occupation = occupations[i];
      const occCode = occupation.code || occupation.soc_code || occupation.id;
      const occTitle = occupation.title || occupation.name;
      
      if (!occCode || !occTitle) {
        console.log(`[${i + 1}/${occupations.length}] ⚠️  Skipping invalid occupation`);
        failCount++;
        continue;
      }
      
      console.log(`\n[${i + 1}/${occupations.length}] Processing: ${occTitle} (${occCode})`);

      // Fetch detailed data
      const details = await fetchOccupationDetails(occCode);
      
      if (details) {
        // Transform and import
        const transformedData = transformOccupationData(
          occCode,
          occTitle,
          details
        );

        if (transformedData) {
          const success = await importOccupation(transformedData);
          if (success) successCount++;
          else failCount++;
        } else {
          console.log(`  ⚠️  Failed to transform data`);
          failCount++;
        }
      } else {
        console.log(`  ⚠️  No details available`);
        failCount++;
      }

      // Rate limiting - wait 1.5 seconds between requests
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    console.log('\n' + '='.repeat(50));
    console.log('📈 Import Complete');
    console.log('='.repeat(50));
    console.log(`✓ Successfully imported: ${successCount}`);
    console.log(`✗ Failed: ${failCount}`);
    console.log(`📊 Total processed: ${successCount + failCount}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('💥 Import failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      options.limit = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--start' && args[i + 1]) {
      options.startFrom = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--codes' && args[i + 1]) {
      options.specificCodes = args[i + 1].split(',');
      i++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('🚀 O*NET Data Importer');
  console.log('='.repeat(50) + '\n');

  importOnetData(options)
    .then(() => {
      console.log('\n✅ Import completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Fatal error:', error.message);
      process.exit(1);
    });
}

export { importOnetData, fetchOccupations, fetchOccupationDetails };
