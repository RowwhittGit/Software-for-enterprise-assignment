/**
 * Purpose: Core game loop and state management with difficulty selection, lives, and scoring
 * AI-assisted (Antigravity) — reviewed by student
 */

// Game state variables
let currentDifficulty = 'easy';
let currentPuzzleId = null;
let isGameActive = false;
let lives = 3;
let currentScore = 0;
let correctAnswersCount = 0;
let puzzleStartTime = null;

// Difficulty configuration (time limit in seconds and score multiplier)
const DIFFICULTY_CONFIG = {
  easy: { timeLimit: 30, multiplier: 1, label: 'Easy' },
  medium: { timeLimit: 20, multiplier: 1.5, label: 'Medium' },
  hard: { timeLimit: 10, multiplier: 2, label: 'Hard' },
};

document.addEventListener('DOMContentLoaded', () => {
  const btnStart = document.getElementById('btn-start-game');
  const btnPlayAgain = document.getElementById('btn-play-again');
  const answerForm = document.getElementById('answer-form');
  const diffButtons = document.querySelectorAll('.btn-diff');

  // Handle difficulty selection on start screen
  diffButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      diffButtons.forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });

      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');

      const chosen = btn.dataset.difficulty;
      if (DIFFICULTY_CONFIG[chosen]) {
        currentDifficulty = chosen;
      }
    });
  });

  if (btnStart) {
    btnStart.addEventListener('click', () => {
      startGame();
    });
  }

  if (btnPlayAgain) {
    btnPlayAgain.addEventListener('click', () => {
      startGame();
    });
  }

  // Handle answer submission via Enter key or Submit button click
  if (answerForm) {
    answerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleAnswerSubmit();
    });
  }
});

/**
 * Initializes and starts a new game session with selected difficulty, 3 lives, and reset score
 */
function startGame() {
  const startScreen = document.getElementById('start-screen');
  const playArea = document.getElementById('play-area');
  const gameOverScreen = document.getElementById('game-over-screen');
  const difficultyBadge = document.getElementById('active-difficulty-badge');
  const timerDisplay = document.getElementById('timer-display');

  if (startScreen) startScreen.classList.add('hidden');
  if (gameOverScreen) gameOverScreen.classList.add('hidden');
  if (playArea) playArea.classList.remove('hidden');

  // Update HUD difficulty label
  const config = DIFFICULTY_CONFIG[currentDifficulty] || DIFFICULTY_CONFIG.easy;
  if (difficultyBadge) difficultyBadge.textContent = config.label;
  if (timerDisplay) timerDisplay.textContent = `${config.timeLimit}s`;

  // Reset player session state
  lives = 3;
  currentScore = 0;
  correctAnswersCount = 0;
  updateLivesDisplay();
  updateScoreDisplay();
  hideFeedback();
  isGameActive = true;

  fetchAndDisplayPuzzle();
}

/**
 * Updates the lives indicator with heart icons (3 lives total)
 */
function updateLivesDisplay() {
  const livesDisplay = document.getElementById('lives-display');
  if (!livesDisplay) return;

  const fullHearts = '❤️'.repeat(Math.max(0, lives));
  const emptyHearts = '🤍'.repeat(Math.max(0, 3 - lives));
  livesDisplay.textContent = fullHearts + emptyHearts;
}

/**
 * Updates the current score display in the game HUD
 */
function updateScoreDisplay() {
  const scoreDisplay = document.getElementById('live-score-display');
  if (scoreDisplay) {
    scoreDisplay.textContent = currentScore;
  }
}

/**
 * Fetches a visual math equation puzzle from the server /api/puzzle endpoint
 * and renders it inside the game arena.
 */
async function fetchAndDisplayPuzzle() {
  const puzzleSpinner = document.getElementById('puzzle-loading');
  const puzzleImg = document.getElementById('puzzle-image');
  const answerInput = document.getElementById('answer-input');
  const submitBtn = document.getElementById('btn-submit-answer');

  // Reset UI controls while fetching
  if (puzzleSpinner) puzzleSpinner.classList.remove('hidden');
  if (puzzleImg) puzzleImg.classList.add('hidden');
  if (answerInput) {
    answerInput.disabled = true;
    answerInput.value = '';
  }
  if (submitBtn) submitBtn.disabled = true;

  try {
    const data = await window.API.jsonFetch(`/api/puzzle?difficulty=${currentDifficulty}`);

    currentPuzzleId = data.puzzleId;

    if (puzzleImg) {
      puzzleImg.onload = () => {
        if (puzzleSpinner) puzzleSpinner.classList.add('hidden');
        puzzleImg.classList.remove('hidden');
        if (answerInput) {
          answerInput.disabled = false;
          answerInput.focus();
        }
        if (submitBtn) submitBtn.disabled = false;

        // Record timestamp when the puzzle becomes visible to the player
        puzzleStartTime = Date.now();
      };
      puzzleImg.src = data.question;
    }
  } catch (err) {
    console.error('Failed to load puzzle:', err.message);
    if (puzzleSpinner) {
      puzzleSpinner.textContent = 'Failed to load puzzle. Please check your connection and refresh.';
    }
  }
}

/**
 * Calculates score earned for a correct answer:
 * base 10 + remaining seconds, multiplied by difficulty factor (hard x2, medium x1.5).
 */
function calculatePointsEarned() {
  const config = DIFFICULTY_CONFIG[currentDifficulty] || DIFFICULTY_CONFIG.easy;
  const elapsedSeconds = puzzleStartTime ? Math.max(0, Math.floor((Date.now() - puzzleStartTime) / 1000)) : 0;
  const remainingSeconds = Math.max(0, config.timeLimit - elapsedSeconds);

  return Math.round((10 + remainingSeconds) * config.multiplier);
}

/**
 * Validates and submits the player's answer to the server for verification
 */
async function handleAnswerSubmit() {
  if (!isGameActive || !currentPuzzleId) return;

  const answerInput = document.getElementById('answer-input');
  const submitBtn = document.getElementById('btn-submit-answer');
  const rawAnswer = answerInput.value.trim();

  if (rawAnswer === '') {
    showFeedback('Please enter a digit from 0 to 9.', 'wrong');
    return;
  }

  const answer = parseInt(rawAnswer, 10);
  if (isNaN(answer) || answer < 0 || answer > 9) {
    showFeedback('Answer must be a single digit (0-9).', 'wrong');
    return;
  }

  // Disable controls during server roundtrip
  answerInput.disabled = true;
  submitBtn.disabled = true;

  try {
    const result = await window.API.jsonFetch('/api/puzzle/answer', {
      method: 'POST',
      body: {
        puzzleId: currentPuzzleId,
        answer,
      },
    });

    if (result.correct) {
      correctAnswersCount++;
      const earned = calculatePointsEarned();
      currentScore += earned;
      updateScoreDisplay();

      showFeedback(`Correct! +${earned} pts 🎉`, 'correct');

      setTimeout(() => {
        hideFeedback();
        if (isGameActive) fetchAndDisplayPuzzle();
      }, 800);
    } else {
      // Deduct a life on incorrect answer or timeout
      lives--;
      updateLivesDisplay();

      const reason = result.timedOut ? "Time's up! ⏰ (-1 life)" : 'Wrong answer! ❌ (-1 life)';
      showFeedback(reason, 'wrong');

      if (lives <= 0) {
        setTimeout(() => {
          endGame();
        }, 1000);
      } else {
        setTimeout(() => {
          hideFeedback();
          if (isGameActive) fetchAndDisplayPuzzle();
        }, 900);
      }
    }
  } catch (err) {
    console.error('Error submitting answer:', err.message);
    showFeedback('Error verifying answer. Retrying...', 'wrong');
    setTimeout(() => {
      hideFeedback();
      if (isGameActive) fetchAndDisplayPuzzle();
    }, 1000);
  }
}

/**
 * Concludes the game session and presents the Game Over screen with final score
 */
function endGame() {
  isGameActive = false;

  const playArea = document.getElementById('play-area');
  const gameOverScreen = document.getElementById('game-over-screen');
  const finalScoreEl = document.getElementById('final-score');
  const finalCorrectEl = document.getElementById('final-correct');
  const finalDiffEl = document.getElementById('final-difficulty');

  if (playArea) playArea.classList.add('hidden');
  hideFeedback();

  if (finalScoreEl) finalScoreEl.textContent = currentScore;
  if (finalCorrectEl) finalCorrectEl.textContent = correctAnswersCount;
  if (finalDiffEl) {
    const config = DIFFICULTY_CONFIG[currentDifficulty] || DIFFICULTY_CONFIG.easy;
    finalDiffEl.textContent = config.label;
  }

  if (gameOverScreen) gameOverScreen.classList.remove('hidden');
}

/**
 * Displays feedback banner above the puzzle image
 */
function showFeedback(message, type) {
  const feedback = document.getElementById('game-feedback');
  if (!feedback) return;

  feedback.textContent = message;
  feedback.className = `game-feedback feedback-${type}`;
  feedback.classList.remove('hidden');
}

/**
 * Hides feedback banner
 */
function hideFeedback() {
  const feedback = document.getElementById('game-feedback');
  if (!feedback) return;

  feedback.classList.add('hidden');
  feedback.textContent = '';
}

// Export for module accessibility
window.Game = {
  startGame,
  endGame,
  fetchAndDisplayPuzzle,
  handleAnswerSubmit,
  showFeedback,
  getDifficulty: () => currentDifficulty,
  getScore: () => currentScore,
  getLives: () => lives,
};
