/**
 * Purpose: Game session routing definition with authentication middleware
 * AI-assisted (Antigravity) — reviewed by student
 */

const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const gameController = require('../controllers/game.controller');

// All game session endpoints require a verified JWT access token
router.use(requireAuth);

// Start a new game session
router.post('/start', gameController.startGameSession);

// Fetch a puzzle for an active game session
router.get('/:sessionId/puzzle', gameController.getPuzzleForSession);

// Submit an answer for the current puzzle
router.post('/:sessionId/answer', gameController.submitSessionAnswer);

module.exports = router;
