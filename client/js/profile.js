/**
 * Purpose: Profile page controller for viewing player statistics, difficulty records, and match history
 */

document.addEventListener('DOMContentLoaded', () => {
  initProfilePage();
});

/**
 * Initializes authentication verification, loads player stats, and binds logout events
 */
async function initProfilePage() {
  const navUsername = document.getElementById('nav-username');
  const navHighScore = document.getElementById('nav-high-score');
  const logoutBtn = document.getElementById('btn-logout');

  // Optimistically set cached values while fetching fresh stats
  const cachedUsername = sessionStorage.getItem('banana_username');
  const cachedHighScore = sessionStorage.getItem('banana_high_score');
  if (cachedUsername && navUsername) navUsername.textContent = cachedUsername;
  if (cachedHighScore && navHighScore) navHighScore.textContent = cachedHighScore;

  // Verify authentication: if in-memory token is absent, attempt silent cookie refresh
  if (!window.API || !window.API.getAccessToken()) {
    const refreshed = await window.API.attemptTokenRefresh();
    if (!refreshed) {
      window.location.href = '/login.html';
      return;
    }
  }

  // Load profile statistics
  await loadProfileStats();

  // Bind logout action
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      logoutBtn.disabled = true;
      logoutBtn.textContent = 'Logging out...';

      try {
        await window.API.apiFetch('/api/auth/logout', { method: 'POST' });
      } catch (err) {
        console.warn('Logout request warning:', err.message);
      } finally {
        window.API.clearAccessToken();
        sessionStorage.removeItem('banana_username');
        sessionStorage.removeItem('banana_high_score');
        window.location.href = '/login.html';
      }
    });
  }
}

/**
 * Fetches player statistics from /api/scores/me/stats and populates the UI
 */
async function loadProfileStats() {
  const profileUsername = document.getElementById('profile-username');
  const profileMemberSince = document.getElementById('profile-member-since');
  const profilePersonalBest = document.getElementById('profile-personal-best');
  const navUsername = document.getElementById('nav-username');
  const navHighScore = document.getElementById('nav-high-score');

  const statTotalGames = document.getElementById('stat-total-games');
  const statAccuracy = document.getElementById('stat-accuracy');
  const statAvgScore = document.getElementById('stat-avg-score');

  const diffBestEasy = document.getElementById('diff-best-easy');
  const diffBestMedium = document.getElementById('diff-best-medium');
  const diffBestHard = document.getElementById('diff-best-hard');

  const historyLoading = document.getElementById('history-loading');
  const historyEmpty = document.getElementById('history-empty');
  const historyList = document.getElementById('history-list');

  try {
    const data = await window.API.jsonFetch('/api/scores/me/stats');

    // Header info
    if (profileUsername) profileUsername.textContent = data.username;
    if (navUsername) navUsername.textContent = data.username;
    sessionStorage.setItem('banana_username', data.username);

    if (data.memberSince && profileMemberSince) {
      const formattedDate = new Date(data.memberSince).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      profileMemberSince.textContent = `Member since ${formattedDate}`;
    }

    const bestScoreText = `${data.personalBest || 0} pts`;
    if (profilePersonalBest) profilePersonalBest.textContent = bestScoreText;
    if (navHighScore) navHighScore.textContent = data.personalBest || 0;
    sessionStorage.setItem('banana_high_score', data.personalBest || 0);

    // Career stat cards
    if (statTotalGames) statTotalGames.textContent = data.totalGames;
    if (statAccuracy) statAccuracy.textContent = `${data.accuracy}%`;
    if (statAvgScore) statAvgScore.textContent = `${data.averageScore} pts`;

    // Difficulty records
    const bestByDiff = data.bestScoreByDifficulty || {};
    if (diffBestEasy) {
      diffBestEasy.textContent = bestByDiff.easy !== null ? `${bestByDiff.easy} pts` : '—';
    }
    if (diffBestMedium) {
      diffBestMedium.textContent = bestByDiff.medium !== null ? `${bestByDiff.medium} pts` : '—';
    }
    if (diffBestHard) {
      diffBestHard.textContent = bestByDiff.hard !== null ? `${bestByDiff.hard} pts` : '—';
    }

    // Match history list
    if (historyLoading) historyLoading.classList.add('hidden');

    if (!data.recentGames || data.recentGames.length === 0) {
      if (historyEmpty) historyEmpty.classList.remove('hidden');
      if (historyList) historyList.classList.add('hidden');
      return;
    }

    if (historyEmpty) historyEmpty.classList.add('hidden');
    if (historyList) {
      historyList.classList.remove('hidden');

      const itemsHtml = data.recentGames
        .map((game, index) => {
          const formattedDate = new Date(game.createdAt).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
          const diffLabel = game.difficulty ? game.difficulty.charAt(0).toUpperCase() + game.difficulty.slice(1) : 'Easy';
          const accuracyText = game.puzzlesAttempted > 0
            ? `${game.correctAnswers}/${game.puzzlesAttempted} solved (${Math.round((game.correctAnswers / game.puzzlesAttempted) * 100)}%)`
            : `${game.correctAnswers} solved`;

          return `
            <div class="history-item">
              <div class="history-left">
                <span class="history-index">#${index + 1}</span>
                <div class="history-details">
                  <span class="history-score">${game.score} pts</span>
                  <span class="history-meta">${accuracyText} &bull; ${formattedDate}</span>
                </div>
              </div>
              <div class="history-right">
                <span class="badge badge-diff-${game.difficulty}">${diffLabel}</span>
              </div>
            </div>
          `;
        })
        .join('');

      historyList.innerHTML = itemsHtml;
    }
  } catch (err) {
    console.error('Failed to load player stats:', err.message);
    if (historyLoading) {
      historyLoading.innerHTML = '<p class="text-danger">Failed to load statistics. Please refresh the page.</p>';
    }
  }
}
