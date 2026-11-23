/**
 * Purpose: Game controller handling server-authoritative sessions, puzzles, answers, and game completion
 */

const mongoose = require('mongoose');
const GameSession = require('../models/GameSession');
const Score = require('../models/Score');
const User = require('../models/User');
const bananaService = require('../services/bananaService');
const puzzleStore = require('../services/puzzleStore');
const scoringService = require('../services/scoring');

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

/**
 * Handles POST /api/game/:sessionId/answer
 * Body: { puzzleId, answer, timedOut? }
 * Verifies puzzleId against the session's active puzzle, enforces time limits + grace period,
 * updates server-authoritative score and lives, removes puzzle to prevent replay,
 * and returns { correct, score, lives, correctAnswers, gameOver }.
 */
async function submitSessionAnswer(req, res) {
  try {
    const userId = req.user && req.user.userId;
    const { sessionId } = req.params;
    const { puzzleId, answer, timedOut } = req.body || {};

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

    // Refuse if already finished or no lives left
    if (session.status === 'finished' || session.lives <= 0) {
      return res.status(400).json({
        error: 'Game session is finished or out of lives',
        gameOver: true,
      });
    }

    // Verify puzzleId matches the session's current active puzzle
    if (!puzzleId || typeof puzzleId !== 'string' || puzzleId !== session.currentPuzzleId) {
      return res.status(400).json({
        error: 'Puzzle not found, expired, or already answered',
      });
    }

    // Retrieve solution and timestamps from server-side memory store
    const puzzle = puzzleStore.getPuzzle(puzzleId);

    // Invalidate puzzle from memory immediately to prevent replay submissions
    puzzleStore.removePuzzle(puzzleId);
    session.currentPuzzleId = null;
    session.puzzlesAttempted += 1;

    let isCorrect = false;

    // Check if client explicitly reported a timeout
    const isClientTimeout = timedOut === true || timedOut === 'true';

    if (isClientTimeout || !puzzle) {
      // Timeout or expired puzzle costs one life
      session.lives = Math.max(0, session.lives - 1);
      isCorrect = false;
    } else {
      const elapsedSeconds = (Date.now() - puzzle.issuedAt) / 1000;

      // Time limit check: reject if elapsed time exceeds limit plus grace period
      if (elapsedSeconds > puzzle.timeLimit + puzzleStore.GRACE_PERIOD_SECONDS) {
        // Late answer counts as wrong and costs a life
        session.lives = Math.max(0, session.lives - 1);
        isCorrect = false;
      } else {
        // Check numerical answer against server solution
        const numericAnswer = parseInt(answer, 10);
        if (!isNaN(numericAnswer) && numericAnswer === puzzle.solution) {
          isCorrect = true;
          session.correctAnswers += 1;
          const pointsEarned = scoringService.calculatePoints(
            session.difficulty,
            puzzle.issuedAt,
            puzzle.timeLimit
          );
          session.score += pointsEarned;
        } else {
          // Wrong answer costs one life
          session.lives = Math.max(0, session.lives - 1);
          isCorrect = false;
        }
      }
    }

    const gameOver = session.lives <= 0;
    if (gameOver) {
      session.status = 'finished';
    }

    // Refresh TTL on player action
    session.touch();
    await session.save();

    return res.status(200).json({
      correct: isCorrect,
      score: session.score,
      lives: session.lives,
      correctAnswers: session.correctAnswers,
      gameOver,
    });
  } catch (error) {
    console.error('Error submitting session answer:', error.message);
    return res.status(500).json({ error: 'Internal server error while processing answer' });
  }
}

/**
 * Handles POST /api/game/:sessionId/finish
 * Concludes the game session when lives reach 0 or player decides to quit.
 * Persists the Score document using server-verified stats, updates user's personal best if beaten,
 * deletes the active game session, and returns { score, correctAnswers, difficulty, isNewHighScore, highScore }.
 */
async function finishGameSession(req, res) {
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

    // Clean up any pending puzzle in memory
    if (session.currentPuzzleId) {
      puzzleStore.removePuzzle(session.currentPuzzleId);
    }

    // Create and save permanent Score record from server-authoritative session values
    const newScore = new Score({
      user: session.user,
      score: session.score,
      correctAnswers: session.correctAnswers,
      puzzlesAttempted: session.puzzlesAttempted,
      difficulty: session.difficulty,
    });
    await newScore.save();

    // Check and update user's personal high score in database if beaten
    const user = await User.findById(userId);
    let isNewHighScore = false;
    let personalBest = user ? (user.highScore || 0) : 0;

    if (user && session.score > personalBest) {
      user.highScore = session.score;
      await user.save();
      isNewHighScore = true;
      personalBest = session.score;
    }

    // Delete completed game session from database
    await GameSession.findByIdAndDelete(session._id);

    return res.status(200).json({
      score: session.score,
      correctAnswers: session.correctAnswers,
      difficulty: session.difficulty,
      isNewHighScore,
      highScore: personalBest,
    });
  } catch (error) {
    console.error('Error finishing game session:', error.message);
    return res.status(500).json({ error: 'Internal server error while concluding game session' });
  }
}

module.exports = {
  startGameSession,
  getPuzzleForSession,
  submitSessionAnswer,
  finishGameSession,
};
