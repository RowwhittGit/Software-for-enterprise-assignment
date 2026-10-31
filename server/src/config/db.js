/**
 * Purpose: Database connection setup using Mongoose for MongoDB Atlas
 * AI-assisted (Antigravity) — reviewed by student
 */

const mongoose = require('mongoose');
const config = require('./env');

/**
 * Connects to MongoDB Atlas using Mongoose.
 * For enterprise security compliance, the connection string is never logged or exposed.
 */
async function connectDB() {
  const uri = config.mongodbUri;

  if (!uri) {
    console.error('Database connection failed: MONGODB_URI environment variable is missing.');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected successfully to host: ${conn.connection.host}`);
  } catch (error) {
    // Only log the sanitized error message; never log the connection URI containing credentials
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
}

module.exports = connectDB;
