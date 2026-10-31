/**
 * Purpose: Express application configuration, middleware, and route mounting
 * AI-assisted (Antigravity) — reviewed by student
 */

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth.routes');
const puzzleRoutes = require('./routes/puzzle.routes');
const scoreRoutes = require('./routes/score.routes');
const { getLeaderboard } = require('./controllers/score.controller');

const app = express();

// Parse incoming JSON payloads
app.use(express.json());

// Parse incoming URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// Parse cookies attached to client requests (needed for refresh tokens)
app.use(cookieParser());

// Serve client-side static assets (HTML, CSS, JS) from the client directory
app.use(express.static(path.join(__dirname, '../../client')));

// Mount authentication API routes
app.use('/api/auth', authRoutes);

// Mount puzzle API routes
app.use('/api/puzzle', puzzleRoutes);

// Mount scores API routes
app.use('/api/scores', scoreRoutes);

// Public leaderboard endpoint (accessible without login)
app.get('/api/leaderboard', getLeaderboard);

// Health check endpoint to verify server status without touching the database
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

module.exports = app;
