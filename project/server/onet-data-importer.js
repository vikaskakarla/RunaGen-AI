import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// O*NET API Configuration
const ONET_BASE_URL = 'https://services.onetcenter.org/ws';
const ONET_USERNAME = process.env.ONET_USERNAME;
const ONET_PASSWORD = process.env.ONET_PASSWORD;

// MongoDB Schema for O*NET Data
const onetOccupationSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: String,
  skills: [{ name: String, level: Number, importance: Number }],
  abilities: [{ name: String, level: Number, importance: Number }],
  knowledge: [{ name: String, level: Number, importance: Number }],
  tasks: [String],
  technology: [{ name: String, example: [String] }],
  education: String,
  experience: String,
  jobZone: Number,
  salary: { median: Number, range: { min: Number, max: Number } },
  outlook: String,
  lastUpdated: { type: Date, default: Date.now }
});

const OnetOccupation = mongoose.model('OnetOccupation', onetOccupationSchema);

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
    console.log('Fetching occupations list from O*NET...');
    const response = await onetApi.get('/online/occupations');
    return response.data.occupation || [];
  } catch (error) {
    console.error('Error fetching occupations:', error.message);
    throw error;
  }
}

/**
 * Fetch detailed information for a specific occupation
 */
async function fetchOccupationDetails(code) {
  try {
    const [details, skills, abilities, knowledge, tasks, technology] = await Promise.all([
      onetApi.get(`/online/occupations/${code}`).catch(() => ({ data: {} })),
      onetApi.get(`/online/occupations/${code}/skills`).catch(() => ({ data: {} })),
      onetApi.get(`/online/occupations/${code}/abilities`).catch(() => ({ data: {} })),
      onetApi.get(`/online/occupations/${code}/knowledge`).catch(() => ({ data: {} })),
      onetApi.get(`/online/occupations/${code}/tasks`).catch(() => ({ data: {} })),
      onetApi.get(`/online/occupations/${code}/technology`).catch(() => ({ data: {} }))
    ]);

    return {
      details: details.data,
      skills: skills.data.skill || [],
      abilities: abilities.data.ability || [],
      knowledge: knowledge.data.knowledge || [],
      tasks: tasks.data.task || [],
      technology: technology.data.technology || []
    };
  } catch (error) {
    console.error(`Error fetching details for ${code}:`, error.message);
    return null;
  }
}

/**
 * Transform O*NET data to our schema
 */
function transformOccupationData(code, title, details) {
  if (!details) return null;

  return {
    code,
    title,
    description: details.details?.description || '',
    skills: details.skills.map(skill => ({
      name: skill.element_name || skill.name,
      level: parseFloat(skill.scale_value) || 0,
      importance: parseFloat(skill.importance) || 0
    })),
    abilities: details.abilities.map(ability => ({
      name: ability.element_name || ability.name,
      level: parseFloat(ability.scale_value) || 0,
      importance: parseFloat(ability.importance) || 0
    })),
    knowledge: details.knowledge.map(k => ({
      name: k.element_name || k.name,
      level: parseFloat(k.scale_value) || 0,
      importance: parseFloat(k.importance) || 0
    })),
    tasks: details.tasks.map(task => task.statement || task.description || '').filter(Boolean),
    technology: details.technology.map(tech => ({
      name: tech.title || tech.name,
      example: tech.example || []
    })),
    education: details.details?.education_level || '',
    experience: details.details?.experience_level || '',
    jobZone: parseInt(details.details?.job_zone) || 0,
    lastUpdated: new Date()
  };
}

/**
 * Import occupation data into MongoDB
 */
async function importOccupation(occupationData) {
  try {
    await OnetOccupation.findOneAndUpdate(
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
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    // Fetch occupations list
    let occupations = await fetchOccupations();
    console.log(`Found ${occupations.length} occupations\n`);

    // Filter if specific codes provided
    if (specificCodes && specificCodes.length > 0) {
      occupations = occupations.filter(occ => specificCodes.includes(occ.code));
      console.log(`Filtered to ${occupations.length} specific occupations\n`);
    }

    // Apply limit and offset
    if (startFrom > 0) {
      occupations = occupations.slice(startFrom);
    }
    if (limit) {
      occupations = occupations.slice(0, limit);
    }

    console.log(`Processing ${occupations.length} occupations...\n`);

    let successCount = 0;
    let failCount = 0;

    // Process each occupation
    for (let i = 0; i < occupations.length; i++) {
      const occupation = occupations[i];
      console.log(`[${i + 1}/${occupations.length}] Processing: ${occupation.title}`);

      // Fetch detailed data
      const details = await fetchOccupationDetails(occupation.code);
      
      if (details) {
        // Transform and import
        const transformedData = transformOccupationData(
          occupation.code,
          occupation.title,
          details
        );

        if (transformedData) {
          const success = await importOccupation(transformedData);
          if (success) successCount++;
          else failCount++;
        }
      } else {
        failCount++;
      }

      // Rate limiting - wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n=== Import Complete ===');
    console.log(`✓ Successfully imported: ${successCount}`);
    console.log(`✗ Failed: ${failCount}`);
    console.log(`Total processed: ${successCount + failCount}`);

  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
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

  importOnetData(options)
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { importOnetData, OnetOccupation, fetchOccupations, fetchOccupationDetails };
