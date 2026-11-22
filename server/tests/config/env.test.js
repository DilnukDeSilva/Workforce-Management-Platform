const { getEnv } = require('../../src/config/env');

// getEnv() reads process.env when it is called, so each test sets the variables it needs.
const ORIGINAL_ENV = process.env;

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.PORT;
  delete process.env.MONGODB_URI;
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe('getEnv', () => {
  test('TC-1.1 UC-1: returns the port and MongoDB URI when both are set', () => {
    process.env.PORT = '4000';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/wfm';
    expect(getEnv()).toEqual({ port: 4000, mongodbUri: 'mongodb://localhost:27017/wfm' });
  });

  test('TC-1.2 UC-1-A1: defaults the port to 5000 when PORT is unset', () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/wfm';
    expect(getEnv().port).toBe(5000);
  });

  test('TC-1.3 UC-1-A2: passes a full Atlas-style URI through unchanged', () => {
    const uri = 'mongodb+srv://user:p%40ss@cluster0.example.net/wfm?retryWrites=true&w=majority&appName=wfm';
    process.env.MONGODB_URI = uri;
    expect(getEnv().mongodbUri).toBe(uri);
  });

  test('TC-1.4 / TC-1.7 UC-1-E1 UC-1-EC1: a missing MONGODB_URI throws an actionable error', () => {
    expect(() => getEnv()).toThrow(
      'Missing required environment variable: MONGODB_URI. Copy server/.env.example to server/.env.',
    );
  });

  test.each(['', '   '])('TC-1.8 UC-1-EC2: an empty MONGODB_URI (%j) is treated as missing', (value) => {
    process.env.MONGODB_URI = value;
    expect(() => getEnv()).toThrow(/Missing required environment variable: MONGODB_URI/);
  });
});
