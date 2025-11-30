import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).default('file:./dev.db'),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default('*'),
  JWT_SECRET: z
    .string()
    .min(10, 'JWT_SECRET must be at least 10 characters long')
    .optional()
    .default('change-me-dev-secret'),
  ACCESS_TOKEN_TTL: z.string().default('1d'),
  REFRESH_TOKEN_TTL: z.string().default('7d')
});

type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  PORT: process.env.PORT,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  JWT_SECRET: process.env.JWT_SECRET,
  ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL: process.env.REFRESH_TOKEN_TTL
});
