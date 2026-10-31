/**
 * Purpose: Core game loop and state management
 * AI-assisted (Antigravity) — reviewed by student
 */

// Game state variables
let currentDifficulty = 'easy';
let currentPuzzleId = null;
let isGameActive = false;

document.addEventListener('DOMContentLoaded', () => {
  const startScreen = document.getElementById('start-screen');
  const playArea = document.getElementById('play-area');
  const btnStart = document.getElementById('btn-start-game');

  if (btnStart) {
    btnStart.addEventListener('click', () => {
      startGame();
    });
  }
});

/**
 * Initializes and starts a new game round
 */
function startGame() {
  const startScreen = document.getElementById('start-screen');
  const playArea = document.getElementById('play-area');
  const gameOverScreen = document.getElementById('game-over-screen');

  if (startScreen) startScreen.classList.add('hidden');
  if (gameOverScreen) gameOverScreen.classList.add('hidden');
  if (playArea) playArea.classList.remove('hidden');

  isGameActive = true;

  fetchAndDisplayPuzzle();
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

// Export for module accessibility
window.Game = {
  startGame,
  fetchAndDisplayPuzzle,
};
