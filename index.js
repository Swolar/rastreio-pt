if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { execSync } = require('child_process');

// Global flag to track DB readiness
let isDbReady = false;
let dbError = null;

// --- SUPABASE CONNECTION AUTO-FIX ---
// O Render tem problemas com a porta 5432 (Direct) do Supabase.
// Vamos forçar o uso da porta 6543 (Pooler) automaticamente.
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase.co')) {
    let newUrl = process.env.DATABASE_URL;
    let modified = false;

    // 1. Switch Port 5432 -> 6543 (Transaction Pooler)
    if (newUrl.includes(':5432')) {
        console.log('[Auto-Fix] Switching Supabase port 5432 -> 6543 (Pooler) for stability.');
        newUrl = newUrl.replace(':5432', ':6543');
        modified = true;
    }

    // 2. Ensure pgbouncer=true is present (Required for port 6543)
    if (!newUrl.includes('pgbouncer=true')) {
        console.log('[Auto-Fix] Adding ?pgbouncer=true to connection string.');
        const separator = newUrl.includes('?') ? '&' : '?';
        newUrl = `${newUrl}${separator}pgbouncer=true`;
        modified = true;
    }

    // 3. Remove ?connect_timeout if it conflicts (Pooler handles keepalive)
    // Optional: connection_limit=1 for serverless
    if (!newUrl.includes('connection_limit=')) {
         const separator = newUrl.includes('?') ? '&' : '?';
         newUrl = `${newUrl}${separator}connection_limit=1`;
    }

    if (modified) {
        process.env.DATABASE_URL = newUrl;
        console.log('[Auto-Fix] DATABASE_URL updated successfully for Supabase + Render.');
    }
}
// ------------------------------------

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
  
  // Force PostgreSQL provider in schema.prisma
  const fs = require('fs');
  const schemaPath = './prisma/schema.prisma';
  let schemaContent = fs.readFileSync(schemaPath, 'utf8');
  
  // Ensure provider is postgresql
  if (schemaContent.includes('provider = "sqlite"')) {
      console.log('Updating schema.prisma to use postgresql provider...');
      schemaContent = schemaContent.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
      fs.writeFileSync(schemaPath, schemaContent);
  }

  // Log sanitized DATABASE_URL for debugging
  const dbUrl = process.env.DATABASE_URL || '';
  const sanitizedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
  console.log(`Using DATABASE_URL: ${sanitizedUrl}`);
  
  // Initialize DB in background to avoid Render timeout
  const { exec } = require('child_process');
  
  console.log('Starting server immediately to satisfy Render port binding...');
  console.log('DB Push and Seed will run in background.');

  // Run generate in background too to prevent startup freeze
  exec('npx prisma generate', (genError, genStdout, genStderr) => {
      if (genError) console.error(`Prisma Generate Error: ${genError.message}`);
      if (genStderr) console.error(`Prisma Generate Stderr: ${genStderr}`);
      console.log(`Prisma Generate Stdout: ${genStdout}`);
      
      // Only start push after generate is done
      exec('npx prisma db push --accept-data-loss', (error, stdout, stderr) => {
        if (error) {
            console.error(`DB Push Error: ${error.message}`);
            dbError = error.message + "\n\nSTDERR:\n" + stderr;
            return;
        }
        if (stderr) console.error(`DB Push Stderr: ${stderr}`);
        console.log(`DB Push Stdout: ${stdout}`);
        console.log('DB Push complete. Running seed...');
        
        // Mark DB as ready immediately after push, even before seed (schema exists)
        isDbReady = true;

        exec('npx prisma db seed', (seedError, seedStdout, seedStderr) => {
            if (seedError) {
                console.warn(`Seed Error (non-fatal): ${seedError.message}`);
            }
            if (seedStderr) console.warn(`Seed Stderr: ${seedStderr}`);
            console.log(`Seed Stdout: ${seedStdout}`);
            console.log('Background DB initialization finished.');
        });
    });
  });

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

// DB Loading Middleware
app.use((req, res, next) => {
    // Allow health checks and static files even if DB is not ready
    if (req.path === '/health' || req.path.startsWith('/css') || req.path.startsWith('/js') || req.path.startsWith('/images')) {
        return next();
    }

    if (!isDbReady) {
        if (dbError) {
             return res.status(500).send(`
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head>
                    <meta charset="UTF-8">
                    <title>Erro na Inicialização</title>
                    <style>
                        body { font-family: sans-serif; padding: 2rem; background: #fff0f0; color: #cc0000; }
                        .container { background: white; padding: 2rem; border-radius: 8px; border: 1px solid #ffcccc; }
                        pre { background: #eee; padding: 1rem; overflow-x: auto; color: #333; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h2>Falha ao conectar com o Banco de Dados</h2>
                        <p>Ocorreu um erro ao tentar configurar o Supabase. Por favor, verifique as configurações.</p>
                        <h3>Detalhes do Erro:</h3>
                        <pre>${dbError}</pre>
                        <p>Se o erro for de "connection", verifique a DATABASE_URL no Render.</p>
                    </div>
                </body>
                </html>
            `);
        }

        // Return a friendly loading page
        return res.status(503).send(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Sistema Iniciando...</title>
                <meta http-equiv="refresh" content="5">
                <style>
                    body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f0f2f5; color: #333; }
                    .container { text-align: center; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="spinner"></div>
                    <h2>Sistema Iniciando...</h2>
                    <p>Estamos configurando o banco de dados pela primeira vez.</p>
                    <p>Essa página vai atualizar automaticamente em 5 segundos.</p>
                </div>
            </body>
            </html>
        `);
    }
    next();
});

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
  // const { exec } = require('child_process'); - Already running in top-level try/catch block
});

server.on('error', (err) => {
  console.error('Server error:', err);
});
