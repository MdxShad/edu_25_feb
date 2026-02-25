import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required.'),
  SESSION_COOKIE_NAME: z.string().min(3).default('educonnect_session'),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(14),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
  SECURITY_HASH_SALT: z.string().min(24, 'SECURITY_HASH_SALT must be at least 24 characters.'),
  UPLOADS_ENABLED: z.enum(['true', 'false']).default('true'),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  AI_FEATURES_ENABLED: z.string().optional(),
  NEXT_PUBLIC_AI_FEATURES_ENABLED: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  PDF_TERMS_ADMISSION_SLIP: z.string().optional(),
  PDF_TERMS_FEE_RECEIPT: z.string().optional(),
  PDF_TERMS_UNIVERSITY_PAYMENT: z.string().optional(),
  PDF_TERMS_AGENT_PAYOUT: z.string().optional(),
  PDF_TERMS_REPORT: z.string().optional(),
});

type AppEnv = z.infer<typeof envSchema>;

const globalEnv = globalThis as unknown as {
  __educonnectValidatedEnv?: AppEnv;
};

function parseEnv(): AppEnv {
  if (globalEnv.__educonnectValidatedEnv) return globalEnv.__educonnectValidatedEnv;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  globalEnv.__educonnectValidatedEnv = parsed.data;
  return parsed.data;
}

export function ensureEnv(): AppEnv {
  const env = parseEnv();

  const isPostgres =
    env.DATABASE_URL.startsWith('postgresql://') || env.DATABASE_URL.startsWith('postgres://');
  if (!isPostgres) {
    throw new Error('DATABASE_URL must be a PostgreSQL connection string.');
  }

  const weakSalt =
    env.SECURITY_HASH_SALT.includes('replace-with') ||
    env.SECURITY_HASH_SALT.includes('local-salt') ||
    env.SECURITY_HASH_SALT.includes('change-me') ||
    env.SECURITY_HASH_SALT.length < 24;
  if (weakSalt) {
    throw new Error(
      'SECURITY_HASH_SALT must be a long random secret (>=24 chars) and must not use placeholder values.',
    );
  }

  if (env.NODE_ENV === 'production' && !env.NEXT_PUBLIC_SITE_URL.startsWith('https://')) {
    throw new Error('NEXT_PUBLIC_SITE_URL must use https in production.');
  }

  const uploadsEnabled = env.UPLOADS_ENABLED === 'true';
  if (uploadsEnabled && !env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN is required when UPLOADS_ENABLED=true.');
  }

  return env;
}

export function isAiEnabled(): boolean {
  const env = ensureEnv();
  return env.AI_FEATURES_ENABLED === 'true' || env.NEXT_PUBLIC_AI_FEATURES_ENABLED === 'true';
}
