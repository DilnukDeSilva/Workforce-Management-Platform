const ApiError = require('../utils/ApiError');

// The single place that formats errors (design D6). Express recognises an error
// handler by its four arguments, so `next` must stay in the signature even though it is unused
// (eslint.config.js allows an unused `next` for exactly this reason).
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    const body = { success: false, message: err.message };
    if (err.errors) body.errors = err.errors;
    return res.status(err.status).json(body);
  }

  // Errors from Express middleware (e.g. malformed JSON from express.json()) carry a
  // 4xx status. They are client mistakes, not server failures, so keep the status (design D10).
  const status = err.status || err.statusCode;
  if (status >= 400 && status < 500) {
    return res.status(status).json({ success: false, message: err.message });
  }

  // Anything else is a bug: log the details for us, send a generic message to the client
  // so stack traces and internals never leak.
  console.error(err);
  return res.status(500).json({ success: false, message: 'Something went wrong' });
}

module.exports = errorHandler;
