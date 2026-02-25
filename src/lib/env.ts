import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgresql://postgres:postgres@localhost:5432/educonnect?schema=public'),
  SESSION_COOKIE_NAME: z.string().min(3).default('educonnect_session'),
  SESSION_TTL_DAYS: z.string().default('14'),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
  SECURITY_HASH_SALT: z.string().min(16).default('educonnect-local-salt-change-me'),
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

const globalEnv = globalThis as unknown as {
  __educonnectValidatedEnv?: z.infer<typeof envSchema>;
};

function parseEnv() {
  if (globalEnv.__educonnectValidatedEnv) return globalEnv.__educonnectValidatedEnv;

  const parsed = envSchema.parse(process.env);
  globalEnv.__educonnectValidatedEnv = parsed;
  return parsed;
}

export function ensureEnv(): z.infer<typeof envSchema> {
  const env = parseEnv();

  const strictValidation =
    env.NODE_ENV === 'production' &&
    (process.env.VERCEL === '1' || process.env.STRICT_ENV_VALIDATION === 'true');

  if (strictValidation) {
    const isPostgres =
      env.DATABASE_URL.startsWith('postgresql://') || env.DATABASE_URL.startsWith('postgres://');
    if (!isPostgres) {
      throw new Error('DATABASE_URL must be a PostgreSQL connection string in production.');
    }

    if (!env.NEXT_PUBLIC_SITE_URL.startsWith('https://')) {
      throw new Error('NEXT_PUBLIC_SITE_URL must use https in production.');
    }

    const weakSalt =
      env.SECURITY_HASH_SALT.includes('replace-with') ||
      env.SECURITY_HASH_SALT.includes('local-salt') ||
      env.SECURITY_HASH_SALT.length < 24;
    if (weakSalt) {
      throw new Error('SECURITY_HASH_SALT must be a strong random secret in production.');
    }
  }

  return env;
}

export function isAiEnabled(): boolean {
  const env = ensureEnv();
  return (
    env.AI_FEATURES_ENABLED === 'true' || env.NEXT_PUBLIC_AI_FEATURES_ENABLED === 'true' || false
  );
}
