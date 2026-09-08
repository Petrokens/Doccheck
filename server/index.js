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
const HOST = process.env.BIND_HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');

async function startServer() {
  await connectDB();
  await ensureSecuritySchema();
  await ensureMasterUser();
  await ensureSidebarData();
  await ensureRoleSidebarAccess();
  app.listen(PORT, HOST, () => {
    console.log(`Petrolenz QA/QC API running on http://${HOST}:${PORT}`);
    console.log(`OpenAPI Swagger UI: http://${HOST}:${PORT}/api/docs`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
