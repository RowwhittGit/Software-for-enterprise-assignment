/**
 * Purpose: Controller functions for saving game scores and viewing player history
 * AI-assisted (Antigravity) — reviewed by student
 */

const Score = require('../models/Score');
const User = require('../models/User');

/**
 * Saves a completed game score for the authenticated user and updates personal best
 * POST /api/scores
 */
async function saveScore(req, res) {
  try {
    const { score, correctAnswers, difficulty } = req.body;
    const userId = req.user && req.user.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User is not authenticated' });
    }

    // Input validation
    if (typeof score !== 'number' || score < 0 || !Number.isInteger(score)) {
      return res.status(400).json({ error: 'Score must be a non-negative integer' });
    }

    if (typeof correctAnswers !== 'number' || correctAnswers < 0 || !Number.isInteger(correctAnswers)) {
      return res.status(400).json({ error: 'Correct answers count must be a non-negative integer' });
    }

    const validDifficulties = ['easy', 'medium', 'hard'];
    if (!validDifficulties.includes(difficulty)) {
      return res.status(400).json({ error: 'Difficulty must be easy, medium, or hard' });
    }

    // Create and save new score document
    const newScore = new Score({
      user: userId,
      score,
      correctAnswers,
      difficulty,
    });

    await newScore.save();

    // Check and update user's personal high score if beaten
    const user = await User.findById(userId);
    let isNewHighScore = false;
    let personalBest = user ? (user.highScore || 0) : 0;

    if (user && score > personalBest) {
      user.highScore = score;
      await user.save();
      isNewHighScore = true;
      personalBest = score;
    }

    return res.status(201).json({
      message: 'Score saved successfully',
      score: {
        id: newScore._id,
        score: newScore.score,
        correctAnswers: newScore.correctAnswers,
        difficulty: newScore.difficulty,
        createdAt: newScore.createdAt,
      },
      isNewHighScore,
      highScore: personalBest,
    });
  } catch (error) {
    console.error('Error saving score:', error.message);
    return res.status(500).json({ error: 'Internal server error while saving score' });
  }
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

module.exports = {
  saveScore,
  getMyScores,
};
