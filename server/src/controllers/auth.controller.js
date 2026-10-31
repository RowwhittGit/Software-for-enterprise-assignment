/**
 * Purpose: Authentication controller handlers for player registration and login
 * AI-assisted (Antigravity) — reviewed by student
 */

const bcrypt = require('bcryptjs');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const tokenService = require('../services/tokenService');
const config = require('../config/env');

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

/**
 * Handles POST /api/auth/register
 * Validates registration input, securely hashes the password with bcrypt,
 * and creates the new User document in MongoDB Atlas.
 */
async function register(req, res) {
  try {
    const { username, email, password } = req.body;

    // Validate presence of required registration fields
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();

    // Validate username length
    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      return res.status(400).json({ error: 'Username must be between 3 and 30 characters' });
    }

    // Validate email format
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    // Validate minimum password length for security
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username: trimmedUsername });
    if (existingUsername) {
      return res.status(409).json({ error: 'Username is already taken' });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email: trimmedEmail });
    if (existingEmail) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    // Salt and hash password using bcryptjs (cost factor 10)
    // Plaintext passwords are never stored or logged
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      username: trimmedUsername,
      email: trimmedEmail,
      passwordHash,
      highScore: 0,
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        highScore: user.highScore,
      },
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ error: 'Registration failed due to a server error' });
  }
}

/**
 * Handles POST /api/auth/login
 * Verifies credentials, generates a stateless JWT access token in the response body,
 * and sets an opaque refresh token in a secure httpOnly cookie with its SHA-256 hash stored in MongoDB.
 */
async function login(req, res) {
  try {
    const { username, email, password } = req.body;
    const identifier = username || email;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username/email and password are required' });
    }

    const trimmedIdentifier = identifier.trim();

    // Look up user by either username or email
    const user = await User.findOne({
      $or: [
        { username: trimmedIdentifier },
        { email: trimmedIdentifier.toLowerCase() },
      ],
    });

    // Use generic error message to prevent user enumeration
    if (!user) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    // Verify submitted plaintext password against stored bcrypt hash
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    // Generate short-lived stateless JWT access token (15m)
    const accessToken = tokenService.generateAccessToken(user);

    // Generate opaque refresh token (64-byte random string)
    const rawRefreshToken = tokenService.generateRefreshToken();
    const tokenHash = tokenService.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + (config.refreshTokenTtlDays || 7) * 24 * 60 * 60 * 1000);

    // Save SHA-256 hash in MongoDB Atlas (TTL index will auto-delete expired records)
    await RefreshToken.create({
      user: user._id,
      tokenHash,
      expiresAt,
    });

    // Send raw refresh token as an httpOnly, SameSite=Strict cookie
    res.cookie('refreshToken', rawRefreshToken, tokenService.getRefreshTokenCookieOptions());

    res.status(200).json({
      message: 'Login successful',
      accessToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        highScore: user.highScore,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Login failed due to a server error' });
  }
}

/**
 * Handles POST /api/auth/refresh
 * Validates the refresh token from httpOnly cookie against the SHA-256 hash in MongoDB Atlas.
 * Implements token rotation: revokes the old refresh token and issues a new access token AND a new refresh token.
 */
async function refresh(req, res) {
  try {
    const rawRefreshToken = req.cookies?.refreshToken;

    if (!rawRefreshToken) {
      return res.status(401).json({ error: 'Refresh token cookie is missing' });
    }

    const tokenHash = tokenService.hashToken(rawRefreshToken);
    const storedToken = await RefreshToken.findOne({ tokenHash });

    if (!storedToken) {
      res.clearCookie('refreshToken', tokenService.getRefreshTokenCookieOptions());
      return res.status(401).json({ error: 'Invalid or revoked refresh token' });
    }

    // Verify token expiration
    if (storedToken.expiresAt < new Date()) {
      await RefreshToken.deleteOne({ _id: storedToken._id });
      res.clearCookie('refreshToken', tokenService.getRefreshTokenCookieOptions());
      return res.status(401).json({ error: 'Refresh token has expired' });
    }

    // Retrieve corresponding user
    const user = await User.findById(storedToken.user);
    if (!user) {
      await RefreshToken.deleteOne({ _id: storedToken._id });
      res.clearCookie('refreshToken', tokenService.getRefreshTokenCookieOptions());
      return res.status(401).json({ error: 'User no longer exists' });
    }

    // Token Rotation: Delete consumed token
    await RefreshToken.deleteOne({ _id: storedToken._id });

    // Issue brand-new refresh token and save its hash
    const newRawRefreshToken = tokenService.generateRefreshToken();
    const newTokenHash = tokenService.hashToken(newRawRefreshToken);
    const newExpiresAt = new Date(Date.now() + (config.refreshTokenTtlDays || 7) * 24 * 60 * 60 * 1000);

    await RefreshToken.create({
      user: user._id,
      tokenHash: newTokenHash,
      expiresAt: newExpiresAt,
    });

    // Set updated cookie
    res.cookie('refreshToken', newRawRefreshToken, tokenService.getRefreshTokenCookieOptions());

    // Generate new access token
    const accessToken = tokenService.generateAccessToken(user);

    res.status(200).json({
      message: 'Tokens refreshed successfully',
      accessToken,
    });
  } catch (error) {
    console.error('Token refresh error:', error.message);
    res.status(500).json({ error: 'Token refresh failed due to a server error' });
  }
}

/**
 * Handles GET /api/auth/me
 * Protected endpoint returning the profile of the currently authenticated player.
 */
async function getMe(req, res) {
  try {
    const user = await User.findById(req.user.userId).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        highScore: user.highScore,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Error fetching current user:', error.message);
    res.status(500).json({ error: 'Failed to retrieve user profile' });
  }
}

module.exports = {
  register,
  login,
  refresh,
  getMe,
};
