const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/app');

// No real database: the test drives mongoose.connection.readyState directly (through the
// same setter the driver uses), so the health route reads exactly what it would in production.
const setReadyState = (state) => {
  mongoose.connection.readyState = state;
};

afterEach(() => setReadyState(0));

describe('GET /api/health', () => {
  test('TC-2.1 TC-5.4 UC-2: reports "connected" inside the success envelope', async () => {
    setReadyState(1);
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'Service healthy',
      data: { status: 'ok', db: 'connected' },
    });
  });

  test.each([0, 3])('TC-2.2 UC-2-A1: readyState %i returns 200 with db "disconnected", not a 5xx', async (state) => {
    setReadyState(state);
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ status: 'ok', db: 'disconnected' });
  });

  test('TC-2.4 UC-2-EC1: while connecting (readyState 2) it reports "disconnected", then "connected" once open', async () => {
    setReadyState(2);
    const connecting = await request(app).get('/api/health');
    expect(connecting.body.data.db).toBe('disconnected');

    setReadyState(1);
    const connected = await request(app).get('/api/health');
    expect(connected.body.data.db).toBe('connected');
  });

  test('TC-2.5 UC-2-EC2: rapid requests each reflect the state at the moment of the request', async () => {
    const states = [1, 0, 1, 0, 1];
    const seen = [];
    for (const state of states) {
      setReadyState(state);
      const res = await request(app).get('/api/health');
      seen.push(res.body.data.db);
    }
    expect(seen).toEqual(['connected', 'disconnected', 'connected', 'disconnected', 'connected']);
  });
});
