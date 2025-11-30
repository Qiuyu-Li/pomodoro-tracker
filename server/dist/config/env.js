"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = require("dotenv");
const zod_1 = require("zod");
(0, dotenv_1.config)();
const envSchema = zod_1.z.object({
    DATABASE_URL: zod_1.z.string().min(1).default('file:./dev.db'),
    PORT: zod_1.z.coerce.number().default(4000),
    CORS_ORIGIN: zod_1.z.string().default('*'),
    JWT_SECRET: zod_1.z
        .string()
        .min(10, 'JWT_SECRET must be at least 10 characters long')
        .optional()
        .default('change-me-dev-secret'),
    ACCESS_TOKEN_TTL: zod_1.z.string().default('15m'),
    REFRESH_TOKEN_TTL: zod_1.z.string().default('7d')
});
exports.env = envSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    PORT: process.env.PORT,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    JWT_SECRET: process.env.JWT_SECRET,
    ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL,
    REFRESH_TOKEN_TTL: process.env.REFRESH_TOKEN_TTL
});
