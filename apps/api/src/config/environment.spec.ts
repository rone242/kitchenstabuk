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

it('requires Cloudinary credentials when selected in every environment', () => {
  expect(() => validateEnvironment({ UPLOAD_PROVIDER: 'cloudinary' })).toThrow(
    /CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET/,
  );
});
it('accepts Cloudinary without S3 settings in production', () => {
  const result = validateEnvironment({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://localhost/test',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    UPLOAD_PROVIDER: 'cloudinary',
    CLOUDINARY_CLOUD_NAME: 'test-cloud',
    CLOUDINARY_API_KEY: 'key',
    CLOUDINARY_API_SECRET: 'secret',
  });
  expect(result.UPLOAD_PROVIDER).toBe('cloudinary');
});
