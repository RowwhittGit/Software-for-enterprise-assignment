/**
 * Purpose: Controller functions for saving game scores, viewing player history, and global leaderboard
 */

const Score = require('../models/Score');
const User = require('../models/User');
const leaderboardEvents = require('../services/leaderboardEvents');

/**
 * Rejects direct score submissions to prevent client tampering.
 * Authoritative scores are recorded exclusively via POST /api/game/:sessionId/finish.
 * POST /api/scores
 */
async function saveScore(req, res) {
  return res.status(403).json({
    error: 'Scores must be submitted through game sessions',
  });
}

/**
 * Retrieves the authenticated player's personal high score and recent games
 * GET /api/scores/me
 */
async function getMyScores(req, res) {
  try {
    const userId = req.user && req.user.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User is not authenticated' });
    }

    // Fetch user profile to read verified high score
    const user = await User.findById(userId).select('highScore username');
    const highScore = user ? (user.highScore || 0) : 0;

    // Fetch last 10 games completed by this user, ordered by most recent first
    const scores = await Score.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const recentScores = scores.map((s) => ({
      id: s._id,
      score: s.score,
      correctAnswers: s.correctAnswers,
      difficulty: s.difficulty,
      createdAt: s.createdAt,
    }));

    return res.status(200).json({
      highScore,
      recentScores,
    });
  } catch (error) {
    console.error('Error fetching player scores:', error.message);
    return res.status(500).json({ error: 'Internal server error while fetching scores' });
  }
}

/**
 * Shared database query for top 10 per-player-best leaderboard entries.
 * Uses an aggregation pipeline so each player appears only once with their highest score.
 * @returns {Promise<Array>}
 */
async function fetchTopLeaderboard() {
  const scores = await Score.aggregate([
    // 1. Sort all scores descending by score, breaking ties by earliest timestamp
    { $sort: { score: -1, createdAt: 1 } },
    // 2. Group by user, preserving the highest score per user
    {
      $group: {
        _id: '$user',
        scoreId: { $first: '$_id' },
        user: { $first: '$user' },
        score: { $first: '$score' },
        correctAnswers: { $first: '$correctAnswers' },
        difficulty: { $first: '$difficulty' },
        createdAt: { $first: '$createdAt' },
      },
    },
    // 3. Sort unique player best scores descending
    { $sort: { score: -1, createdAt: 1 } },
    // 4. Limit to top 10 unique players
    { $limit: 10 },
    // 5. Look up player username from users collection
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userData',
      },
    },
    {
      $unwind: {
        path: '$userData',
        preserveNullAndEmptyArrays: true,
      },
    },
  ]);

  return scores.map((entry, index) => ({
    rank: index + 1,
    id: entry.scoreId,
    username: entry.userData && entry.userData.username ? entry.userData.username : 'Anonymous',
    score: entry.score,
    correctAnswers: entry.correctAnswers,
    difficulty: entry.difficulty,
    createdAt: entry.createdAt,
  }));
}

/**
 * Retrieves the global top 10 scores with associated player usernames
 * GET /api/leaderboard (Public, no authentication required)
 */
async function getLeaderboard(req, res) {
  try {
    const leaderboard = await fetchTopLeaderboard();
    return res.status(200).json({
      leaderboard,
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error.message);
    return res.status(500).json({ error: 'Internal server error while fetching leaderboard' });
  }
}

/**
 * Server-Sent Events (SSE) stream for real-time leaderboard updates
 * GET /api/leaderboard/stream (Public, no authentication required)
 */
function streamLeaderboard(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  leaderboardEvents.addClient(res);

  req.on('close', () => {
    leaderboardEvents.removeClient(res);
  });
}

module.exports = {
  saveScore,
  getMyScores,
  fetchTopLeaderboard,
  getLeaderboard,
  streamLeaderboard,
};
