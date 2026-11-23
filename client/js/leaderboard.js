/**
 * Purpose: Leaderboard display, updates, and real-time SSE stream subscription
 */

// Active EventSource connection
let eventSource = null;
let lastLeaderboardSnapshot = [];

/**
 * Renders leaderboard entries into the container element
 * @param {Array} list - Array of leaderboard entries
 */
function renderLeaderboardData(list) {
  const container = document.getElementById('leaderboard-container');
  if (!container) return;

  const currentUsername = sessionStorage.getItem('banana_username') || '';

  if (!list || list.length === 0) {
    container.innerHTML = '<p class="text-muted text-small">No scores recorded yet. Be the first to play!</p>';
    lastLeaderboardSnapshot = [];
    return;
  }

  const itemsHtml = list
    .map((entry) => {
      const isCurrentUser = currentUsername && entry.username.toLowerCase() === currentUsername.toLowerCase();
      const highlightClass = isCurrentUser ? 'leaderboard-item current-player' : 'leaderboard-item';

      // Medal icons for podium ranks (1st, 2nd, 3rd)
      let rankDisplay = `#${entry.rank}`;
      if (entry.rank === 1) rankDisplay = '🥇 1';
      else if (entry.rank === 2) rankDisplay = '🥈 2';
      else if (entry.rank === 3) rankDisplay = '🥉 3';

      const diffCapitalized = entry.difficulty
        ? entry.difficulty.charAt(0).toUpperCase() + entry.difficulty.slice(1)
        : 'Easy';

      return `
        <div class="${highlightClass}" data-id="${entry.id}">
          <div class="leaderboard-left">
            <span class="rank-badge rank-${entry.rank}">${rankDisplay}</span>
            <span class="leaderboard-name" title="${entry.username}">
              ${entry.username}${isCurrentUser ? ' <small class="text-you">(You)</small>' : ''}
            </span>
          </div>
          <div class="leaderboard-right">
            <span class="leaderboard-score">${entry.score} pts</span>
            <span class="badge badge-diff-${entry.difficulty}">${diffCapitalized}</span>
          </div>
        </div>
      `;
    })
    .join('');

  container.innerHTML = `<div class="leaderboard-list">${itemsHtml}</div>`;
  lastLeaderboardSnapshot = list;
}

/**
 * Fetches the global top 10 high scores from /api/leaderboard
 * and renders them in the sidebar leaderboard container
 */
async function fetchAndRenderLeaderboard() {
  const container = document.getElementById('leaderboard-container');
  if (!container) return;

  try {
    const response = await fetch('/api/leaderboard');
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    renderLeaderboardData(data && data.leaderboard);
  } catch (error) {
    console.warn('Failed to load global leaderboard:', error.message);
    if (!lastLeaderboardSnapshot.length) {
      container.innerHTML = '<p class="text-muted text-small">Unable to load leaderboard. Please refresh.</p>';
    }
  }
}

/**
 * Initializes Server-Sent Events (SSE) stream for real-time leaderboard updates
 */
function initLeaderboardStream() {
  const container = document.getElementById('leaderboard-container');
  if (!container || !window.EventSource) return;

  // Close existing stream if already open
  if (eventSource) {
    eventSource.close();
  }

  try {
    eventSource = new EventSource('/api/leaderboard/stream');

    eventSource.addEventListener('connected', () => {
      // Connection established
    });

    eventSource.addEventListener('leaderboard', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload && Array.isArray(payload.leaderboard)) {
          renderLeaderboardData(payload.leaderboard);
        }
      } catch (err) {
        console.warn('Failed to parse incoming leaderboard event:', err.message);
      }
    });

    eventSource.onerror = () => {
      // Reconnecting automatically handled by browser EventSource
    };
  } catch (err) {
    console.warn('Could not initialize SSE leaderboard stream:', err.message);
  }
}

/**
 * Closes the active SSE stream connection
 */
function closeStream() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}

// Clean up SSE connection when navigating away
window.addEventListener('beforeunload', () => {
  closeStream();
});

// Automatically load initial leaderboard and establish real-time stream when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  fetchAndRenderLeaderboard();
  initLeaderboardStream();
});

// Export module for dynamic refreshes
window.Leaderboard = {
  fetchAndRenderLeaderboard,
  initLeaderboardStream,
  closeStream,
};
