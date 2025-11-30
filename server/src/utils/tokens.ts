import jwt, { type Secret, type SignOptions, type JwtPayload } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { env } from '../config/env';

type TokenPayload = JwtPayload & {
  sub: string;
  email: string;
  version: number;
};

const secret: Secret = env.JWT_SECRET;

const asExpiresIn = (value: string): StringValue | number => value as StringValue;

export const generateAccessToken = (payload: TokenPayload) =>
  jwt.sign(payload, secret, { expiresIn: asExpiresIn(env.ACCESS_TOKEN_TTL) } satisfies SignOptions);

export const generateRefreshToken = (payload: TokenPayload) =>
  jwt.sign(payload, secret, { expiresIn: asExpiresIn(env.REFRESH_TOKEN_TTL) } satisfies SignOptions);
