/**
 * Purpose: Application entry point — connects to MongoDB Atlas and starts the HTTP server
 * AI-assisted (Antigravity) — reviewed by student
 */

const config = require('./src/config/env');
const app = require('./src/app');
const connectDB = require('./src/config/db');

/**
 * Initializes database connection first, then begins listening for client HTTP requests.
 * This guarantees the server will not process requests if database connectivity fails.
 */
async function startServer() {
  await connectDB();

  app.listen(config.port, () => {
    console.log(`Server is running in ${config.nodeEnv} mode on port ${config.port}`);
  });
}

startServer();
