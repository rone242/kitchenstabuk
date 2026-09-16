import { z } from 'zod';

const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    API_PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
    DATABASE_URL: z.string().url().optional(),
    DIRECT_URL: z.string().url().optional(),
    REDIS_HOST: z.string().min(1).default('localhost'),
    REDIS_PORT: z.coerce.number().int().min(1).max(65_535).default(6379),
    JWT_ACCESS_SECRET: z.string().min(32).optional(),
    JWT_REFRESH_SECRET: z.string().min(32).optional(),
    JWT_ACCESS_EXPIRES_IN: z.string().min(2).default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().min(2).default('30d'),
    AUTH_COOKIE_DOMAIN: z.string().min(1).optional(),
    AUTH_COOKIE_SECURE: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
    LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
    LOGIN_RATE_LIMIT_TTL_MS: z.coerce.number().int().positive().default(60_000),
    WEB_URL: z.string().url().default('http://localhost:3000'),
    ADMIN_URL: z.string().url().default('http://localhost:3001'),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:3000,http://localhost:3001'),
    RATE_LIMIT_TTL_MS: z.coerce.number().int().positive().default(60_000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
    MAX_UPLOAD_SIZE_MB: z.coerce.number().positive().max(50).default(10),
    UPLOAD_PROVIDER: z
      .enum(['local', 's3', 'r2', 'cloudinary'])
      .default('local'),
    UPLOAD_LOCAL_DIR: z.string().min(1).default('uploads'),
    CLOUDINARY_CLOUD_NAME: z
      .string()
      .regex(/^[a-zA-Z0-9_-]+$/)
      .optional(),
    CLOUDINARY_API_KEY: z.string().min(1).optional(),
    CLOUDINARY_API_SECRET: z.string().min(1).optional(),
    CLOUDINARY_FOLDER: z
      .string()
      .regex(/^[a-zA-Z0-9_/-]+$/)
      .default('kitchenstabuk'),
    STORAGE_ENDPOINT: z.string().url().optional(),
    STORAGE_REGION: z.string().min(1).default('auto'),
    STORAGE_BUCKET: z.string().min(1).optional(),
    STORAGE_ACCESS_KEY_ID: z.string().min(1).optional(),
    STORAGE_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    STORAGE_PUBLIC_URL: z.string().url().optional(),
  })
  .passthrough();

export type ApiEnvironment = z.infer<typeof environmentSchema>;

export function validateEnvironment(
  values: Record<string, unknown>,
): ApiEnvironment {
  const result = environmentSchema.safeParse(values);

  if (!result.success) {
    const details = result.error.issues
      .map(
        (issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`,
      )
      .join('; ');
    throw new Error(`Invalid API environment: ${details}`);
  }

  if (result.data.UPLOAD_PROVIDER === 'cloudinary') {
    const missing = (
      [
        'CLOUDINARY_CLOUD_NAME',
        'CLOUDINARY_API_KEY',
        'CLOUDINARY_API_SECRET',
      ] as const
    ).filter((key) => !result.data[key]);
    if (missing.length)
      throw new Error(
        `Invalid API environment: Cloudinary requires ${missing.join(', ')}`,
      );
  }

  if (result.data.NODE_ENV === 'production') {
    const required = [
      'DATABASE_URL',
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
    ] as const;
    const missing = required.filter((key) => !result.data[key]);

    if (missing.length > 0) {
      throw new Error(
        `Invalid API environment: missing production variables ${missing.join(', ')}`,
      );
    }
    if (
      ['s3', 'r2'].includes(result.data.UPLOAD_PROVIDER) &&
      (!result.data.STORAGE_BUCKET || !result.data.STORAGE_PUBLIC_URL)
    ) {
      throw new Error(
        'Invalid API environment: cloud storage requires STORAGE_BUCKET and STORAGE_PUBLIC_URL',
      );
    }
  }

  return result.data;
}
