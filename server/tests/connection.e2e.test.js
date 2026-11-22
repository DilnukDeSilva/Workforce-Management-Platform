const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/app');
const { connectDB } = require('../src/config/db');

// Full flow without a real database: connectDB() runs for real (registering its listeners)
// with mongoose.connect mocked, then the connection state is driven through the
// readyState setter, which is exactly what the driver does and emits the same events.
const setReadyState = (state) => {
  mongoose.connection.readyState = state;
};

let exitSpy;
let logSpy;
let warnSpy;
let unhandled;
const onUnhandled = (reason) => unhandled.push(reason);

beforeAll(async () => {
  jest.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);
  await connectDB('mongodb://localhost:27017/wfm');
});

beforeEach(() => {
  unhandled = [];
  process.on('unhandledRejection', onUnhandled);
  exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  setReadyState(1);
  logSpy.mockClear();
});

afterEach(() => {
  process.off('unhandledRejection', onUnhandled);
  exitSpy.mockRestore();
  logSpy.mockRestore();
  warnSpy.mockRestore();
  console.error.mockRestore();
  setReadyState(0);
});

const healthDb = async () => (await request(app).get('/api/health')).body.data.db;

describe('runtime disconnect and recovery', () => {
  test('TC-3.1 UC-3: a drop is logged, health reports it, and recovery is reported too', async () => {
    expect(await healthDb()).toBe('connected');

    setReadyState(0);
    expect(warnSpy).toHaveBeenCalledWith('MongoDB disconnected');
    expect(await healthDb()).toBe('disconnected');

    setReadyState(1);
    expect(logSpy).toHaveBeenCalledWith('MongoDB connected');
    expect(await healthDb()).toBe('connected');

    expect(exitSpy).not.toHaveBeenCalled();
  });

  test('TC-3.2 UC-3-A1: during a long outage the server keeps serving health as "disconnected"', async () => {
    setReadyState(0);
    for (let i = 0; i < 5; i++) {
      expect(await healthDb()).toBe('disconnected');
    }
    expect(exitSpy).not.toHaveBeenCalled();
  });

  test('TC-3.3 UC-3-E1: repeated driver errors while down do not crash or leave unhandled rejections', async () => {
    setReadyState(0);
    for (let i = 0; i < 5; i++) {
      mongoose.connection.emit('error', new Error('server selection timed out'));
    }
    expect(await healthDb()).toBe('disconnected');
    expect(exitSpy).not.toHaveBeenCalled();
    expect(unhandled).toEqual([]);
  });

  test('TC-3.4 UC-3-EC1: flapping connectivity logs each transition once and health is never stale', async () => {
    const seen = [];
    for (let cycle = 0; cycle < 4; cycle++) {
      setReadyState(0);
      seen.push(await healthDb());
      setReadyState(1);
      seen.push(await healthDb());
    }

    expect(seen).toEqual(Array(4).fill(['disconnected', 'connected']).flat());
    expect(warnSpy).toHaveBeenCalledTimes(4);
    expect(logSpy.mock.calls.filter(([msg]) => msg === 'MongoDB connected')).toHaveLength(4);
    expect(mongoose.connection.listenerCount('disconnected')).toBe(1); // no leaked listeners
    expect(exitSpy).not.toHaveBeenCalled();
  });

  test('TC-4.1: this feature defines no models, so nothing can be written to the database', () => {
    expect(mongoose.modelNames()).toEqual([]);
  });
});
