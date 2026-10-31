/**
 * Purpose: Authentication logic and UI event handling for login/registration
 * AI-assisted (Antigravity) — reviewed by student
 */

document.addEventListener('DOMContentLoaded', () => {
  // Check if we are on the login/registration page
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  if (loginForm && registerForm) {
    initAuthPage();
  }
});

/**
 * Initializes tab switching and event handlers on login.html
 */
function initAuthPage() {
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const alertBox = document.getElementById('auth-alert');

  // Tab switching logic
  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabLogin.setAttribute('aria-selected', 'true');
    tabRegister.classList.remove('active');
    tabRegister.setAttribute('aria-selected', 'false');

    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    hideAlert();
  });

  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabRegister.setAttribute('aria-selected', 'true');
    tabLogin.classList.remove('active');
    tabLogin.setAttribute('aria-selected', 'false');

    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    hideAlert();
  });

  // Login form submission handler
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const identifierInput = document.getElementById('login-identifier');
    const passwordInput = document.getElementById('login-password');
    const submitBtn = document.getElementById('btn-login-submit');

    const identifier = identifierInput.value.trim();
    const password = passwordInput.value;

    if (!identifier || !password) {
      showAlert('Please enter your username/email and password.', 'error');
      return;
    }

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

      showAlert('Signed in successfully! Redirecting...', 'success');

      // Redirect to main game page
      setTimeout(() => {
        window.location.href = '/index.html';
      }, 500);
    } catch (err) {
      showAlert(err.message, 'error');
    } finally {
      setButtonLoading(submitBtn, false, 'Sign In');
    }
  });

  // Registration form submission handler
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const usernameInput = document.getElementById('register-username');
    const emailInput = document.getElementById('register-email');
    const passwordInput = document.getElementById('register-password');
    const submitBtn = document.getElementById('btn-register-submit');

    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Client-side validations
    if (username.length < 3 || username.length > 30) {
      showAlert('Username must be between 3 and 30 characters.', 'error');
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      showAlert('Please provide a valid email address.', 'error');
      return;
    }

    if (password.length < 6) {
      showAlert('Password must be at least 6 characters long.', 'error');
      return;
    }

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
          window.location.href = '/index.html';
        }, 500);
      } else {
        // Fallback: switch to login tab with username pre-filled
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
