// An error that carries an HTTP status. Controllers throw it; errorHandler turns it
// into the failure envelope { success: false, message, errors? }.
class ApiError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors; // optional list of { field, message } for validation errors
  }
}

module.exports = ApiError;
