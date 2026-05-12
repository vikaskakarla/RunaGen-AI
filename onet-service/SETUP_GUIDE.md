# O*NET Data Collection - Complete Setup Guide

## Step 1: Get O*NET API Credentials

### Register for O*NET Web Services

1. **Visit**: https://services.onetcenter.org/
2. **Click**: "Register" button (top right)
3. **Fill the form**:
   - Name: Your name
   - Email: Your email
   - Organization: Can be "Personal Project" or "Student"
   - Intended Use: "Career guidance application" or "Educational project"
4. **Submit** and check your email
5. **Save** your username and password

### Available O*NET API Endpoints (from screenshot)

- `/about` - About O*NET Web Services
- `/database` - O*NET Database Services
- `/mnm` - My Next Move services
- `/mpo` - MPI Proximo Paso services
- `/online` - O*NET Online services ✅ (We'll use this)
- `/taxonomy` - O*NET-SOC Taxonomy services
- `/veterans` - My Next Move for Veterans services

## Step 2: Configure Environment

```bash
cd onet-service

# Copy example env file
cp .env.example .env

# Edit the .env file
nano .env
```

**Update these values in .env:**

```env
# O*NET API Credentials (REQUIRED)
ONET_USERNAME=your_actual_username_from_email
ONET_PASSWORD=your_actual_password_from_email

# MongoDB (REQUIRED)
MONGO_URI=mongodb://localhost:27017/onet-data
# OR use your existing MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/onet-data

# Server Configuration
PORT=3002
NODE_ENV=development

# CORS (Optional - for frontend access)
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

## Step 3: Install Dependencies

```bash
npm install
```

This will install:
- express (API server)
- mongoose (MongoDB)
- axios (HTTP requests)
- cors (Cross-origin)
- dotenv (Environment variables)

## Step 4: Import O*NET Data

### Test Import (10 records - recommended first)

```bash
npm run import:test
```

This will:
- Connect to MongoDB
- Fetch 10 occupations from O*NET
- For each occupation, fetch:
  - Basic info (code, title, description)
  - Skills (with importance ratings)
  - Abilities (cognitive, physical, sensory)
  - Knowledge areas
  - Tasks performed
  - Technology/tools used
  - Education requirements
  - Job zone classification
- Store in MongoDB
- Show progress and results

**Expected output:**
```
🚀 O*NET Data Importer
==================================================
🔌 Connecting to MongoDB...
✓ Connected to MongoDB

📡 Fetching occupations list from O*NET...
📊 Found 1016 occupations

⚙️  Processing 10 occupations...

[1/10] Processing: Chief Executives
✓ Imported: Chief Executives (11-1011.00)
[2/10] Processing: General and Operations Managers
✓ Imported: General and Operations Managers (11-1021.00)
...

==================================================
📈 Import Complete
==================================================
✓ Successfully imported: 10
✗ Failed: 0
📊 Total processed: 10
==================================================
```

### Import 2000 Records (Main Goal)

Once test is successful:

```bash
npm run import:2000
```

**This will take approximately 30-40 minutes** due to:
- Rate limiting (1 second between requests)
- 2000 occupations × ~2 seconds each = ~1 hour

**Progress tracking:**
- Shows current occupation being processed
- Shows success/failure count
- Handles errors gracefully
- Can be resumed if interrupted

### Import All Records (~1000 occupations)

```bash
npm run import:all
```

Note: O*NET has approximately 1000 occupations, so `--limit 2000` will get all available data.

## Step 5: Verify Data Import

### Check Database Statistics

```bash
npm run stats
```

**Expected output:**
```
==================================================
📊 Database Statistics
==================================================
Total Occupations: 1016
Last Updated: 2024-02-17T10:30:00.000Z
==================================================

Sample Occupations:
  - Chief Executives (11-1011.00)
  - General and Operations Managers (11-1021.00)
  - Legislators (11-1031.00)
  - Advertising and Promotions Managers (11-2011.00)
  - Marketing Managers (11-2021.00)
```

### Check MongoDB Directly

```bash
# If using local MongoDB
mongosh onet-data
db.occupations.countDocuments()
db.occupations.findOne()

# If using MongoDB Atlas
# Use MongoDB Compass or Atlas web interface
```

## Step 6: Start API Server

```bash
# Development mode (auto-reload on changes)
npm run dev

# Production mode
npm start
```

**Server will start on:** http://localhost:3002

## Step 7: Test API Endpoints

### Health Check
```bash
curl http://localhost:3002/health
```

### Get Statistics
```bash
curl http://localhost:3002/api/stats
```

### List Occupations
```bash
curl "http://localhost:3002/api/occupations?limit=10"
```

### Search for Software Developers
```bash
curl "http://localhost:3002/api/search?q=software+developer"
```

### Get Specific Occupation
```bash
curl http://localhost:3002/api/occupations/15-1252.00
```

### Match Skills
```bash
curl -X POST http://localhost:3002/api/search/match-skills \
  -H "Content-Type: application/json" \
  -d '{"skills": ["JavaScript", "Python", "React", "Node.js"], "limit": 10}'
```

## Data Structure

### What Gets Stored for Each Occupation

```javascript
{
  code: "15-1252.00",
  title: "Software Developers",
  description: "Research, design, and develop computer...",
  
  skills: [
    { name: "Programming", level: 4.5, importance: 4.8 },
    { name: "Critical Thinking", level: 4.2, importance: 4.5 },
    // ... more skills
  ],
  
  abilities: [
    { name: "Deductive Reasoning", level: 4.0, importance: 4.2 },
    // ... more abilities
  ],
  
  knowledge: [
    { name: "Computers and Electronics", level: 4.8, importance: 4.9 },
    // ... more knowledge areas
  ],
  
  tasks: [
    "Modify existing software to correct errors...",
    "Develop and direct software system testing...",
    // ... more tasks
  ],
  
  technology: [
    { name: "Development environment software", example: ["Git", "Docker"] },
    // ... more technology
  ],
  
  education: "Bachelor's degree",
  experience: "None",
  jobZone: 4,
  lastUpdated: "2024-02-17T10:30:00.000Z"
}
```

## Troubleshooting

### Authentication Error (401)
```
❌ Error fetching occupations: Request failed with status code 401
⚠️  Authentication failed. Please check your O*NET credentials.
```

**Solution**: 
- Verify ONET_USERNAME and ONET_PASSWORD in .env
- Check email for correct credentials
- Ensure no extra spaces in .env file

### MongoDB Connection Error
```
❌ Failed to start server: MongooseServerSelectionError
```

**Solution**:
- Check MONGO_URI in .env
- Ensure MongoDB is running (if local)
- Check network connection (if Atlas)
- Verify database user permissions

### Rate Limiting
```
❌ Error fetching details for 15-1252.00: Request failed with status code 429
```

**Solution**:
- This is normal, the importer has 1-second delays
- If you see many 429 errors, increase delay in importer.js
- Wait a few minutes and resume import

### Import Interrupted
```bash
# Resume from position 500
npm run import -- --start 500 --limit 1500
```

## Next Steps

After O*NET data is successfully imported:

1. ✅ Verify all 1000+ occupations are in MongoDB
2. ✅ Test API endpoints
3. ✅ Integrate with your main project
4. 🔄 Move to ESCO API integration (next phase)
5. 🔄 Add salary data from Adzuna
6. 🔄 Combine all data sources

## Support

- O*NET Documentation: https://services.onetcenter.org/reference/
- O*NET Support: https://www.onetcenter.org/help.html
- MongoDB Docs: https://docs.mongodb.com/
