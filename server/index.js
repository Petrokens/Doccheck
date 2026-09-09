require('dotenv').config({ path: require('path').resolve(__dirname, '.env'), quiet: true });

const { validateRuntimeEnv } = require('./src/security/validateEnv');
validateRuntimeEnv();

const app = require('./src/app');
const { connectDB } = require('./src/config/db');
const ensureMasterUser = require('./src/bootstrap/ensureMasterUser');
const ensureSidebarData = require('./src/bootstrap/ensureSidebarData');
const ensureSecuritySchema = require('./src/bootstrap/ensureSecuritySchema');
const ensureRoleSidebarAccess = require('./src/bootstrap/ensureRoleSidebarAccess');

const PORT = process.env.PORT || 5000;

function resolveBindHost() {
  const explicit = String(process.env.BIND_HOST || '').trim();
  // Render / cloud hosts must listen on all interfaces
  if (process.env.RENDER === 'true' || process.env.RENDER_SERVICE_ID) {
    return '0.0.0.0';
  }
  if (explicit) return explicit;
  if (process.env.NODE_ENV === 'production') return '0.0.0.0';
  return '127.0.0.1';
}

const HOST = resolveBindHost();

async function startServer() {
  await connectDB();
  await ensureSecuritySchema();
  await ensureMasterUser();
  await ensureSidebarData();
  await ensureRoleSidebarAccess();
  app.listen(PORT, HOST, (err) => {
    if (err) {
      console.error('Listen failed:', err);
      process.exit(1);
      return;
    }
    console.log(`DocCheck AI API running on http://${HOST}:${PORT}`);
    console.log(`OpenAPI Swagger UI: http://${HOST}:${PORT}/api/docs`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
