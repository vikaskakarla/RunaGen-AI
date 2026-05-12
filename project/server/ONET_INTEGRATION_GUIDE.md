# O*NET Data Integration Guide

This guide explains how to integrate O*NET (Occupational Information Network) data into your MongoDB database and use it via API endpoints.

## Table of Contents
1. [Getting O*NET API Credentials](#getting-onet-api-credentials)
2. [Configuration](#configuration)
3. [Importing Data](#importing-data)
4. [API Endpoints](#api-endpoints)
5. [Usage Examples](#usage-examples)

---

## Getting O*NET API Credentials

### Step 1: Register for O*NET Web Services

1. Visit: https://services.onetcenter.org/
2. Click on **"Register"** button
3. Fill out the registration form with:
   - Your name
   - Email address
   - Organization (can be "Personal" or "Student")
   - Intended use (e.g., "Career guidance application")
4. Accept the terms of service
5. Submit the form

### Step 2: Receive Credentials

- You'll receive an email with your **username** and **password**
- These credentials are free for non-commercial use
- Keep them secure and don't share them publicly

### Step 3: Update Environment Variables

Edit your `.env` file in the `project/server` directory:

```env
# O*NET API Configuration
ONET_USERNAME=your_actual_username_here
ONET_PASSWORD=your_actual_password_here
```

---

## Configuration

### Prerequisites

- Node.js installed
- MongoDB connection configured (MONGO_URI in .env)
- O*NET credentials added to .env file

### Install Dependencies

All required dependencies are already in package.json:
- axios (for API calls)
- mongoose (for MongoDB)
- dotenv (for environment variables)

---

## Importing Data

### Basic Import

Import all occupations (this will take a while due to rate limiting):

```bash
cd project/server
node onet-data-importer.js
```

### Import with Limit

Import only the first 10 occupations (for testing):

```bash
node onet-data-importer.js --limit 10
```

### Import Specific Occupations

Import specific occupation codes:

```bash
node onet-data-importer.js --codes 15-1252.00,11-1021.00,29-1141.00
```

### Resume Import from Specific Position

Start importing from the 50th occupation:

```bash
node onet-data-importer.js --start 50 --limit 20
```

### Command Line Options

- `--limit <number>`: Limit the number of occupations to import
- `--start <number>`: Start from a specific position (skip first N)
- `--codes <code1,code2>`: Import only specific occupation codes

### What Gets Imported

For each occupation, the importer fetches:
- Basic information (code, title, description)
- Skills (with importance and level ratings)
- Abilities (cognitive, physical, sensory)
- Knowledge areas
- Tasks performed
- Technology/tools used
- Education requirements
- Experience requirements
- Job zone classification

---

## API Endpoints

### 1. Get All Occupations

```http
GET /api/onet/occupations?search=software&limit=50&skip=0
```

**Query Parameters:**
- `search` (optional): Search term for title, description, or code
- `limit` (optional, default: 50): Number of results to return
- `skip` (optional, default: 0): Number of results to skip (pagination)

**Response:**
```json
{
  "success": true,
  "occupations": [
    {
      "_id": "...",
      "code": "15-1252.00",
      "title": "Software Developers",
      "description": "Research, design, and develop...",
      "jobZone": 4,
      "education": "Bachelor's degree"
    }
  ],
  "total": 150,
  "limit": 50,
  "skip": 0
}
```

### 2. Get Occupation Details

```http
GET /api/onet/occupation/:code
```

**Example:**
```http
GET /api/onet/occupation/15-1252.00
```

**Response:**
```json
{
  "success": true,
  "occupation": {
    "code": "15-1252.00",
    "title": "Software Developers",
    "description": "...",
    "skills": [
      { "name": "Programming", "level": 4.5, "importance": 4.8 },
      { "name": "Critical Thinking", "level": 4.2, "importance": 4.5 }
    ],
    "abilities": [...],
    "knowledge": [...],
    "tasks": [...],
    "technology": [...],
    "education": "Bachelor's degree",
    "jobZone": 4
  }
}
```

### 3. Get Skills for Occupation

```http
GET /api/onet/skills/:code
```

**Example:**
```http
GET /api/onet/skills/15-1252.00
```

**Response:**
```json
{
  "success": true,
  "code": "15-1252.00",
  "title": "Software Developers",
  "skills": [
    { "name": "Programming", "level": 4.5, "importance": 4.8 },
    { "name": "Systems Analysis", "level": 4.3, "importance": 4.6 }
  ]
}
```

### 4. Search Occupations

```http
GET /api/onet/search?q=developer&skills=programming,javascript&minJobZone=3&limit=20
```

**Query Parameters:**
- `q` (optional): Search query (searches title, description, skills)
- `skills` (optional): Comma-separated list of skills to filter by
- `minJobZone` (optional): Minimum job zone (1-5)
- `maxJobZone` (optional): Maximum job zone (1-5)
- `limit` (optional, default: 20): Number of results

**Response:**
```json
{
  "success": true,
  "results": [...],
  "count": 15
}
```

### 5. Match Skills to Occupations

```http
POST /api/onet/match-skills
Content-Type: application/json

{
  "skills": ["JavaScript", "React", "Node.js", "MongoDB"],
  "limit": 10
}
```

**Response:**
```json
{
  "success": true,
  "matches": [
    {
      "code": "15-1252.00",
      "title": "Software Developers",
      "description": "...",
      "jobZone": 4,
      "matchScore": 85,
      "matchedSkills": ["JavaScript", "React", "Node.js"],
      "totalSkills": 45
    }
  ],
  "totalMatches": 25
}
```

### 6. Get Database Statistics

```http
GET /api/onet/stats
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalOccupations": 1016,
    "lastUpdated": "2024-02-17T10:30:00.000Z",
    "dataSource": "O*NET Database"
  }
}
```

---

## Usage Examples

### Frontend Integration (React/TypeScript)

```typescript
// Fetch occupations
const fetchOccupations = async (searchTerm: string) => {
  const response = await fetch(
    `http://localhost:3001/api/onet/occupations?search=${searchTerm}&limit=20`
  );
  const data = await response.json();
  return data.occupations;
};

// Get occupation details
const getOccupationDetails = async (code: string) => {
  const response = await fetch(
    `http://localhost:3001/api/onet/occupation/${code}`
  );
  const data = await response.json();
  return data.occupation;
};

// Match user skills
const matchSkills = async (userSkills: string[]) => {
  const response = await fetch(
    'http://localhost:3001/api/onet/match-skills',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skills: userSkills, limit: 10 })
    }
  );
  const data = await response.json();
  return data.matches;
};
```

### Integration with Resume Analysis

```javascript
// In your resume analysis service
import { OnetOccupation } from './onet-data-importer.js';

async function enhanceResumeAnalysis(resumeSkills, targetRole) {
  // Find matching O*NET occupation
  const occupation = await OnetOccupation.findOne({
    title: { $regex: targetRole, $options: 'i' }
  });

  if (occupation) {
    // Compare resume skills with required skills
    const requiredSkills = occupation.skills
      .filter(s => s.importance > 3.5)
      .map(s => s.name);

    const missingSkills = requiredSkills.filter(
      skill => !resumeSkills.some(rs => 
        rs.toLowerCase().includes(skill.toLowerCase())
      )
    );

    return {
      matchedOccupation: occupation.title,
      requiredSkills,
      missingSkills,
      educationRequired: occupation.education,
      jobZone: occupation.jobZone
    };
  }

  return null;
}
```

---

## Data Schema

### OnetOccupation Model

```javascript
{
  code: String,              // O*NET-SOC code (e.g., "15-1252.00")
  title: String,             // Occupation title
  description: String,       // Detailed description
  skills: [{
    name: String,            // Skill name
    level: Number,           // Skill level (0-7)
    importance: Number       // Importance rating (0-5)
  }],
  abilities: [{
    name: String,
    level: Number,
    importance: Number
  }],
  knowledge: [{
    name: String,
    level: Number,
    importance: Number
  }],
  tasks: [String],           // Array of task descriptions
  technology: [{
    name: String,            // Technology/tool name
    example: [String]        // Examples
  }],
  education: String,         // Education level required
  experience: String,        // Experience level
  jobZone: Number,           // Job zone (1-5)
  lastUpdated: Date          // Last import date
}
```

---

## Troubleshooting

### Authentication Errors

If you get 401 Unauthorized errors:
1. Verify your O*NET credentials are correct in `.env`
2. Check if your account is active
3. Ensure you're not exceeding rate limits

### Rate Limiting

O*NET API has rate limits. The importer includes:
- 1-second delay between requests
- Error handling for failed requests
- Resume capability with `--start` flag

### MongoDB Connection Issues

Ensure your `MONGO_URI` is correctly configured:
```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database
```

### Import Taking Too Long

For faster testing:
- Use `--limit 10` to import only 10 occupations
- Import specific codes with `--codes`
- Run imports during off-peak hours

---

## Best Practices

1. **Initial Import**: Start with a small limit (10-20) to test
2. **Full Import**: Run during off-peak hours (takes 1-2 hours for all ~1000 occupations)
3. **Updates**: Re-run importer monthly to keep data fresh
4. **Caching**: Consider caching frequently accessed occupations
5. **Indexing**: MongoDB indexes are automatically created on `code` field

---

## Support

For O*NET API issues:
- Documentation: https://services.onetcenter.org/reference/
- Support: https://www.onetcenter.org/help.html

For integration issues:
- Check server logs
- Verify MongoDB connection
- Test API endpoints with Postman or curl

---

## License

O*NET data is provided by the U.S. Department of Labor and is in the public domain. 
Attribution is appreciated but not required.
