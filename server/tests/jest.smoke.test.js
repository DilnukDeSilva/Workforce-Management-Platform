// Smoke test: proves Jest runs and the server's core packages resolve.
// It also keeps `npm test` green before any feature tests exist (Jest fails with no tests).

describe('server test tooling', () => {
  test('core packages resolve', () => {
    expect(() => require.resolve('express')).not.toThrow();
    expect(() => require.resolve('mongoose')).not.toThrow();
    expect(() => require.resolve('supertest')).not.toThrow();
  });
});
