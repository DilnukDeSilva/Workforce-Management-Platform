const mongoose = require('mongoose');

// Without a timeout an unreachable database hangs startup for ~30s; 5s fails fast (design D3).
const SERVER_SELECTION_TIMEOUT_MS = 5000;

// Connection URIs can contain a username and password, so they are never logged raw.
// "mongodb+srv://user:pass@host/db" becomes "mongodb+srv://***@host/db".
// It hides everything up to the LAST "@", so a password with a raw "/" or "@" (a common
// cause of connection failures) is still hidden. Hiding a little too much is the safe side.
function redactUri(text) {
  return String(text).replace(/(mongodb(?:\+srv)?:\/\/)\S*@/g, '$1***@');
}

// Listeners live on the shared mongoose.connection, so registering them on every
// connectDB() call would stack duplicates and log each event several times.
let listenersRegistered = false;

function registerConnectionListeners() {
  if (listenersRegistered) return;
  listenersRegistered = true;

  mongoose.connection.on('connected', () => console.log('MongoDB connected'));
  // A drop after startup is survivable: log it and keep serving; health reports it (design D1).
  mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
  // Without an 'error' listener, an emitted error event would crash the process.
  mongoose.connection.on('error', (err) => console.error(`MongoDB error: ${redactUri(err.message)}`));
}

// Rejects with a descriptive error instead of exiting: only server.js decides
// whether the process should stop (design D2), which keeps this module testable.
async function connectDB(uri) {
  registerConnectionListeners();
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS });
  } catch (err) {
    // `cause` keeps the original driver error for debugging; only the redacted message is ever logged.
    throw new Error(`Could not connect to MongoDB at ${redactUri(uri)}: ${redactUri(err.message)}`, { cause: err });
  }
}

// readyState: 0 disconnected, 1 connected, 2 connecting, 3 disconnecting (design D4).
// Only a fully open connection counts as "connected".
function getDbStatus() {
  return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
}

module.exports = { connectDB, getDbStatus, redactUri };
