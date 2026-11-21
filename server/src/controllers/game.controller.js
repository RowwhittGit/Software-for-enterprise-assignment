/**
 * Purpose: Game controller handling server-authoritative sessions, puzzles, answers, and game completion
 * AI-assisted (Antigravity) — reviewed by student
 */

const mongoose = require('mongoose');
const GameSession = require('../models/GameSession');
const bananaService = require('../services/bananaService');
const puzzleStore = require('../services/puzzleStore');

const ALLOWED_DIFFICULTIES = ['easy', 'medium', 'hard'];

/**
 * Validates whether a given string is a valid MongoDB ObjectId.
 * @param {string} id
 * @returns {boolean}
 */
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Handles POST /api/game/start
 * Initializes a new server-side game session for the authenticated user.
 * If the user already has an active session, purges/deletes it without saving score.
 */
async function startGameSession(req, res) {
  try {
    const userId = req.user && req.user.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User is not authenticated' });
    }

    const difficulty = (req.body && req.body.difficulty ? req.body.difficulty : 'easy').toLowerCase();
    if (!ALLOWED_DIFFICULTIES.includes(difficulty)) {
      return res.status(400).json({
        error: `Invalid difficulty '${difficulty}'. Allowed values: ${ALLOWED_DIFFICULTIES.join(', ')}`,
      });
    }

    // Clean up any previously active session for this user to ensure only one active game at a time
    await GameSession.deleteMany({ user: userId, status: 'active' });

    // Create fresh server-managed game session
    const session = new GameSession({
      user: userId,
      difficulty,
      lives: 3,
      score: 0,
      correctAnswers: 0,
      puzzlesAttempted: 0,
      currentPuzzleId: null,
      status: 'active',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    await session.save();

    return res.status(201).json({
      sessionId: session._id,
      lives: session.lives,
      score: session.score,
      difficulty: session.difficulty,
    });
  } catch (error) {
    console.error('Error starting game session:', error.message);
    return res.status(500).json({ error: 'Internal server error while starting game session' });
  }
}

/**
 * Handles GET /api/game/:sessionId/puzzle
 * Fetches a visual puzzle challenge from Banana API and binds it to the current game session.
 * Never exposes the solution to the client.
 */
async function getPuzzleForSession(req, res) {
  try {
    const userId = req.user && req.user.userId;
    const { sessionId } = req.params;

    if (!isValidObjectId(sessionId)) {
      return res.status(400).json({ error: 'Invalid sessionId format' });
    }

    const session = await GameSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Game session not found' });
    }

    // Verify session belongs to authenticated user
    if (session.user.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized: Game session does not belong to user' });
    }

    // Reject if session is finished or has no lives remaining
    if (session.status === 'finished' || session.lives <= 0) {
      return res.status(400).json({ error: 'Game session is finished or out of lives' });
    }

    // Clean up any previously active puzzle for this session in memory
    if (session.currentPuzzleId) {
      puzzleStore.removePuzzle(session.currentPuzzleId);
    }

    // Interoperability: Call external Banana API
    const puzzle = await bananaService.fetchPuzzle();

    // Store solution securely server-side linked to this session
    const { puzzleId, timeLimit } = puzzleStore.savePuzzle(
      puzzle.solution,
      session.difficulty,
      session._id
    );

    // Update active puzzle ID on session and refresh TTL
    session.currentPuzzleId = puzzleId;
    session.touch();
    await session.save();

    return res.status(200).json({
      puzzleId,
      question: puzzle.question,
      timeLimit,
    });
  } catch (error) {
    console.error('Error retrieving puzzle for session:', error.message);
    return res.status(502).json({
      error: 'Failed to retrieve puzzle from external service. Please try again.',
    });
  }
}

module.exports = {
  startGameSession,
  getPuzzleForSession,
};
