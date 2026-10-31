/**
 * Purpose: Authentication API routes (register, login, refresh, logout, me)
 * AI-assisted (Antigravity) — reviewed by student
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const requireAuth = require('../middleware/requireAuth');

// POST /api/auth/register - create new user account
router.post('/register', authController.register);

// POST /api/auth/login - authenticate user and return access token
router.post('/login', authController.login);

// POST /api/auth/refresh - rotate refresh token cookie and issue new access token
router.post('/refresh', authController.refresh);

// GET /api/auth/me - fetch profile of the currently logged-in player
router.get('/me', requireAuth, authController.getMe);

module.exports = router;
