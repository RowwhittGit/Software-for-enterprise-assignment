/**
 * Purpose: Puzzle API routes for fetching puzzle and submitting answer
 * AI-assisted (Antigravity) — reviewed by student
 */

const express = require('express');
const router = express.Router();
const puzzleController = require('../controllers/puzzle.controller');

// Authentication middleware will be attached here in Step 5:
// const requireAuth = require('../middleware/requireAuth');
// router.use(requireAuth);

// GET /api/puzzle?difficulty= - fetch new puzzle challenge
router.get('/', puzzleController.getPuzzleHandler);

module.exports = router;
