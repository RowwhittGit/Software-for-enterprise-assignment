/**
 * Purpose: Leaderboard display, updates, and real-time SSE stream subscription
 */

// Active EventSource connection
let eventSource = null;
let lastLeaderboardSnapshot = [];

/**
 * Updates the visual status badge for real-time SSE connectivity
 * @param {'live'|'reconnecting'|'connecting'} state
 */
function updateLiveBadge(state) {
  const badge = document.getElementById('leaderboard-live-badge');
  if (!badge) return;

  badge.className = `live-indicator live-indicator-${state}`;
  const textEl = badge.querySelector('.live-indicator-text');

  if (textEl) {
    if (state === 'live') {
      textEl.textContent = 'Live';
    } else if (state === 'reconnecting') {
      textEl.textContent = 'Reconnecting';
    } else {
      textEl.textContent = 'Connecting';
    }
  }
}

/**
 * Renders leaderboard entries into the container element, highlighting rows that changed
 * @param {Array} list - Array of leaderboard entries
 * @param {boolean} [highlightChanges=false] - Whether to apply visual pulse on updated rows
 */
function renderLeaderboardData(list, highlightChanges = false) {
  const container = document.getElementById('leaderboard-container');
  if (!container) return;

  const currentUsername = sessionStorage.getItem('banana_username') || '';

  if (!list || list.length === 0) {
    container.innerHTML = '<p class="text-muted text-small">No scores recorded yet. Be the first to play!</p>';
    lastLeaderboardSnapshot = [];
    return;
  }

  // Build a lookup map of the previous snapshot for change detection
  const prevMap = new Map();
  lastLeaderboardSnapshot.forEach((item) => {
    prevMap.set(item.id || `${item.username}-${item.rank}`, item);
  });

  const itemsHtml = list
    .map((entry) => {
      const isCurrentUser = currentUsername && entry.username.toLowerCase() === currentUsername.toLowerCase();
      let itemClasses = 'leaderboard-item';
      if (isCurrentUser) itemClasses += ' current-player';

      // Check if entry is new or updated in rank/score compared to previous snapshot
      if (highlightChanges && lastLeaderboardSnapshot.length > 0) {
        const prev = prevMap.get(entry.id || `${entry.username}-${entry.rank}`);
        if (!prev || prev.score !== entry.score || prev.rank !== entry.rank) {
          itemClasses += ' row-updated';
        }
      }

      // Medal icons for podium ranks (1st, 2nd, 3rd)
      let rankDisplay = `#${entry.rank}`;
      if (entry.rank === 1) rankDisplay = '🥇 1';
      else if (entry.rank === 2) rankDisplay = '🥈 2';
      else if (entry.rank === 3) rankDisplay = '🥉 3';

      const diffCapitalized = entry.difficulty
        ? entry.difficulty.charAt(0).toUpperCase() + entry.difficulty.slice(1)
        : 'Easy';

      return `
        <div class="${itemClasses}" data-id="${entry.id}">
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
    renderLeaderboardData(data && data.leaderboard, false);
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

  updateLiveBadge('connecting');

  try {
    eventSource = new EventSource('/api/leaderboard/stream');

    eventSource.onopen = () => {
      updateLiveBadge('live');
    };

    eventSource.addEventListener('connected', () => {
      updateLiveBadge('live');
    });

    eventSource.addEventListener('leaderboard', (event) => {
      try {
        updateLiveBadge('live');
        const payload = JSON.parse(event.data);
        if (payload && Array.isArray(payload.leaderboard)) {
          renderLeaderboardData(payload.leaderboard, true);
        }
      } catch (err) {
        console.warn('Failed to parse incoming leaderboard event:', err.message);
      }
    });

    eventSource.onerror = () => {
      updateLiveBadge('reconnecting');
    };
  } catch (err) {
    console.warn('Could not initialize SSE leaderboard stream:', err.message);
    updateLiveBadge('reconnecting');
  }
}

/**
 * Closes the active SSE stream connection
 */
function closeStream() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
    updateLiveBadge('reconnecting');
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
  updateLiveBadge,
};
