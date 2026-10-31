/**
 * Purpose: Leaderboard display and updates
 * AI-assisted (Antigravity) — reviewed by student
 */

/**
 * Fetches the global top 10 high scores from /api/leaderboard
 * and renders them in the sidebar leaderboard container
 */
async function fetchAndRenderLeaderboard() {
  const container = document.getElementById('leaderboard-container');
  if (!container) return;

  const currentUsername = sessionStorage.getItem('banana_username') || '';

  try {
    const response = await fetch('/api/leaderboard');
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    const list = data && data.leaderboard;

    if (!list || list.length === 0) {
      container.innerHTML = '<p class="text-muted text-small">No scores recorded yet. Be the first to play!</p>';
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
          <div class="${highlightClass}">
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
  } catch (error) {
    console.warn('Failed to load global leaderboard:', error.message);
    container.innerHTML = '<p class="text-muted text-small">Unable to load leaderboard. Please refresh.</p>';
  }
}

// Automatically load leaderboard when DOM content is ready
document.addEventListener('DOMContentLoaded', () => {
  fetchAndRenderLeaderboard();
});

// Export module for dynamic refreshes
window.Leaderboard = {
  fetchAndRenderLeaderboard,
};
