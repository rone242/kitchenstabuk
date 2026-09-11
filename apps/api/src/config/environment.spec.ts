import { validateEnvironment } from './environment.js';

describe('validateEnvironment', () => {
  it('provides safe local defaults', () => {
    const environment = validateEnvironment({ NODE_ENV: 'test' });

    expect(environment.API_PORT).toBe(4000);
    expect(environment.CORS_ORIGINS).toContain('http://localhost:3000');
  });

  it('requires critical production secrets', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'production' })).toThrow(
      /DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET/,
    );
  });
});
