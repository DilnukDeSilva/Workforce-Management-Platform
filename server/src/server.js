const path = require('path');
const app = require('./app');
const { getEnv } = require('./config/env');
const { connectDB, redactUri } = require('./config/db');

// Startup order matters (design D1): a server that can't reach its database at boot is
// misconfigured, so we connect first and only then accept requests. Any failure here
// stops the process with exit code 1 instead of running half-working.
async function start() {
  try {
    const { port, mongodbUri } = getEnv();
    await connectDB(mongodbUri);
    app.listen(port, () => console.log(`Server listening on port ${port}`));
  } catch (err) {
    // redactUri again as a safety net: credentials must never reach the logs.
    console.error(`Server failed to start: ${redactUri(err.message)}`);
    process.exit(1);
  }
}

// Only start when run directly (`node src/server.js`), not when a test requires this file
// (design D9). The explicit path finds server/.env no matter which folder you start from,
// and `quiet` hides dotenv's startup banner.
if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
  start();
}

module.exports = { start };
