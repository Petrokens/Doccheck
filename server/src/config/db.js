const { Pool } = require('pg');

function resolveDatabaseUrl() {
  return String(process.env.DATABASE_URL || '').trim();
}

function resolveSsl(connectionString) {
  const insecure = process.env.PG_SSL_INSECURE === 'true';
  if (process.env.PG_SSL === 'true') return { rejectUnauthorized: !insecure };
  if (process.env.PG_SSL === 'false') return undefined;
  try {
    const host = new URL(connectionString).hostname.toLowerCase();
    if (
      host.includes('supabase.co') ||
      host.includes('render.com') ||
      host.includes('neon.tech') ||
      process.env.NODE_ENV === 'production'
    ) {
      return { rejectUnauthorized: !insecure };
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

const connectionString = resolveDatabaseUrl();
if (!connectionString) {
  throw new Error('DATABASE_URL is missing. Copy server/.env.example to server/.env');
}

const pool = new Pool({
  connectionString,
  ssl: resolveSsl(connectionString),
});

async function connectDB() {
  const client = await pool.query('SELECT 1 AS ok');
  console.log('Database connected:', client.rows[0]?.ok === 1 ? 'ok' : 'unknown');
}

module.exports = { pool, connectDB };
