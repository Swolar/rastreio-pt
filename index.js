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
    console.warn('WARNING: DATABASE_URL starts with "file:", but we are using PostgreSQL. Overriding with default SQLite for compatibility check (Please update Env Var).');
    // NOTE: This is a fallback to prevent crash if user forgot to update Env Var
    // In production, user MUST update DATABASE_URL
  }
}

// Auto-initialize DB (Fix for Render ephemeral storage)
try {
  console.log('Running DB initialization (Prisma Generate & Push)...');
  
  // Dynamic provider switch based on URL
  const isSqlite = !process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('file:');
  
  if (isSqlite) {
     console.log('Detected SQLite URL. Please update DATABASE_URL to PostgreSQL connection string in Render!');
     // Temporarily writing a schema.prisma for SQLite to avoid crash
     const fs = require('fs');
     const schemaPath = './prisma/schema.prisma';
     let schemaContent = fs.readFileSync(schemaPath, 'utf8');
     // Force SQLite provider
     schemaContent = schemaContent.replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"');
     fs.writeFileSync(schemaPath, schemaContent);
  } else {
     console.log('Detected PostgreSQL URL. Ensuring schema.prisma uses postgresql provider.');
     const fs = require('fs');
     const schemaPath = './prisma/schema.prisma';
     let schemaContent = fs.readFileSync(schemaPath, 'utf8');
     // Force PostgreSQL provider
     schemaContent = schemaContent.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
     fs.writeFileSync(schemaPath, schemaContent);
  }

  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // Initialize DB in background to avoid Render timeout
  const { exec } = require('child_process');
  
  console.log('Starting server immediately to satisfy Render port binding...');
  console.log('DB Push and Seed will run in background.');

} catch (error) {
  console.error('Failed to prepare DB schema:', error);
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

  // Run DB migration/seed in background
  console.log('Running background DB sync (db push)...');
  const { exec } = require('child_process');
  
  exec('npx prisma db push --accept-data-loss', (error, stdout, stderr) => {
      if (error) {
          console.error(`DB Push Error: ${error.message}`);
          return;
      }
      if (stderr) console.error(`DB Push Stderr: ${stderr}`);
      console.log(`DB Push Stdout: ${stdout}`);
      console.log('DB Push complete. Running seed...');
      
      exec('node prisma/seed.js', (seedError, seedStdout, seedStderr) => {
          if (seedError) {
              console.warn(`Seed Error (non-fatal): ${seedError.message}`);
          }
          if (seedStderr) console.warn(`Seed Stderr: ${seedStderr}`);
          console.log(`Seed Stdout: ${seedStdout}`);
          console.log('Background DB initialization finished.');
      });
  });
});

server.on('error', (err) => {
  console.error('Server error:', err);
});
