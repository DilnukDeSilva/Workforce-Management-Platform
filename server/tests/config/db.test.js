const mongoose = require('mongoose');
const { connectDB, getDbStatus, redactUri } = require('../../src/config/db');

// The real network is never touched: mongoose.connect is replaced with a spy in every test.
const SECRET_URI = 'mongodb+srv://admin:SuperSecret123@cluster0.example.net/wfm';

let logSpy;
let warnSpy;
let errorSpy;

beforeEach(() => {
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

const allLogOutput = () =>
  [logSpy, warnSpy, errorSpy]
    .flatMap((spy) => spy.mock.calls.flat())
    .map(String)
    .join('\n');

// readyState is a non-configurable getter, so it can't be spied on. Its setter is what the
// driver itself uses (and it emits the matching event), so tests set it directly.
const setReadyState = (state) => {
  mongoose.connection.readyState = state;
};

describe('redactUri', () => {
  test('hides the username and password', () => {
    expect(redactUri(SECRET_URI)).toBe('mongodb+srv://***@cluster0.example.net/wfm');
  });

  test('leaves a URI without credentials unchanged', () => {
    expect(redactUri('mongodb://localhost:27017/wfm')).toBe('mongodb://localhost:27017/wfm');
  });
});

describe('connectDB', () => {
  test('UC-1: connects with a bounded server-selection timeout', async () => {
    const connect = jest.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);
    await connectDB('mongodb://localhost:27017/wfm');
    expect(connect).toHaveBeenCalledWith('mongodb://localhost:27017/wfm', { serverSelectionTimeoutMS: 5000 });
  });

  test('TC-1.5 UC-1-E2: an unreachable database rejects with the driver reason and a redacted URI', async () => {
    jest.spyOn(mongoose, 'connect').mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:27017'));
    const exit = jest.spyOn(process, 'exit').mockImplementation(() => {});

    await expect(connectDB(SECRET_URI)).rejects.toThrow(
      'Could not connect to MongoDB at mongodb+srv://***@cluster0.example.net/wfm: connect ECONNREFUSED 127.0.0.1:27017',
    );
    expect(exit).not.toHaveBeenCalled(); // D2: only server.js decides to exit
  });

  test('TC-1.6 UC-1-E3: a malformed URI rejects without leaking credentials echoed by the driver', async () => {
    jest.spyOn(mongoose, 'connect').mockRejectedValue(new Error(`Invalid scheme in ${SECRET_URI}`));
    const error = await connectDB(SECRET_URI).catch((err) => err);
    expect(error.message).toMatch(/Could not connect to MongoDB/);
    expect(error.message).not.toContain('SuperSecret123');
  });

  test('UC-3-EC1: calling connectDB twice registers the connection listeners only once', async () => {
    jest.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);
    await connectDB('mongodb://localhost:27017/wfm');
    const afterFirst = mongoose.connection.listenerCount('disconnected');
    await connectDB('mongodb://localhost:27017/wfm');
    expect(mongoose.connection.listenerCount('disconnected')).toBe(afterFirst);
  });
});

describe('connection events (listeners registered by connectDB above)', () => {
  test('TC-3.2 UC-3 UC-3-A1: a disconnect is logged and does not exit the process', () => {
    const exit = jest.spyOn(process, 'exit').mockImplementation(() => {});
    mongoose.connection.emit('disconnected');
    expect(warnSpy).toHaveBeenCalledWith('MongoDB disconnected');
    expect(exit).not.toHaveBeenCalled();
  });

  test('TC-3.4 UC-3-EC1: every transition while flapping is logged exactly once', () => {
    for (let i = 0; i < 3; i++) {
      mongoose.connection.emit('disconnected');
      mongoose.connection.emit('connected');
    }
    expect(warnSpy).toHaveBeenCalledTimes(3);
    expect(logSpy.mock.calls.filter(([msg]) => msg === 'MongoDB connected')).toHaveLength(3);
  });

  test('TC-3.3 UC-3-E1: driver errors are logged without credentials and do not throw', () => {
    expect(() => mongoose.connection.emit('error', new Error(`auth failed for ${SECRET_URI}`))).not.toThrow();
    expect(errorSpy).toHaveBeenCalled();
    expect(allLogOutput()).not.toContain('SuperSecret123');
  });
});

describe('getDbStatus (design D4)', () => {
  afterEach(() => setReadyState(0));

  test.each([
    [1, 'connected'],
    [0, 'disconnected'],
    [2, 'disconnected'],
    [3, 'disconnected'],
  ])('UC-2: readyState %i reports "%s"', (state, expected) => {
    setReadyState(state);
    expect(getDbStatus()).toBe(expected);
  });
});
