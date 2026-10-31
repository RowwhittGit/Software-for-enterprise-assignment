/**
 * Purpose: Per-puzzle countdown timer and timeout events
 * AI-assisted (Antigravity) — reviewed by student
 */

let timerInterval = null;
let timeRemaining = 0;

/**
 * Starts a countdown timer for a given duration in seconds.
 * Calls onTick every second with the remaining time.
 * Calls onTimeout when the countdown reaches zero.
 *
 * @param {number} durationSeconds - Countdown starting time in seconds
 * @param {function} onTick - Callback executed each second: (secondsLeft) => void
 * @param {function} onTimeout - Callback executed when timer hits 0: () => void
 */
function startTimer(durationSeconds, onTick, onTimeout) {
  // Clear any existing active timer to prevent duplicate intervals
  stopTimer();

  timeRemaining = Math.max(0, parseInt(durationSeconds, 10) || 0);

  // Initial tick to display full starting duration immediately
  if (typeof onTick === 'function') {
    onTick(timeRemaining);
  }

  timerInterval = setInterval(() => {
    timeRemaining--;

    if (typeof onTick === 'function') {
      onTick(timeRemaining);
    }

    if (timeRemaining <= 0) {
      stopTimer();
      if (typeof onTimeout === 'function') {
        onTimeout();
      }
    }
  }, 1000);
}

/**
 * Stops and clears the current active timer interval.
 */
function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

/**
 * Resets timer state and stops any running interval.
 */
function resetTimer() {
  stopTimer();
  timeRemaining = 0;
}

/**
 * Returns the current remaining seconds on the timer.
 * @returns {number}
 */
function getTimeRemaining() {
  return timeRemaining;
}

// Attach module to global window for browser access
window.Timer = {
  startTimer,
  stopTimer,
  resetTimer,
  getTimeRemaining,
};
