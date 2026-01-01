import { z } from 'zod';

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  API_VERSION: z.string().default('v1'),

  // Database
  DATABASE_URL: z.string().url('Invalid database URL'),
  DATABASE_POOL_SIZE: z.coerce.number().default(20),
  DATABASE_IDLE_TIMEOUT: z.coerce.number().default(30000),

  // Redis
  REDIS_URL: z.string().url('Invalid redis URL'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // AWS
  AWS_REGION: z.string().default('us-west-2'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET_NAME: z.string().optional(),
  S3_UPLOAD_DIR: z.string().default('uploads/'),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM_EMAIL: z.string().email().optional(),

  // Twilio
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  // Monitoring
  SENTRY_DSN: z.string().optional(),
  DATADOG_API_KEY: z.string().optional(),
  NEW_RELIC_LICENSE_KEY: z.string().optional(),

  // Feature Flags
  ENABLE_DELIVERY_MODULE: z.enum(['true', 'false']).default('true'),
  ENABLE_INSPECTION_MODULE: z.enum(['true', 'false']).default('true'),
  ENABLE_AGRICULTURE_MODULE: z.enum(['true', 'false']).default('false'),
  ENABLE_WHITE_LABEL: z.enum(['true', 'false']).default('false'),
  ENABLE_THERMAL_IMAGING: z.enum(['true', 'false']).default('true'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  CORS_CREDENTIALS: z.enum(['true', 'false']).default('true'),

  // Security
  BCRYPT_ROUNDS: z.coerce.number().default(10),
  COOKIE_SECURE: z.enum(['true', 'false']).default('false'),
  COOKIE_HTTP_ONLY: z.enum(['true', 'false']).default('true'),
  COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('strict'),

  // Drone Hardware
  GPS_ACCURACY_THRESHOLD_M: z.coerce.number().default(10),
  WIND_SPEED_SAFETY_LIMIT_KMH: z.coerce.number().default(50),
  MAX_FLIGHT_TIME_MINUTES: z.coerce.number().default(120),
  BATTERY_CRITICAL_THRESHOLD_PERCENT: z.coerce.number().default(15),

  // URLs
  FRONTEND_URL: z.string().url(),
  WEBSOCKET_URL: z.string().optional(),
  API_BASE_URL: z.string().url(),
});

export type Environment = z.infer<typeof envSchema>;

export function validateEnvironment(): Environment {
  const env = process.env as Record<string, string | undefined>;

  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join('\n');

      throw new Error(
        `❌ Environment validation failed:\n${missingVars}\n\nPlease check your .env file`
      );
    }
    throw error;
  }
}

// Validate on module load
export const validatedEnv = validateEnvironment();
