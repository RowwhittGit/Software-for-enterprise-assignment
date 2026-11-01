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
let isRoundProcessing = false;
let selectedDigit = null;

// Difficulty configuration (time limit in seconds and score multiplier)
const DIFFICULTY_CONFIG = {
  easy: { timeLimit: 30, multiplier: 1, label: 'Easy' },
  medium: { timeLimit: 20, multiplier: 1.5, label: 'Medium' },
  hard: { timeLimit: 10, multiplier: 2, label: 'Hard' },
};

document.addEventListener('DOMContentLoaded', () => {
  const btnStart = document.getElementById('btn-start-game');
  const btnPlayAgain = document.getElementById('btn-play-again');
  const btnRetryPuzzle = document.getElementById('btn-retry-puzzle');
  const btnSubmitAnswer = document.getElementById('btn-submit-answer');
  const btnNumpadClear = document.getElementById('btn-numpad-clear');
  const numpadDigits = document.querySelectorAll('.numpad-digit');
  const diffElements = document.querySelectorAll('.diff-select-card, .btn-diff');

  // Handle difficulty selection on start screen
  diffElements.forEach((el) => {
    function selectDiff() {
      diffElements.forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
        b.setAttribute('aria-checked', 'false');
      });

      el.classList.add('active');
      el.setAttribute('aria-pressed', 'true');
      el.setAttribute('aria-checked', 'true');

      const chosen = el.dataset.difficulty;
      if (DIFFICULTY_CONFIG[chosen]) {
        currentDifficulty = chosen;
      }
    }

    el.addEventListener('click', selectDiff);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectDiff();
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

  if (btnRetryPuzzle) {
    btnRetryPuzzle.addEventListener('click', () => {
      fetchAndDisplayPuzzle();
    });
  }

  // Handle number pad digit button clicks
  numpadDigits.forEach((btn) => {
    btn.addEventListener('click', () => {
      const digit = parseInt(btn.dataset.digit, 10);
      if (!isNaN(digit)) {
        selectDigit(digit);
      }
    });
  });

  // Handle number pad clear button click
  if (btnNumpadClear) {
    btnNumpadClear.addEventListener('click', () => {
      clearSelectedDigit();
    });
  }

  // Handle answer submission via keypad submit button
  if (btnSubmitAnswer) {
    btnSubmitAnswer.addEventListener('click', async () => {
      await handleAnswerSubmit();
    });
  }

  // Keyboard controls: 0-9 selects digit, Enter submits, Backspace/Esc clears
  document.addEventListener('keydown', async (e) => {
    if (!isGameActive || isRoundProcessing) return;

    // Do not intercept if user has focus inside an input or textarea
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      selectDigit(parseInt(e.key, 10));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedDigit !== null) {
        await handleAnswerSubmit();
      }
    } else if (e.key === 'Backspace' || e.key === 'Escape' || e.key === 'Delete') {
      e.preventDefault();
      clearSelectedDigit();
    }
  });

  // Load player's recent scores history if already authenticated
  if (window.API && window.API.getAccessToken()) {
    loadUserScores();
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

  if (startScreen) startScreen.classList.add('hidden');
  if (gameOverScreen) gameOverScreen.classList.add('hidden');
  if (playArea) playArea.classList.remove('hidden');

  // Reset timer module and HUD indicators
  if (window.Timer) {
    window.Timer.resetTimer();
  }
  const config = DIFFICULTY_CONFIG[currentDifficulty] || DIFFICULTY_CONFIG.easy;
  if (difficultyBadge) difficultyBadge.textContent = config.label;
  updateTimerDisplay(config.timeLimit);

  // Update HUD personal best
  const hudHighScore = document.getElementById('hud-high-score-display');
  if (hudHighScore) {
    hudHighScore.textContent = sessionStorage.getItem('banana_high_score') || '0';
  }

  // Reset player session state
  lives = 3;
  currentScore = 0;
  correctAnswersCount = 0;
  isRoundProcessing = false;
  clearSelectedDigit();
  setNumpadDisabled(true);
  updateLivesDisplay();
  updateScoreDisplay();
  hideFeedback();
  isGameActive = true;

  fetchAndDisplayPuzzle();
}

/**
 * Selects an answer digit (0-9), highlights the keypad button, and updates the preview
 * @param {number} digit - Chosen digit 0 through 9
 */
function selectDigit(digit) {
  if (!isGameActive || isRoundProcessing) return;
  selectedDigit = digit;

  const numpadDigits = document.querySelectorAll('.numpad-digit');
  numpadDigits.forEach((btn) => {
    if (btn.dataset.digit === String(digit)) {
      btn.classList.add('selected');
      btn.setAttribute('aria-pressed', 'true');
    } else {
      btn.classList.remove('selected');
      btn.setAttribute('aria-pressed', 'false');
    }
  });

  const previewBox = document.getElementById('answer-preview-box');
  const previewDigit = document.getElementById('selected-answer-digit');
  if (previewDigit) {
    previewDigit.textContent = String(digit);
    previewDigit.classList.remove('preview-placeholder');
  }
  if (previewBox) {
    previewBox.classList.add('has-value');
  }

  const submitBtn = document.getElementById('btn-submit-answer');
  if (submitBtn) {
    submitBtn.disabled = false;
  }
}

/**
 * Clears current digit selection and resets keypad state
 */
function clearSelectedDigit() {
  selectedDigit = null;

  const numpadDigits = document.querySelectorAll('.numpad-digit');
  numpadDigits.forEach((btn) => {
    btn.classList.remove('selected');
    btn.setAttribute('aria-pressed', 'false');
  });

  const previewBox = document.getElementById('answer-preview-box');
  const previewDigit = document.getElementById('selected-answer-digit');
  if (previewDigit) {
    previewDigit.textContent = '?';
    previewDigit.classList.add('preview-placeholder');
  }
  if (previewBox) {
    previewBox.classList.remove('has-value');
  }

  const submitBtn = document.getElementById('btn-submit-answer');
  if (submitBtn) {
    submitBtn.disabled = true;
  }
}

/**
 * Toggles disabled state of keypad buttons
 * @param {boolean} disabled
 */
function setNumpadDisabled(disabled) {
  const numpadBtns = document.querySelectorAll('.numpad-btn');
  numpadBtns.forEach((btn) => {
    if (btn.id === 'btn-submit-answer') {
      btn.disabled = disabled || selectedDigit === null;
    } else {
      btn.disabled = disabled;
    }
  });
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
 * Updates the HUD timer element and visual progress bar with remaining seconds
 */
function updateTimerDisplay(secondsLeft) {
  const timerDisplay = document.getElementById('timer-display');
  const timerBarFill = document.getElementById('timer-bar-fill');
  const config = DIFFICULTY_CONFIG[currentDifficulty] || DIFFICULTY_CONFIG.easy;
  const maxSeconds = config.timeLimit || 30;

  const displaySeconds = Math.max(0, secondsLeft);

  if (timerDisplay) {
    timerDisplay.textContent = `${displaySeconds}s`;

    if (displaySeconds <= 5) {
      timerDisplay.classList.add('timer-warning');
    } else {
      timerDisplay.classList.remove('timer-warning');
    }
  }

  // Update visual progress bar width and color transition
  if (timerBarFill) {
    const percentage = Math.max(0, Math.min(100, (displaySeconds / maxSeconds) * 100));
    timerBarFill.style.width = `${percentage}%`;

    timerBarFill.classList.remove('timer-bar-safe', 'timer-bar-warn', 'timer-bar-danger');
    if (percentage > 50) {
      timerBarFill.classList.add('timer-bar-safe');
    } else if (percentage > 25) {
      timerBarFill.classList.add('timer-bar-warn');
    } else {
      timerBarFill.classList.add('timer-bar-danger');
    }
  }
}

/**
 * Handles round timeout event when countdown expires:
 * Deducts one life, shows alert feedback, and advances to next puzzle or ends game.
 */
function handleRoundTimeout() {
  if (!isGameActive || isRoundProcessing) return;
  isRoundProcessing = true;

  // Disable keypad inputs on timeout
  setNumpadDisabled(true);

  // Deduct one life for running out of time
  lives--;
  updateLivesDisplay();

  showFeedback("Time's up! ⏰ (-1 life)", 'wrong');

  if (lives <= 0) {
    setTimeout(() => {
      endGame();
    }, 1000);
  } else {
    setTimeout(() => {
      hideFeedback();
      clearSelectedDigit();
      if (isGameActive) fetchAndDisplayPuzzle();
    }, 900);
  }
}

/**
 * Fetches a visual math equation puzzle from the server /api/puzzle endpoint
 * and renders it inside the game arena.
 */
async function fetchAndDisplayPuzzle() {
  const puzzleSpinner = document.getElementById('puzzle-loading');
  const puzzleImg = document.getElementById('puzzle-image');
  const puzzleError = document.getElementById('puzzle-error');

  // Reset UI controls while fetching
  if (puzzleSpinner) puzzleSpinner.classList.remove('hidden');
  if (puzzleImg) puzzleImg.classList.add('hidden');
  if (puzzleError) puzzleError.classList.add('hidden');
  setNumpadDisabled(true);
  clearSelectedDigit();

  // Stop any active timer and reset HUD display to starting time limit
  if (window.Timer) {
    window.Timer.stopTimer();
  }
  const roundConfig = DIFFICULTY_CONFIG[currentDifficulty] || DIFFICULTY_CONFIG.easy;
  updateTimerDisplay(roundConfig.timeLimit);

  try {
    const data = await window.API.jsonFetch(`/api/puzzle?difficulty=${currentDifficulty}`);

    currentPuzzleId = data.puzzleId;

    if (puzzleImg) {
      puzzleImg.onerror = () => {
        isRoundProcessing = false;
        if (window.Timer) window.Timer.stopTimer();
        if (puzzleSpinner) puzzleSpinner.classList.add('hidden');
        if (puzzleImg) puzzleImg.classList.add('hidden');
        if (puzzleError) puzzleError.classList.remove('hidden');
        setNumpadDisabled(true);
      };

      puzzleImg.onload = () => {
        isRoundProcessing = false;
        if (puzzleSpinner) puzzleSpinner.classList.add('hidden');
        if (puzzleError) puzzleError.classList.add('hidden');
        puzzleImg.classList.remove('hidden');
        setNumpadDisabled(false);

        // Record timestamp and start round countdown timer
        puzzleStartTime = Date.now();
        const config = DIFFICULTY_CONFIG[currentDifficulty] || DIFFICULTY_CONFIG.easy;
        if (window.Timer) {
          window.Timer.startTimer(
            config.timeLimit,
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
    if (puzzleSpinner) puzzleSpinner.classList.add('hidden');
    if (puzzleImg) puzzleImg.classList.add('hidden');
    if (puzzleError) puzzleError.classList.remove('hidden');
    setNumpadDisabled(true);
  }
}

/**
 * Calculates score earned for a correct answer:
 * base 10 + remaining seconds, multiplied by difficulty factor (hard x2, medium x1.5).
 */
function calculatePointsEarned() {
  const config = DIFFICULTY_CONFIG[currentDifficulty] || DIFFICULTY_CONFIG.easy;
  const remainingSeconds = window.Timer ? window.Timer.getTimeRemaining() : 0;

  return Math.round((10 + remainingSeconds) * config.multiplier);
}

/**
 * Validates and submits the player's selected keypad digit to the server for verification
 */
async function handleAnswerSubmit() {
  if (!isGameActive || !currentPuzzleId || isRoundProcessing || selectedDigit === null) {
    if (selectedDigit === null && isGameActive && !isRoundProcessing) {
      showFeedback('Please select a number (0-9) on the keypad.', 'wrong');
    }
    return;
  }

  const answer = selectedDigit;

  // Mark round as processing to prevent simultaneous timeout trigger
  isRoundProcessing = true;

  // Stop timer immediately on answer submission
  if (window.Timer) {
    window.Timer.stopTimer();
  }

  // Disable keypad buttons during server verification roundtrip
  setNumpadDisabled(true);

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
        clearSelectedDigit();
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
          clearSelectedDigit();
          if (isGameActive) fetchAndDisplayPuzzle();
        }, 900);
      }
    }
  } catch (err) {
    console.error('Error submitting answer:', err.message);
    showFeedback('Error verifying answer. Retrying...', 'wrong');
    setTimeout(() => {
      hideFeedback();
      clearSelectedDigit();
      if (isGameActive) fetchAndDisplayPuzzle();
    }, 1000);
  }
}

/**
 * Concludes the game session and presents the Game Over screen with final score
 */
function endGame() {
  isGameActive = false;
  isRoundProcessing = false;

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

  if (playArea) playArea.classList.add('hidden');
  hideFeedback();

  if (finalScoreEl) finalScoreEl.textContent = currentScore;
  if (finalCorrectEl) finalCorrectEl.textContent = correctAnswersCount;
  if (finalDiffEl) {
    const config = DIFFICULTY_CONFIG[currentDifficulty] || DIFFICULTY_CONFIG.easy;
    finalDiffEl.textContent = config.label;
  }

  if (gameOverScreen) gameOverScreen.classList.remove('hidden');

  // Submit completed game score and update personal best
  submitGameScore();
}

/**
 * Submits the completed game score to POST /api/scores and updates personal best
 */
async function submitGameScore() {
  const highScoreAlert = document.getElementById('high-score-alert');
  const navHighScore = document.getElementById('current-high-score');
  const hudHighScore = document.getElementById('hud-high-score-display');

  if (highScoreAlert) {
    highScoreAlert.classList.add('hidden');
  }

  try {
    const result = await window.API.jsonFetch('/api/scores', {
      method: 'POST',
      body: {
        score: currentScore,
        correctAnswers: correctAnswersCount,
        difficulty: currentDifficulty,
      },
    });

    if (result && result.isNewHighScore) {
      if (highScoreAlert) {
        highScoreAlert.textContent = `🎉 New Personal Best: ${result.highScore} pts!`;
        highScoreAlert.classList.remove('hidden');
      }
      if (navHighScore) {
        navHighScore.textContent = result.highScore;
      }
      if (hudHighScore) {
        hudHighScore.textContent = result.highScore;
      }
      sessionStorage.setItem('banana_high_score', result.highScore);
    }

    // Refresh player's recent scores history and global leaderboard
    await loadUserScores();
    if (window.Leaderboard && typeof window.Leaderboard.fetchAndRenderLeaderboard === 'function') {
      window.Leaderboard.fetchAndRenderLeaderboard();
    }
  } catch (err) {
    console.error('Failed to submit game score:', err.message);
  }
}

/**
 * Fetches recent games and verified personal best from GET /api/scores/me
 * and renders them in the dashboard sidebar
 */
async function loadUserScores() {
  const container = document.getElementById('recent-scores-container');
  const navHighScore = document.getElementById('current-high-score');
  const hudHighScore = document.getElementById('hud-high-score-display');
  if (!container) return;

  try {
    const data = await window.API.jsonFetch('/api/scores/me');

    if (data && typeof data.highScore === 'number') {
      if (navHighScore) navHighScore.textContent = data.highScore;
      if (hudHighScore) hudHighScore.textContent = data.highScore;
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
  selectDigit,
  clearSelectedDigit,
  submitGameScore,
  loadUserScores,
  showFeedback,
  getDifficulty: () => currentDifficulty,
  getScore: () => currentScore,
  getLives: () => lives,
  getSelectedDigit: () => selectedDigit,
};
