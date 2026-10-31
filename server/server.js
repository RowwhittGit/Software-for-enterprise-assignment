/**
 * Purpose: Application entry point — starts the HTTP server
 * AI-assisted (Antigravity) — reviewed by student
 */

const config = require('./src/config/env');
const app = require('./src/app');

// Start HTTP server listening on the configured port
app.listen(config.port, () => {
  console.log(`Server is running in ${config.nodeEnv} mode on port ${config.port}`);
});
