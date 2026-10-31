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

module.exports = {
  saveScore,
};
