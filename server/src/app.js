const express = require('express');
const cors = require('cors');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const healthRoutes = require('./routes/health.routes');

// Builds the Express app but never calls listen() (design D5): tests import it and
// drive it with supertest without opening a port; server.js is what starts it.
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/health', healthRoutes);

// These two must stay last: unmatched requests become a 404, then every error is formatted.
app.use(notFound);
app.use(errorHandler);

module.exports = app;
