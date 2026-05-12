# 🚀 Quick Start - O*NET Data Collection

## Goal: Collect 2000 O*NET Occupation Records

Follow these steps to automatically collect occupation data from O*NET.

---

## Step 1: Get O*NET Credentials (5 minutes)

1. Open browser: https://services.onetcenter.org/
2. Click **"Register"** (top right)
3. Fill the form:
   - Name: Your name
   - Email: Your email  
   - Organization: "Student Project" or "Personal"
   - Use: "Career guidance application"
4. Submit and **check your email**
5. Save the username and password you receive

---

## Step 2: Setup (2 minutes)

```bash
cd onet-service

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

**Edit .env file** and add your credentials:
```env
ONET_USERNAME=your_username_from_email
ONET_PASSWORD=your_password_from_email
MONGO_URI=mongodb://localhost:27017/onet-data
```

---

## Step 3: Test Connection (1 minute)

```bash
npm test
```

**Expected output:**
```
🧪 O*NET API Connection Test
==================================================
1️⃣  Checking credentials...
✓ Credentials found in .env

2️⃣  Testing base API...
✓ Base API accessible

3️⃣  Testing online services...
✓ Online services accessible

4️⃣  Testing occupations endpoint...
✓ Occupations endpoint accessible
   Total occupations available: 1016

✅ All tests passed!
```

If you see errors, check your credentials in .env file.

---

## Step 4: Import Data

### Option A: Test with 10 records (recommended first)

```bash
npm run import:test
```

Takes ~30 seconds. Verifies everything works.

### Option B: Import 2000 records (main goal)

```bash
npm run import:2000
```

Takes ~40-50 minutes due to rate limiting.

**What happens:**
- Connects to MongoDB
- Fetches occupation list from O*NET
- For each occupation:
  - Gets basic info
  - Gets skills data
  - Gets abilities data
  - Gets knowledge areas
  - Gets tasks
  - Gets technology/tools
  - Stores in MongoDB
- Shows progress in real-time

**Progress output:**
```
[1/2000] Processing: Chief Executives (11-1011.00)
  📥 Fetching details for 11-1011.00...
✓ Imported: Chief Executives (11-1011.00)

[2/2000] Processing: General and Operations Managers (11-1021.00)
  📥 Fetching details for 11-1021.00...
✓ Imported: General and Operations Managers (11-1021.00)
...
```

---

## Step 5: Verify Data

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

---

## Step 6: Start API Server

```bash
npm start
```

Server runs on: http://localhost:3002

**Test endpoints:**

```bash
# Health check
curl http://localhost:3002/health

# Get stats
curl http://localhost:3002/api/stats

# List occupations
curl http://localhost:3002/api/occupations?limit=5

# Search
curl "http://localhost:3002/api/search?q=software+developer"

# Get specific occupation
curl http://localhost:3002/api/occupations/15-1252.00
```

---

## Easy Mode: Use Start Scripts

### Mac/Linux:
```bash
chmod +x start.sh
./start.sh
```

### Windows:
```bash
start.bat
```

Interactive menu will guide you through all steps!

---

## Troubleshooting

### "Authentication failed"
- Check ONET_USERNAME and ONET_PASSWORD in .env
- Make sure no extra spaces
- Verify credentials from email

### "Cannot connect to MongoDB"
- Check MONGO_URI in .env
- Make sure MongoDB is running
- Try: `mongod` (for local MongoDB)

### "Rate limit exceeded"
- This is normal, importer has delays built-in
- Just wait, it will continue automatically

### Import interrupted?
```bash
# Resume from position 500
npm run import -- --start 500 --limit 1500
```

---

## What You Get

Each occupation includes:
- ✅ Code and title
- ✅ Detailed description
- ✅ Skills (with importance ratings)
- ✅ Abilities (cognitive, physical, sensory)
- ✅ Knowledge areas
- ✅ Tasks performed
- ✅ Technology/tools used
- ✅ Education requirements
- ✅ Job zone classification

Total: **1000+ occupations** with complete data!

---

## Next Steps

After O*NET is complete:
1. ✅ Verify data in MongoDB
2. ✅ Test API endpoints
3. ✅ Integrate with main project
4. 🔄 Move to ESCO API (skills taxonomy)
5. 🔄 Add Adzuna salary data

---

## Need Help?

- O*NET Docs: https://services.onetcenter.org/reference/
- MongoDB Docs: https://docs.mongodb.com/
- Check SETUP_GUIDE.md for detailed instructions
