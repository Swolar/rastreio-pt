if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { execSync } = require('child_process');

// Fallback for DATABASE_URL if not set (Render/Production specific fix)
if (!process.env.DATABASE_URL) {
  console.log('WARNING: DATABASE_URL not found! Please set it to your PostgreSQL connection string.');
} else {
  console.log('DATABASE_URL is set.');
  
  if (process.env.DATABASE_URL.startsWith('file:')) {
    console.warn('WARNING: DATABASE_URL starts with "file:", but we are using PostgreSQL. Please update your environment variable!');
  }
}

// Auto-initialize DB (Fix for Render ephemeral storage)
try {
  console.log('Running DB initialization (Prisma Generate & Push)...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  // Using db push for quick schema sync without migrations history issues
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
  
  console.log('Seeding database...');
  try {
      execSync('node prisma/seed.js', { stdio: 'inherit' });
  } catch (seedError) {
      console.warn('Seed failed (might be duplicate unique constraints), continuing...', seedError.message);
  }
  
  console.log('DB Initialization complete.');
} catch (error) {
  console.error('Failed to initialize DB:', error);
  // Don't exit process, try to run anyway
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
