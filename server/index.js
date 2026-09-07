require('dotenv').config({ path: require('path').resolve(__dirname, '.env'), quiet: true });

const app = require('./src/app');
const { connectDB } = require('./src/config/db');
const ensureMasterUser = require('./src/bootstrap/ensureMasterUser');
const ensureSidebarData = require('./src/bootstrap/ensureSidebarData');

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();
  await ensureMasterUser();
  await ensureSidebarData();
  app.listen(PORT, () => {
    console.log(`Petrolenz QA/QC API running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
