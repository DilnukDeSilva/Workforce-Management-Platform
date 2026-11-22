const { getDbStatus } = require('../config/db');

// Always 200: the endpoint's job is to *report* database state, not to fail when the
// database is down (UC-2-A1). Monitoring tools read data.db to see the real status.
function getHealth(req, res) {
  res.status(200).json({
    success: true,
    message: 'Service healthy',
    data: { status: 'ok', db: getDbStatus() },
  });
}

module.exports = { getHealth };
