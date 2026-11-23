/**
 * Purpose: Core game loop and state management with difficulty selection, lives, and scoring
 */

// Game state variables
let currentDifficulty = 'easy';
let currentSessionId = null;
let currentPuzzleId = null;
let isGameActive = false;
let lives = 3;
let currentScore = 0;
let correctAnswersCount = 0;
let isRoundProcessing = false;

// Difficulty configuration (time limit in seconds and label)
const DIFFICULTY_CONFIG = {
  easy: { timeLimit: 30, label: 'Easy' },
  medium: { timeLimit: 20, label: 'Medium' },
  hard: { timeLimit: 10, label: 'Hard' },
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

  // Load player's recent scores history if already authenticated
  if (window.API && window.API.getAccessToken()) {
    loadUserScores();
  }
});

/**
 * Displays a non-intrusive floating toast notification to the user
 */
function showToast(message, type = 'error') {
  let toast = document.getElementById('game-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'game-toast';
    toast.className = 'game-toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.className = `game-toast toast-visible toast-${type}`;

  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('toast-visible');
  }, 3500);
}

/**
 * Resets the UI back to the initial start screen (e.g. after session expiration)
 */
function resetToStartScreen() {
  if (window.Timer) {
    window.Timer.stopTimer();
  }
  isGameActive = false;
  isRoundProcessing = false;
  currentSessionId = null;
  currentPuzzleId = null;

  const startScreen = document.getElementById('start-screen');
  const playArea = document.getElementById('play-area');
  const gameOverScreen = document.getElementById('game-over-screen');

  if (playArea) playArea.classList.add('hidden');
  if (gameOverScreen) gameOverScreen.classList.add('hidden');
  if (startScreen) startScreen.classList.remove('hidden');
  hideFeedback();
}

/**
 * Initializes and starts a new server-managed game session
 */
async function startGame() {
  const startScreen = document.getElementById('start-screen');
  const playArea = document.getElementById('play-area');
  const gameOverScreen = document.getElementById('game-over-screen');
  const difficultyBadge = document.getElementById('active-difficulty-badge');
  const btnStart = document.getElementById('btn-start-game');
  const btnPlayAgain = document.getElementById('btn-play-again');

  if (!window.API) {
    showToast('Application client error. Please refresh.', 'error');
    return;
  }

  if (btnStart) btnStart.disabled = true;
  if (btnPlayAgain) btnPlayAgain.disabled = true;

  try {
    // Request the server to create and initialize the game session
    const sessionData = await window.API.jsonFetch('/api/game/start', {
      method: 'POST',
      body: { difficulty: currentDifficulty },
    });

    currentSessionId = sessionData.sessionId;
    lives = sessionData.lives;
    currentScore = sessionData.score;
    correctAnswersCount = 0;
    isRoundProcessing = false;
    isGameActive = true;

    if (startScreen) startScreen.classList.add('hidden');
    if (gameOverScreen) gameOverScreen.classList.add('hidden');
    if (playArea) playArea.classList.remove('hidden');

    // Reset timer and HUD indicators
    if (window.Timer) {
      window.Timer.resetTimer();
    }
    const config = DIFFICULTY_CONFIG[currentDifficulty] || DIFFICULTY_CONFIG.easy;
    if (difficultyBadge) difficultyBadge.textContent = config.label;
    updateTimerDisplay(config.timeLimit);

    updateLivesDisplay();
    updateScoreDisplay();
    hideFeedback();

    await fetchAndDisplayPuzzle();
  } catch (err) {
    console.error('Failed to start game session:', err);
    showToast(err.message || 'Failed to start game session. Please try again.', 'error');
    resetToStartScreen();
  } finally {
    if (btnStart) btnStart.disabled = false;
    if (btnPlayAgain) btnPlayAgain.disabled = false;
  }
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
 * Updates the HUD timer element with remaining seconds and toggles warning style
 */
function updateTimerDisplay(secondsLeft) {
  const timerDisplay = document.getElementById('timer-display');
  if (!timerDisplay) return;

  const displaySeconds = Math.max(0, secondsLeft);
  timerDisplay.textContent = `${displaySeconds}s`;

  if (displaySeconds <= 5) {
    timerDisplay.classList.add('timer-warning');
  } else {
    timerDisplay.classList.remove('timer-warning');
  }
}

/**
 * Handles round timeout event when countdown expires:
 * Reports timeout to server, updates state from response, and advances or ends game.
 */
async function handleRoundTimeout() {
  if (!isGameActive || isRoundProcessing || !currentSessionId) return;
  isRoundProcessing = true;

  // Stop timer and disable inputs
  if (window.Timer) {
    window.Timer.stopTimer();
  }
  const answerInput = document.getElementById('answer-input');
  const submitBtn = document.getElementById('btn-submit-answer');
  if (answerInput) answerInput.disabled = true;
  if (submitBtn) submitBtn.disabled = true;

  try {
    const result = await window.API.jsonFetch(`/api/game/${currentSessionId}/answer`, {
      method: 'POST',
      body: {
        puzzleId: currentPuzzleId,
        timedOut: true,
      },
    });

    lives = result.lives;
    currentScore = result.score;
    correctAnswersCount = result.correctAnswers;
    updateLivesDisplay();
    updateScoreDisplay();

    showFeedback("Time's up! ⏰ (-1 life)", 'wrong');

    if (result.gameOver || lives <= 0) {
      setTimeout(() => {
        endGame();
      }, 1000);
    } else {
      setTimeout(() => {
        hideFeedback();
        if (isGameActive) fetchAndDisplayPuzzle();
      }, 900);
    }
  } catch (err) {
    console.error('Error reporting timeout to server:', err.message);
    if (err.status === 404 || err.status === 400) {
      showToast('Game session ended or expired.', 'error');
      resetToStartScreen();
      return;
    }
    lives = Math.max(0, lives - 1);
    updateLivesDisplay();
    if (lives <= 0) {
      endGame();
    } else {
      setTimeout(() => {
        hideFeedback();
        if (isGameActive) fetchAndDisplayPuzzle();
      }, 900);
    }
  }
}

/**
 * Fetches a visual puzzle for the active game session and renders it inside the game arena.
 */
async function fetchAndDisplayPuzzle() {
  if (!currentSessionId) {
    resetToStartScreen();
    return;
  }

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

  // Stop active timer
  if (window.Timer) {
    window.Timer.stopTimer();
  }

  try {
    const data = await window.API.jsonFetch(`/api/game/${currentSessionId}/puzzle`);

    currentPuzzleId = data.puzzleId;
    const timeLimit = data.timeLimit;
    updateTimerDisplay(timeLimit);

    if (puzzleImg) {
      puzzleImg.onload = () => {
        isRoundProcessing = false;
        if (puzzleSpinner) puzzleSpinner.classList.add('hidden');
        puzzleImg.classList.remove('hidden');
        if (answerInput) {
          answerInput.disabled = false;
          answerInput.focus();
        }
        if (submitBtn) submitBtn.disabled = false;

        // Start countdown timer with server timeLimit
        if (window.Timer) {
          window.Timer.startTimer(
            timeLimit,
            (secondsLeft) => updateTimerDisplay(secondsLeft),
            () => handleRoundTimeout()
          );
        }
      };
      puzzleImg.src = data.question;
    }
  } catch (err) {
    console.error('Failed to load puzzle:', err.message);
    if (window.Timer) {
      window.Timer.stopTimer();
    }

    if (err.status === 404 || err.status === 400) {
      showToast('Game session expired or invalid. Returning to menu.', 'error');
      resetToStartScreen();
      return;
    }

    if (puzzleSpinner) {
      puzzleSpinner.textContent = 'Failed to load puzzle. Please check your connection and refresh.';
    }
  }
}

/**
 * Submits the player's answer to the server for authoritative verification
 */
async function handleAnswerSubmit() {
  if (!isGameActive || !currentPuzzleId || isRoundProcessing || !currentSessionId) return;

  const answerInput = document.getElementById('answer-input');
  const submitBtn = document.getElementById('btn-submit-answer');
  const rawAnswer = answerInput ? answerInput.value.trim() : '';

  if (rawAnswer === '') {
    showFeedback('Please enter a digit from 0 to 9.', 'wrong');
    return;
  }

  const answer = parseInt(rawAnswer, 10);
  if (isNaN(answer) || answer < 0 || answer > 9) {
    showFeedback('Answer must be a single digit (0-9).', 'wrong');
    return;
  }

  isRoundProcessing = true;

  // Stop timer immediately on answer submission
  if (window.Timer) {
    window.Timer.stopTimer();
  }

  // Disable controls during server roundtrip
  if (answerInput) answerInput.disabled = true;
  if (submitBtn) submitBtn.disabled = true;

  try {
    const result = await window.API.jsonFetch(`/api/game/${currentSessionId}/answer`, {
      method: 'POST',
      body: {
        puzzleId: currentPuzzleId,
        answer,
        timedOut: false,
      },
    });

    lives = result.lives;
    currentScore = result.score;
    correctAnswersCount = result.correctAnswers;
    updateLivesDisplay();
    updateScoreDisplay();

    if (result.correct) {
      const earnedBonus = result.pointsEarned ? ` +${result.pointsEarned} pts` : '';
      showFeedback(`Correct!${earnedBonus} 🎉`, 'correct');

      setTimeout(() => {
        hideFeedback();
        if (isGameActive) fetchAndDisplayPuzzle();
      }, 800);
    } else {
      const reason = result.timedOut ? "Time's up! ⏰ (-1 life)" : 'Wrong answer! ❌ (-1 life)';
      showFeedback(reason, 'wrong');

      if (result.gameOver || lives <= 0) {
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
    if (err.status === 404 || err.status === 400) {
      showToast('Game session ended or expired.', 'error');
      resetToStartScreen();
      return;
    }
    showFeedback('Error verifying answer. Retrying...', 'wrong');
    setTimeout(() => {
      hideFeedback();
      if (isGameActive) fetchAndDisplayPuzzle();
    }, 1000);
  }
}

/**
 * Concludes the game session and finalizes authoritative scores via the server
 */
async function endGame() {
  const sessionIdToFinish = currentSessionId;

  isGameActive = false;
  isRoundProcessing = false;
  currentSessionId = null;

  // Stop timer and remove warning indicators
  if (window.Timer) {
    window.Timer.stopTimer();
  }
  const timerDisplay = document.getElementById('timer-display');
  if (timerDisplay) {
    timerDisplay.classList.remove('timer-warning');
  }

  const playArea = document.getElementById('play-area');
  const gameOverScreen = document.getElementById('game-over-screen');
  const finalScoreEl = document.getElementById('final-score');
  const finalCorrectEl = document.getElementById('final-correct');
  const finalDiffEl = document.getElementById('final-difficulty');
  const highScoreAlert = document.getElementById('high-score-alert');
  const navHighScore = document.getElementById('current-high-score');

  if (playArea) playArea.classList.add('hidden');
  hideFeedback();

  if (highScoreAlert) {
    highScoreAlert.classList.add('hidden');
  }

  // Pre-fill preliminary client values while waiting for final server confirmation
  if (finalScoreEl) finalScoreEl.textContent = currentScore;
  if (finalCorrectEl) finalCorrectEl.textContent = correctAnswersCount;
  if (finalDiffEl) {
    const config = DIFFICULTY_CONFIG[currentDifficulty] || DIFFICULTY_CONFIG.easy;
    finalDiffEl.textContent = config.label;
  }

  if (gameOverScreen) gameOverScreen.classList.remove('hidden');

  if (sessionIdToFinish) {
    try {
      const result = await window.API.jsonFetch(`/api/game/${sessionIdToFinish}/finish`, {
        method: 'POST',
      });

      if (finalScoreEl) finalScoreEl.textContent = result.score;
      if (finalCorrectEl) finalCorrectEl.textContent = result.correctAnswers;
      if (finalDiffEl && result.difficulty) {
        finalDiffEl.textContent = result.difficulty.charAt(0).toUpperCase() + result.difficulty.slice(1);
      }

      if (result.isNewHighScore) {
        if (highScoreAlert) {
          highScoreAlert.textContent = `🎉 New Personal Best: ${result.highScore} pts!`;
          highScoreAlert.classList.remove('hidden');
        }
        if (navHighScore) {
          navHighScore.textContent = result.highScore;
        }
        sessionStorage.setItem('banana_high_score', result.highScore);
      }

      // Refresh recent scores history and global leaderboard
      await loadUserScores();
      if (window.Leaderboard && typeof window.Leaderboard.fetchAndRenderLeaderboard === 'function') {
        window.Leaderboard.fetchAndRenderLeaderboard();
      }
    } catch (err) {
      console.error('Failed to finalize game session on server:', err.message);
      showToast('Failed to record final game score on server.', 'error');
    }
  }
}

/**
 * Fetches recent games and verified personal best from GET /api/scores/me
 * and renders them in the dashboard sidebar
 */
async function loadUserScores() {
  const container = document.getElementById('recent-scores-container');
  const navHighScore = document.getElementById('current-high-score');
  if (!container) return;

  try {
    const data = await window.API.jsonFetch('/api/scores/me');

    if (data && typeof data.highScore === 'number' && navHighScore) {
      navHighScore.textContent = data.highScore;
      sessionStorage.setItem('banana_high_score', data.highScore);
    }

    if (!data || !data.recentScores || data.recentScores.length === 0) {
      container.innerHTML = '<p class="text-muted text-small">No games played yet. Complete a game to see your history!</p>';
      return;
    }

    const itemsHtml = data.recentScores
      .map((item) => {
        const date = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const diffLabel = item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1);
        return `
          <div class="recent-score-item">
            <div class="recent-score-info">
              <span class="recent-score-points">${item.score} pts</span>
              <span class="badge badge-diff-${item.difficulty}">${diffLabel}</span>
            </div>
            <div class="recent-score-meta">
              <span>${item.correctAnswers} solved</span> &bull; <span>${date}</span>
            </div>
          </div>
        `;
      })
      .join('');

    container.innerHTML = `<div class="recent-scores-list">${itemsHtml}</div>`;
  } catch (err) {
    console.warn('Failed to load recent scores:', err.message);
  }
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

// Clean up timer intervals if player navigates away or closes page
window.addEventListener('beforeunload', () => {
  if (window.Timer) {
    window.Timer.stopTimer();
  }
});

// Export for module accessibility
window.Game = {
  startGame,
  endGame,
  fetchAndDisplayPuzzle,
  handleAnswerSubmit,
  loadUserScores,
  showFeedback,
  showToast,
  resetToStartScreen,
  getDifficulty: () => currentDifficulty,
  getScore: () => currentScore,
  getLives: () => lives,
};
