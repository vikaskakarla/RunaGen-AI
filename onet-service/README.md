# O*NET Data Service

Standalone service for collecting and serving O*NET occupation data.

## 🎯 Goal: Collect 2000 O*NET Occupation Records

This service fetches occupation data from O*NET Web Services API and stores it in MongoDB.

## 🚀 Quick Start

### For Mac/Linux:
```bash
chmod +x start.sh
./start.sh
```

### For Windows:
```bash
start.bat
```

### Manual Setup:

1. **Get O*NET Credentials**
   - Visit: https://services.onetcenter.org/
   - Register (free)
   - Check email for username/password

2. **Configure**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Install**
   ```bash
   npm install
   ```

4. **Test Import (10 records)**
   ```bash
   npm run import:test
   ```

5. **Import 2000 Records**
   ```bash
   npm run import:2000
   ```
   Takes ~30-40 minutes due to rate limiting

6. **Start API Server**
   ```bash
   npm start
   ```
   Server runs on http://localhost:3002

## 📊 What Data Gets Collected

For each occupation:
- Code and title (e.g., "15-1252.00 - Software Developers")
- Detailed description
- Skills with importance ratings
- Abilities (cognitive, physical, sensory)
- Knowledge areas
- Tasks performed
- Technology/tools used
- Education requirements
- Job zone classification

## 🔌 API Endpoints

- `GET /health` - Service health check
- `GET /api/stats` - Database statistics
- `GET /api/occupations` - List occupations
- `GET /api/occupations/:code` - Get occupation details
- `GET /api/search?q=developer` - Search occupations
- `POST /api/search/match-skills` - Match skills to occupations

## 📖 Documentation

- **SETUP_GUIDE.md** - Complete step-by-step setup instructions
- **.env.example** - Environment configuration template

## 🛠️ Commands

```bash
npm run import:test      # Import 10 records (test)
npm run import:2000      # Import 2000 records (goal)
npm run import:all       # Import all (~1000 available)
npm run stats            # Check database stats
npm start                # Start API server
npm run dev              # Start with auto-reload
```

## ✅ Success Criteria

- [ ] O*NET credentials obtained
- [ ] MongoDB connected
- [ ] Test import successful (10 records)
- [ ] Full import complete (1000+ records)
- [ ] API server running
- [ ] Endpoints responding correctly

## 🔗 Integration

Use in your main project:

```javascript
// Fetch occupations
const response = await fetch('http://localhost:3002/api/occupations');
const data = await response.json();

// Match skills
const matches = await fetch('http://localhost:3002/api/search/match-skills', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ skills: ['JavaScript', 'React', 'Node.js'] })
});
```
