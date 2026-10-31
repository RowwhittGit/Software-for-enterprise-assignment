/**
 * Purpose: Authentication logic and UI event handling for login/registration and game session
 * AI-assisted (Antigravity) — reviewed by student
 */

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const gameArena = document.getElementById('game-arena');

  if (loginForm && registerForm) {
    initAuthPage();
  } else if (gameArena) {
    // Authenticated game page shell
    initGameAuth();
  } else {
    // Landing page or public views
    initLandingAuth();
  }
});

/**
 * Initializes authentication check, profile display, and logout on the main game dashboard
 */
async function initGameAuth() {
  const usernameEl = document.getElementById('current-username');
  const highScoreEl = document.getElementById('current-high-score');
  const logoutBtn = document.getElementById('btn-logout');

  // Optimistically display cached username from sessionStorage while verifying with server
  const cachedUsername = sessionStorage.getItem('banana_username');
  const cachedHighScore = sessionStorage.getItem('banana_high_score');
  if (cachedUsername && usernameEl) usernameEl.textContent = cachedUsername;
  if (cachedHighScore && highScoreEl) highScoreEl.textContent = cachedHighScore;

  // Verify active authentication state:
  // If in-memory token is absent (e.g. after page refresh), attempt silent cookie refresh
  if (!window.API.getAccessToken()) {
    const refreshed = await window.API.attemptTokenRefresh();

    if (!refreshed) {
      // No active refresh token cookie: redirect to login
      window.location.href = '/login.html';
      return;
    }
  }

  // Fetch verified player profile from /api/auth/me
  try {
    const data = await window.API.jsonFetch('/api/auth/me');

    if (data && data.user) {
      if (usernameEl) usernameEl.textContent = data.user.username;
      if (highScoreEl) highScoreEl.textContent = data.user.highScore;

      sessionStorage.setItem('banana_username', data.user.username);
      sessionStorage.setItem('banana_high_score', data.user.highScore);

      // Load player's recent scores history
      if (window.Game && typeof window.Game.loadUserScores === 'function') {
        window.Game.loadUserScores();
      }
    }
  } catch (err) {
    console.warn('Failed to verify session profile:', err.message);
    window.location.href = '/login.html';
    return;
  }

  // Logout button event listener
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
 * Initializes tab switching, password toggles, and inline validation on login.html
 */
function initAuthPage() {
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const alertBox = document.getElementById('auth-alert');

  // If user already has an active session cookie, redirect directly to game page
  window.API.attemptTokenRefresh().then((hasActiveSession) => {
    if (hasActiveSession) {
      window.location.href = '/game.html';
    }
  });

  // Tab switching logic
  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabLogin.setAttribute('aria-selected', 'true');
    tabRegister.classList.remove('active');
    tabRegister.setAttribute('aria-selected', 'false');

    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    clearFieldErrors();
    hideAlert();
  });

  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabRegister.setAttribute('aria-selected', 'true');
    tabLogin.classList.remove('active');
    tabLogin.setAttribute('aria-selected', 'false');

    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    clearFieldErrors();
    hideAlert();
  });

  // Password visibility toggle buttons
  const toggleBtns = document.querySelectorAll('.toggle-password-btn');
  toggleBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      if (!input) return;

      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
        btn.setAttribute('aria-label', 'Hide password');
        btn.setAttribute('title', 'Hide password');
      } else {
        input.type = 'password';
        btn.textContent = '👁️';
        btn.setAttribute('aria-label', 'Show password');
        btn.setAttribute('title', 'Show password');
      }
    });
  });

  // Inline field validation display helpers
  function showFieldError(inputId, errorId, message) {
    const input = document.getElementById(inputId);
    const errorEl = document.getElementById(errorId);
    if (input) input.classList.add('is-invalid');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    }
  }

  function clearFieldErrors() {
    document.querySelectorAll('.form-input').forEach((inp) => inp.classList.remove('is-invalid'));
    document.querySelectorAll('.form-error-msg').forEach((err) => {
      err.textContent = '';
      err.classList.add('hidden');
    });
  }

  // Clear error state dynamically as the user types
  document.querySelectorAll('.form-input').forEach((input) => {
    input.addEventListener('input', () => {
      input.classList.remove('is-invalid');
      const errEl = document.getElementById(`err-${input.id}`);
      if (errEl) {
        errEl.textContent = '';
        errEl.classList.add('hidden');
      }
    });
  });

  // Login form submission handler
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors();
    hideAlert();

    const identifierInput = document.getElementById('login-identifier');
    const passwordInput = document.getElementById('login-password');
    const submitBtn = document.getElementById('btn-login-submit');

    const identifier = identifierInput.value.trim();
    const password = passwordInput.value;

    let hasError = false;
    if (!identifier) {
      showFieldError('login-identifier', 'err-login-identifier', 'Please enter your username or email address.');
      hasError = true;
    }
    if (!password) {
      showFieldError('login-password', 'err-login-password', 'Please enter your password.');
      hasError = true;
    }

    if (hasError) return;

    setButtonLoading(submitBtn, true, 'Signing in...');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ username: identifier, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign in');
      }

      // Store access token in memory
      window.API.setAccessToken(data.accessToken);

      // Cache non-sensitive display info in sessionStorage for fast UI rendering
      sessionStorage.setItem('banana_username', data.user.username);
      sessionStorage.setItem('banana_high_score', data.user.highScore);

      showAlert('Signed in successfully! Redirecting to game...', 'success');

      // Redirect to main game page
      setTimeout(() => {
        window.location.href = '/game.html';
      }, 350);
    } catch (err) {
      showAlert(err.message, 'error');
    } finally {
      setButtonLoading(submitBtn, false, 'Sign In');
    }
  });

  // Registration form submission handler
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors();
    hideAlert();

    const usernameInput = document.getElementById('register-username');
    const emailInput = document.getElementById('register-email');
    const passwordInput = document.getElementById('register-password');
    const submitBtn = document.getElementById('btn-register-submit');

    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    let hasError = false;

    // Client-side inline validations
    if (username.length < 3 || username.length > 30) {
      showFieldError('register-username', 'err-register-username', 'Username must be between 3 and 30 characters.');
      hasError = true;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      showFieldError('register-email', 'err-register-email', 'Please provide a valid email address.');
      hasError = true;
    }

    if (password.length < 6) {
      showFieldError('register-password', 'err-register-password', 'Password must be at least 6 characters long.');
      hasError = true;
    }

    if (hasError) return;

    setButtonLoading(submitBtn, true, 'Creating account...');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      showAlert('Account created successfully! Signing in...', 'success');

      // Automatically sign in the newly registered user
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ username, password }),
      });

      if (loginRes.ok) {
        const loginData = await loginRes.json();
        window.API.setAccessToken(loginData.accessToken);
        sessionStorage.setItem('banana_username', loginData.user.username);
        sessionStorage.setItem('banana_high_score', loginData.user.highScore);

        setTimeout(() => {
          window.location.href = '/game.html';
        }, 350);
      } else {
        tabLogin.click();
        identifierInput.value = username;
      }
    } catch (err) {
      showAlert(err.message, 'error');
    } finally {
      setButtonLoading(submitBtn, false, 'Create Account');
    }
  });

  function showAlert(message, type) {
    if (!alertBox) return;
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type}`;
    alertBox.classList.remove('hidden');
  }

  function hideAlert() {
    if (!alertBox) return;
    alertBox.classList.add('hidden');
    alertBox.textContent = '';
  }

  function setButtonLoading(button, isLoading, text) {
    if (!button) return;
    button.disabled = isLoading;
    button.textContent = text;
  }
}

/**
 * Initializes navigation bar authentication display on public pages (like index.html)
 */
async function initLandingAuth() {
  const navGuest = document.getElementById('nav-guest');
  const navUser = document.getElementById('nav-user');
  const usernameEl = document.getElementById('landing-username');
  const logoutBtn = document.getElementById('btn-landing-logout');

  let hasSession = false;

  if (window.API) {
    if (!window.API.getAccessToken()) {
      hasSession = await window.API.attemptTokenRefresh();
    } else {
      hasSession = true;
    }
  }

  if (hasSession) {
    try {
      const data = await window.API.jsonFetch('/api/auth/me');
      if (data && data.user) {
        if (usernameEl) usernameEl.textContent = data.user.username;
        if (navGuest) navGuest.classList.add('hidden');
        if (navUser) navUser.classList.remove('hidden');
        sessionStorage.setItem('banana_username', data.user.username);
        sessionStorage.setItem('banana_high_score', data.user.highScore);
      }
    } catch {
      if (navGuest) navGuest.classList.remove('hidden');
      if (navUser) navUser.classList.add('hidden');
    }
  } else {
    if (navGuest) navGuest.classList.remove('hidden');
    if (navUser) navUser.classList.add('hidden');
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      logoutBtn.disabled = true;
      try {
        await window.API.apiFetch('/api/auth/logout', { method: 'POST' });
      } catch (err) {
        console.warn('Logout request warning:', err.message);
      } finally {
        window.API.clearAccessToken();
        sessionStorage.removeItem('banana_username');
        sessionStorage.removeItem('banana_high_score');
        window.location.reload();
      }
    });
  }
}
