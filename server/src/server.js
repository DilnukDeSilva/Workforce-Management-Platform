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
    const server = app.listen(port, () => console.log(`Server listening on port ${port}`));
    // listen() reports problems such as "port already in use" later, as an 'error' event,
    // so the try/catch can't see them. Handle them the same way: clear log, exit 1.
    server.on('error', (err) => {
      console.error(`Server failed to start: ${err.message}`);
      process.exit(1);
    });
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
