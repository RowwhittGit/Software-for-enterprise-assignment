/**
 * Purpose: Game session routing definition with authentication middleware
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

// Conclude game session and save final score
router.post('/:sessionId/finish', gameController.finishGameSession);

module.exports = router;
