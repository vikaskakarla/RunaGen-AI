import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const ONET_BASE_URL = 'https://services.onetcenter.org/ws';
const ONET_USERNAME = process.env.ONET_USERNAME;
const ONET_PASSWORD = process.env.ONET_PASSWORD;

console.log('\n' + '='.repeat(50));
console.log('🧪 O*NET API Connection Test');
console.log('='.repeat(50) + '\n');

// Check credentials
console.log('1️⃣  Checking credentials...');
if (!ONET_USERNAME || ONET_USERNAME === 'your_username_here') {
  console.log('❌ ONET_USERNAME not configured in .env');
  process.exit(1);
}
if (!ONET_PASSWORD || ONET_PASSWORD === 'your_password_here') {
  console.log('❌ ONET_PASSWORD not configured in .env');
  process.exit(1);
}
console.log('✓ Credentials found in .env\n');

// Create axios instance
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

async function testConnection() {
  try {
    // Test 1: Base API
    console.log('2️⃣  Testing base API...');
    const baseResponse = await onetApi.get('/');
    console.log('✓ Base API accessible');
    console.log('   Available services:', baseResponse.data.length);
    
    // Test 2: Online services
    console.log('\n3️⃣  Testing online services...');
    const onlineResponse = await onetApi.get('/online');
    console.log('✓ Online services accessible');
    
    // Test 3: Occupations list
    console.log('\n4️⃣  Testing occupations endpoint...');
    const occupationsResponse = await onetApi.get('/online/occupations');
    
    let occupations = [];
    if (Array.isArray(occupationsResponse.data)) {
      occupations = occupationsResponse.data;
    } else if (occupationsResponse.data.occupation) {
      occupations = occupationsResponse.data.occupation;
    }
    
    console.log('✓ Occupations endpoint accessible');
    console.log(`   Total occupations available: ${occupations.length}`);
    
    if (occupations.length > 0) {
      console.log('\n5️⃣  Sample occupations:');
      occupations.slice(0, 5).forEach((occ, idx) => {
        const code = occ.code || occ.soc_code || occ.id;
        const title = occ.title || occ.name;
        console.log(`   ${idx + 1}. ${title} (${code})`);
      });
      
      // Test 4: Detailed occupation data
      const testCode = occupations[0].code || occupations[0].soc_code || occupations[0].id;
      console.log(`\n6️⃣  Testing detailed data for: ${testCode}...`);
      
      try {
        const detailResponse = await onetApi.get(`/online/occupations/${testCode}`);
        console.log('✓ Occupation details accessible');
        
        const skillsResponse = await onetApi.get(`/online/occupations/${testCode}/skills`);
        console.log('✓ Skills data accessible');
        
        console.log('\n' + '='.repeat(50));
        console.log('✅ All tests passed!');
        console.log('='.repeat(50));
        console.log('\nYou can now run:');
        console.log('  npm run import:test      (import 10 records)');
        console.log('  npm run import:2000      (import 2000 records)');
        console.log('  npm run import:all       (import all records)');
        console.log('');
        
      } catch (detailError) {
        console.log('⚠️  Detailed data test failed:', detailError.message);
        console.log('   This is OK - basic import will still work');
      }
    }
    
  } catch (error) {
    console.log('\n' + '='.repeat(50));
    console.log('❌ Connection test failed');
    console.log('='.repeat(50));
    
    if (error.response?.status === 401) {
      console.log('\n🔐 Authentication Error');
      console.log('   Your O*NET credentials are incorrect.');
      console.log('\n   Steps to fix:');
      console.log('   1. Visit: https://services.onetcenter.org/');
      console.log('   2. Register or login');
      console.log('   3. Check your email for credentials');
      console.log('   4. Update .env file with correct username/password');
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n🌐 Network Error');
      console.log('   Cannot reach O*NET API.');
      console.log('   Check your internet connection.');
    } else {
      console.log('\n❌ Error:', error.message);
      if (error.response?.data) {
        console.log('   API Response:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    process.exit(1);
  }
}

testConnection();
