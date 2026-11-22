const express = require('express');
const request = require('supertest');
const app = require('../src/app');
const ApiError = require('../src/utils/ApiError');
const notFound = require('../src/middleware/notFound');
const errorHandler = require('../src/middleware/errorHandler');

// A throwaway app with test-only routes, wired with the real notFound + errorHandler,
// so the error paths can be triggered without adding test routes to the real app.
function appWithRoute(handler) {
  const testApp = express();
  testApp.get('/test', handler);
  testApp.use(notFound);
  testApp.use(errorHandler);
  return testApp;
}

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Express app error handling (FR-9)', () => {
  test('TC-5.1: an unknown route returns the 404 failure envelope', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: 'Route not found: GET /api/does-not-exist' });
  });

  test('TC-5.2: an unexpected error returns a generic 500 and is logged server-side', async () => {
    const res = await request(
      appWithRoute(() => {
        throw new Error('boom');
      }),
    ).get('/test');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, message: 'Something went wrong' });
    expect(JSON.stringify(res.body)).not.toMatch(/boom|stack/);
    expect(console.error).toHaveBeenCalled();
  });

  test('TC-5.3: an ApiError keeps its status, message and validation errors', async () => {
    const errors = [{ field: 'email', message: 'taken' }];
    const res = await request(
      appWithRoute(() => {
        throw new ApiError(409, 'Conflict', errors);
      }),
    ).get('/test');

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ success: false, message: 'Conflict', errors });
  });

  test('TC-5.3: async handler rejections reach the error handler (Express 5)', async () => {
    const res = await request(
      appWithRoute(async () => {
        throw new ApiError(400, 'Bad input');
      }),
    ).get('/test');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message: 'Bad input' });
  });

  test('TC-5.3 (D10): malformed JSON returns 400, not 500', async () => {
    const res = await request(app).post('/api/anything').set('Content-Type', 'application/json').send('{"bad json');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(typeof res.body.message).toBe('string');
  });
});
