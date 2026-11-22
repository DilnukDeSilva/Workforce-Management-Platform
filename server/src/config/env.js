// The only file that reads process.env (architecture rule). Everything else calls getEnv().
//
// Why a function instead of reading the variables at the top of the file:
// server.js loads the .env file with dotenv *before* calling getEnv(), and tests set
// process.env per test. Reading at require time would freeze whatever was there first.

const DEFAULT_PORT = 5000;

function getEnv() {
  // Treat an empty or whitespace-only value the same as a missing one (UC-1-EC2),
  // so mongoose.connect('') never produces a confusing driver error.
  const mongodbUri = (process.env.MONGODB_URI || '').trim();
  if (!mongodbUri) {
    throw new Error('Missing required environment variable: MONGODB_URI. Copy server/.env.example to server/.env.');
  }

  // Intentional: an unset or non-numeric PORT falls back to 5000 (UC-1-A1) instead of failing,
  // because a wrong port is harmless in development and hosts like Render always set a valid one.
  const port = Number(process.env.PORT) || DEFAULT_PORT;

  return { port, mongodbUri };
}

module.exports = { getEnv };
