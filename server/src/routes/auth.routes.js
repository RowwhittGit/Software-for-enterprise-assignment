/**
 * Purpose: Authentication API routes (register, login, refresh, logout, me)
 * AI-assisted (Antigravity) — reviewed by student
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// POST /api/auth/register - create new user account
router.post('/register', authController.register);

// POST /api/auth/login - authenticate user and return access token
router.post('/login', authController.login);

module.exports = router;
