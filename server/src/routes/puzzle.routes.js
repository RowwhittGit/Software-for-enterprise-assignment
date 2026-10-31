/**
 * Purpose: Puzzle API routes for fetching puzzle and submitting answer
 * AI-assisted (Antigravity) — reviewed by student
 */

const express = require('express');
const router = express.Router();
const puzzleController = require('../controllers/puzzle.controller');
const requireAuth = require('../middleware/requireAuth');

// Protect all puzzle endpoints: requires valid JWT Authorization: Bearer <access-token>
router.use(requireAuth);

// GET /api/puzzle?difficulty= - fetch new puzzle challenge
router.get('/', puzzleController.getPuzzleHandler);

// POST /api/puzzle/answer - submit answer for verification
router.post('/answer', puzzleController.checkAnswerHandler);

module.exports = router;
