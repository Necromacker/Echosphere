/**
 * server.js — HTTP server entry point (no Express logic here)
 *
 * Responsibilities:
 *  1. Load environment variables
 *  2. Import the configured Express app
 *  3. Bind to port and start listening
 *  4. Handle OS-level process signals (SIGTERM, unhandledRejection)
 */

require('dotenv').config({ override: true }); 

const app = require('./app');
const logger = require('./config/logger');
const connectDB = require('./config/db');
 
const PORT = process.env.PORT || 5000;

const { connect: connectRedis } = require('./config/redis');

// ─── Start HTTP server after database initialization ───────────────
let server;

const startServer = async () => {
  logger.info(`Server startup: environment=${process.env.NODE_ENV || 'undefined'}, port=${PORT}`);
  const databaseConnected = await connectDB();
  logger.info(`Server startup: databaseConnected=${databaseConnected}`);

  server = app.listen(PORT, async () => {
    logger.info(`🚀 Server running in [${process.env.NODE_ENV}] mode on port ${PORT}`);
    await connectRedis();
  });

  // Initialize WebSocket for real-time AI interviews
  const initSocket = require('./socket');
  initSocket(server);
};

startServer().catch((err) => {
  logger.error(`💥 Server startup failed: ${err.name} — ${err.message}`);
  process.exit(1);
});

// ─── Graceful Shutdown: unhandled promise rejections ──────────────
process.on('unhandledRejection', (err) => {
  logger.error(`💥 Unhandled Rejection: name=${err.name}, message=${err.message}`);
  if (err.stack) logger.error(err.stack);
  if (!server) {
    process.exit(1);
  }
  server.close(() => {
    logger.warn('Server closed after unhandledRejection. Exiting...');
    process.exit(1);
  });
});

// ─── Graceful Shutdown: uncaught sync exceptions ──────────────────
process.on('uncaughtException', (err) => {
  logger.error(`💥 Uncaught Exception: name=${err.name}, message=${err.message}`);
  if (err.stack) logger.error(err.stack);
  process.exit(1);
});

// ─── Graceful Shutdown: SIGTERM (Docker / Heroku / Render) ────────
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  if (!server) {
    process.exit(0);
  }
  server.close(() => {
    logger.info('Process terminated.');
    process.exit(0);
  });
});

module.exports = server;
