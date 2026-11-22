const fs = require('fs');
const path = require('path');

// server.js is required without running it (the require.main guard, design D9), and its
// side effects are replaced: no real database, no real port, no real process.exit.
jest.mock('../src/config/db', () => ({
  connectDB: jest.fn(),
  getDbStatus: jest.fn(() => 'connected'),
  redactUri: jest.requireActual('../src/config/db').redactUri,
}));

const { connectDB } = require('../src/config/db');
const app = require('../src/app');
const { start } = require('../src/server');

const ORIGINAL_ENV = process.env;
const SECRET_URI = 'mongodb+srv://admin:SuperSecret123@cluster0.example.net/wfm';

let exitSpy;
let listenSpy;
let errorSpy;
let fakeServer;

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV, MONGODB_URI: 'mongodb://localhost:27017/wfm' };
  delete process.env.PORT;
  fakeServer = { on: jest.fn(), close: jest.fn() };
  exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
  listenSpy = jest.spyOn(app, 'listen').mockImplementation((port, callback) => {
    if (callback) callback();
    return fakeServer;
  });
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  connectDB.mockReset();
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe('start()', () => {
  test('TC-1.1 UC-1: connects to MongoDB before listening', async () => {
    const order = [];
    connectDB.mockImplementation(async () => order.push('connect'));
    listenSpy.mockImplementation(() => {
      order.push('listen');
      return fakeServer;
    });

    await start();

    expect(connectDB).toHaveBeenCalledWith('mongodb://localhost:27017/wfm');
    expect(order).toEqual(['connect', 'listen']);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  test('TC-1.2 UC-1-A1: listens on 5000 when PORT is unset', async () => {
    connectDB.mockResolvedValue();
    await start();
    expect(listenSpy).toHaveBeenCalledWith(5000, expect.any(Function));
  });

  test.each([
    ['TC-1.4 UC-1-E1 (missing)', undefined],
    ['TC-1.7 UC-1-EC1 (no .env file at all)', undefined],
    ['TC-1.8 UC-1-EC2 (empty)', ''],
  ])('%s: a missing MONGODB_URI exits 1 without connecting or listening', async (_name, value) => {
    if (value === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = value;

    await start();

    expect(connectDB).not.toHaveBeenCalled();
    expect(listenSpy).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy.mock.calls.flat().join(' ')).toMatch(/MONGODB_URI/);
  });

  test.each([
    ['TC-1.5 UC-1-E2 (unreachable)', 'connect ECONNREFUSED 127.0.0.1:27017'],
    ['TC-1.6 UC-1-E3 (malformed URI)', 'Invalid scheme, expected connection string to start with "mongodb://"'],
  ])('%s: a failed first connection exits 1 and never listens', async (_name, reason) => {
    connectDB.mockRejectedValue(new Error(`Could not connect to MongoDB at mongodb://localhost:27017/wfm: ${reason}`));

    await start();

    expect(listenSpy).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy.mock.calls.flat().join(' ')).toContain(reason);
  });

  test('TC-1.5 UC-1-E2: the startup error log never contains credentials', async () => {
    process.env.MONGODB_URI = SECRET_URI;
    connectDB.mockRejectedValue(new Error(`server selection failed for ${SECRET_URI}`));

    await start();

    expect(errorSpy.mock.calls.flat().map(String).join(' ')).not.toContain('SuperSecret123');
  });
});

describe('listen errors', () => {
  test('TC-1.1 UC-1: a listen error such as a port in use logs clearly and exits 1', async () => {
    connectDB.mockResolvedValue();
    await start();

    const [event, onError] = fakeServer.on.mock.calls[0];
    expect(event).toBe('error');
    onError(Object.assign(new Error('listen EADDRINUSE: address already in use :::5000'), { code: 'EADDRINUSE' }));

    expect(errorSpy).toHaveBeenCalledWith('Server failed to start: listen EADDRINUSE: address already in use :::5000');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

describe('entry point switch', () => {
  test('TC-5.5: package.json points at src/server.js and index.js is gone', () => {
    const serverDir = path.join(__dirname, '..');
    const pkg = JSON.parse(fs.readFileSync(path.join(serverDir, 'package.json'), 'utf8'));

    expect(pkg.main).toBe('src/server.js');
    expect(pkg.scripts.start).toMatch(/src\/server\.js/);
    expect(pkg.scripts.dev).toMatch(/src\/server\.js/);
    expect(fs.existsSync(path.join(serverDir, 'index.js'))).toBe(false);
  });
});
