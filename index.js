if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Fallback for DATABASE_URL if not set (Render/Production specific fix)
if (!process.env.DATABASE_URL) {
  console.log('WARNING: DATABASE_URL not found, using default file:./dev.db');
  process.env.DATABASE_URL = 'file:./dev.db';
} else {
  console.log('DATABASE_URL is set.');
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const cronService = require('./services/cronService');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/', routes);

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Start cron jobs
  cronService.start();
  console.log('Cron jobs started');
});

server.on('error', (err) => {
  console.error('Server error:', err);
});
