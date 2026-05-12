import express from 'express';
import { OnetOccupation, fetchOccupations, fetchOccupationDetails } from '../../onet-data-importer.js';

const router = express.Router();

/**
 * GET /api/onet/occupations
 * Get all occupations from MongoDB
 */
router.get('/occupations', async (req, res) => {
  try {
    const { search, limit = 50, skip = 0 } = req.query;
    
    let query = {};
    if (search) {
      query = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { code: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const occupations = await OnetOccupation.find(query)
      .select('code title description jobZone education')
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort({ title: 1 });

    const total = await OnetOccupation.countDocuments(query);

    res.json({
      success: true,
      occupations,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
  } catch (error) {
    console.error('Error fetching occupations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch occupations',
      message: error.message
    });
  }
});

/**
 * GET /api/onet/occupation/:code
 * Get detailed information for a specific occupation
 */
router.get('/occupation/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    const occupation = await OnetOccupation.findOne({ code });

    if (!occupation) {
      return res.status(404).json({
        success: false,
        error: 'Occupation not found'
      });
    }

    res.json({
      success: true,
      occupation
    });
  } catch (error) {
    console.error('Error fetching occupation details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch occupation details',
      message: error.message
    });
  }
});

/**
 * GET /api/onet/skills/:code
 * Get skills for a specific occupation
 */
router.get('/skills/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    const occupation = await OnetOccupation.findOne({ code })
      .select('code title skills');

    if (!occupation) {
      return res.status(404).json({
        success: false,
        error: 'Occupation not found'
      });
    }

    res.json({
      success: true,
      code: occupation.code,
      title: occupation.title,
      skills: occupation.skills
    });
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch skills',
      message: error.message
    });
  }
});

/**
 * GET /api/onet/search
 * Search occupations by skills, title, or keywords
 */
router.get('/search', async (req, res) => {
  try {
    const { q, skills, minJobZone, maxJobZone, limit = 20 } = req.query;

    let query = {};

    // Text search
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { 'skills.name': { $regex: q, $options: 'i' } }
      ];
    }

    // Skills filter
    if (skills) {
      const skillArray = skills.split(',').map(s => s.trim());
      query['skills.name'] = { $in: skillArray.map(s => new RegExp(s, 'i')) };
    }

    // Job zone filter
    if (minJobZone || maxJobZone) {
      query.jobZone = {};
      if (minJobZone) query.jobZone.$gte = parseInt(minJobZone);
      if (maxJobZone) query.jobZone.$lte = parseInt(maxJobZone);
    }

    const occupations = await OnetOccupation.find(query)
      .select('code title description skills jobZone education')
      .limit(parseInt(limit))
      .sort({ title: 1 });

    res.json({
      success: true,
      results: occupations,
      count: occupations.length
    });
  } catch (error) {
    console.error('Error searching occupations:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error.message
    });
  }
});

/**
 * GET /api/onet/match-skills
 * Match user skills to occupations
 */
router.post('/match-skills', async (req, res) => {
  try {
    const { skills, limit = 10 } = req.body;

    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Skills array is required'
      });
    }

    // Find occupations that match the user's skills
    const occupations = await OnetOccupation.find({
      'skills.name': { $in: skills.map(s => new RegExp(s, 'i')) }
    }).select('code title description skills jobZone');

    // Calculate match scores
    const matches = occupations.map(occ => {
      const matchedSkills = occ.skills.filter(skill =>
        skills.some(userSkill => 
          skill.name.toLowerCase().includes(userSkill.toLowerCase())
        )
      );

      const matchScore = (matchedSkills.length / skills.length) * 100;

      return {
        code: occ.code,
        title: occ.title,
        description: occ.description,
        jobZone: occ.jobZone,
        matchScore: Math.round(matchScore),
        matchedSkills: matchedSkills.map(s => s.name),
        totalSkills: occ.skills.length
      };
    });

    // Sort by match score
    matches.sort((a, b) => b.matchScore - a.matchScore);

    res.json({
      success: true,
      matches: matches.slice(0, parseInt(limit)),
      totalMatches: matches.length
    });
  } catch (error) {
    console.error('Error matching skills:', error);
    res.status(500).json({
      success: false,
      error: 'Skill matching failed',
      message: error.message
    });
  }
});

/**
 * GET /api/onet/stats
 * Get database statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const totalOccupations = await OnetOccupation.countDocuments();
    const lastUpdated = await OnetOccupation.findOne()
      .sort({ lastUpdated: -1 })
      .select('lastUpdated');

    res.json({
      success: true,
      stats: {
        totalOccupations,
        lastUpdated: lastUpdated?.lastUpdated || null,
        dataSource: 'O*NET Database'
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats',
      message: error.message
    });
  }
});

export default router;
