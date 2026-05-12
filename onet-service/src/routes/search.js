import express from 'express';
import Occupation from '../models/Occupation.js';

const router = express.Router();

/**
 * GET /api/search
 * Search occupations by skills, title, or keywords
 */
router.get('/', async (req, res) => {
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

    const occupations = await Occupation.find(query)
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
 * POST /api/search/match-skills
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
    const occupations = await Occupation.find({
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

export default router;
