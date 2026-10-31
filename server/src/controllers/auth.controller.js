/**
 * Purpose: Authentication controller handlers for player registration and login
 * AI-assisted (Antigravity) — reviewed by student
 */

const bcrypt = require('bcryptjs');
const User = require('../models/User');

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

module.exports = {
  register,
};
