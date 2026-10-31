/**
 * Purpose: API client utility for HTTP requests with JWT access token handling and auto-refresh
 * AI-assisted (Antigravity) — reviewed by student
 */

// In-memory access token storage (never stored in localStorage or sessionStorage to resist XSS)
let inMemoryAccessToken = null;

/**
 * Returns the current in-memory access token.
 */
function getAccessToken() {
  return inMemoryAccessToken;
}

/**
 * Sets the in-memory access token.
 *
 * @param {string} token
 */
function setAccessToken(token) {
  inMemoryAccessToken = token;
}

/**
 * Clears the in-memory access token upon logout or session invalidation.
 */
function clearAccessToken() {
  inMemoryAccessToken = null;
}

/**
 * Custom fetch wrapper that:
 * 1. Injects Authorization: Bearer <token> from memory.
 * 2. Transmits httpOnly cookies with credentials: 'same-origin'.
 * 3. Catches 401 Unauthorized responses, silently refreshes the access token via /api/auth/refresh,
 *    and retries the original request once.
 * 4. Redirects to login.html if refresh fails.
 *
 * @param {string} url - Target endpoint path (e.g. '/api/puzzle')
 * @param {object} options - Standard fetch options
 * @param {boolean} isRetry - Prevents infinite recursion on 401
 * @returns {Promise<Response>}
 */
async function apiFetch(url, options = {}, isRetry = false) {
  const config = {
    ...options,
    credentials: 'same-origin', // Ensure refresh token cookie is sent with request
    headers: {
      ...(options.headers || {}),
    },
  };

  // Attach access token from memory if available
  if (inMemoryAccessToken && !config.headers['Authorization']) {
    config.headers['Authorization'] = `Bearer ${inMemoryAccessToken}`;
  }

  // Format JSON request bodies automatically
  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(config.body);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (networkError) {
    console.error('Network request failed:', networkError);
    throw networkError;
  }

  // Handle 401 Unauthorized by attempting automatic token refresh
  const isAuthRoute = url.includes('/api/auth/login') || url.includes('/api/auth/register') || url.includes('/api/auth/refresh');

  if (response.status === 401 && !isRetry && !isAuthRoute) {
    const refreshed = await attemptTokenRefresh();

    if (refreshed) {
      // Retry original request with newly issued access token
      return apiFetch(url, options, true);
    } else {
      // Refresh failed or token expired: clear session and redirect to login
      clearAccessToken();
      if (!window.location.pathname.endsWith('login.html')) {
        window.location.href = '/login.html';
      }
    }
  }

  return response;
}

/**
 * Attempts to obtain a new access token using the httpOnly refresh token cookie.
 *
 * @returns {Promise<boolean>}
 */
async function attemptTokenRefresh() {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.accessToken) {
        setAccessToken(data.accessToken);
        return true;
      }
    }
  } catch (error) {
    console.warn('Silent token refresh failed:', error.message);
  }

  return false;
}

/**
 * Helper to fetch and parse JSON responses, throwing an Error on non-2xx status.
 *
 * @param {string} url
 * @param {object} options
 * @returns {Promise<any>}
 */
async function jsonFetch(url, options = {}) {
  const response = await apiFetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.error || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

// Expose API utilities globally on window
window.API = {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  apiFetch,
  jsonFetch,
  attemptTokenRefresh,
};
