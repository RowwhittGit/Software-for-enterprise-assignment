/**
 * Purpose: Express router definitions for score recording and retrieval endpoints
 * AI-assisted (Antigravity) — reviewed by student
 */

const express = require('express');
const { saveScore, getMyScores, getLeaderboard } = require('../controllers/score.controller');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// Record a completed game score (protected by JWT authentication)
router.post('/', requireAuth, saveScore);

// Retrieve personal high score and recent game history (protected by JWT authentication)
router.get('/me', requireAuth, getMyScores);

// Retrieve global top 10 leaderboard (public, no authentication required)
router.get('/leaderboard', getLeaderboard);

module.exports = router;
