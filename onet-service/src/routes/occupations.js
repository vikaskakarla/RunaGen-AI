import express from 'express';
import Occupation from '../models/Occupation.js';

const router = express.Router();

/**
 * GET /api/occupations
 * Get all occupations with search and pagination
 */
router.get('/', async (req, res) => {
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

    const occupations = await Occupation.find(query)
      .select('code title description jobZone education')
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort({ title: 1 });

    const total = await Occupation.countDocuments(query);

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
 * GET /api/occupations/:code
 * Get detailed information for a specific occupation
 */
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    const occupation = await Occupation.findOne({ code });

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
 * GET /api/occupations/:code/skills
 * Get skills for a specific occupation
 */
router.get('/:code/skills', async (req, res) => {
  try {
    const { code } = req.params;
    
    const occupation = await Occupation.findOne({ code })
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

export default router;
