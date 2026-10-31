/**
 * Purpose: Express router definitions for score recording and retrieval endpoints
 * AI-assisted (Antigravity) — reviewed by student
 */

const express = require('express');
const { saveScore } = require('../controllers/score.controller');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// Record a completed game score (protected by JWT authentication)
router.post('/', requireAuth, saveScore);

module.exports = router;
