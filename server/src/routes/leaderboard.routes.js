/**
 * Purpose: Express router definitions for leaderboard endpoints and real-time SSE stream
 */

const express = require('express');
const { getLeaderboard, streamLeaderboard } = require('../controllers/score.controller');

const router = express.Router();

// Public real-time Server-Sent Events stream
router.get('/stream', streamLeaderboard);

// Public leaderboard top 10 snapshot
router.get('/', getLeaderboard);

module.exports = router;
