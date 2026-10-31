/**
 * Purpose: Landing page interactions and top-5 leaderboard preview loader
 * AI-assisted (Antigravity) — reviewed by student
 */

document.addEventListener('DOMContentLoaded', () => {
  loadLandingLeaderboard();
});

/**
 * Fetches top 5 scores from /api/leaderboard and renders them in the preview card
 */
async function loadLandingLeaderboard() {
  const container = document.getElementById('landing-leaderboard-container');
  if (!container) return;

  try {
    const response = await fetch('/api/leaderboard');
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    const list = (data && data.leaderboard) || [];

    if (list.length === 0) {
      container.innerHTML = '<p class="text-muted text-small text-center" style="padding: 1.5rem 0;">No scores recorded yet. Be the first to play!</p>';
      return;
    }

    const top5 = list.slice(0, 5);
    const html = top5
      .map((entry) => {
        let rankIcon = `#${entry.rank}`;
        if (entry.rank === 1) rankIcon = '🥇 1';
        else if (entry.rank === 2) rankIcon = '🥈 2';
        else if (entry.rank === 3) rankIcon = '🥉 3';

        const diffCapitalized = entry.difficulty
          ? entry.difficulty.charAt(0).toUpperCase() + entry.difficulty.slice(1)
          : 'Easy';

        return `
          <div class="leaderboard-item">
            <div class="leaderboard-left">
              <span class="rank-badge rank-${entry.rank}">${rankIcon}</span>
              <span class="leaderboard-name" title="${entry.username}">${entry.username}</span>
            </div>
            <div class="leaderboard-right">
              <span class="leaderboard-score">${entry.score} pts</span>
              <span class="badge badge-diff-${entry.difficulty}">${diffCapitalized}</span>
            </div>
          </div>
        `;
      })
      .join('');

    container.innerHTML = `<div class="leaderboard-list">${html}</div>`;
  } catch (err) {
    console.warn('Failed to load landing leaderboard preview:', err.message);
    container.innerHTML = '<p class="text-muted text-small text-center" style="padding: 1.5rem 0;">Unable to load leaderboard. Sign in and play!</p>';
  }
}
