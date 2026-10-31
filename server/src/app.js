/**
 * Purpose: Express application configuration, middleware, and route mounting
 * AI-assisted (Antigravity) — reviewed by student
 */

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();

// Parse incoming JSON payloads
app.use(express.json());

// Parse incoming URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// Parse cookies attached to client requests (needed for refresh tokens)
app.use(cookieParser());

// Serve client-side static assets (HTML, CSS, JS) from the client directory
app.use(express.static(path.join(__dirname, '../../client')));

// Health check endpoint to verify server status without touching the database
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

module.exports = app;
