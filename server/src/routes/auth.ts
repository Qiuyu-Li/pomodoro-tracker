import { Router } from 'express';
import { prisma } from '../db';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken } from '../utils/tokens';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { User } from '@prisma/client';
import { generateUniqueShareCode } from '../utils/shareCodes';

const authRouter = Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1)
});

const sanitizeUser = (user: User) => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  createdAt: user.createdAt
});

const issueTokens = (user: { id: string; email: string; tokenVersion: number }) => ({
  accessToken: generateAccessToken({ sub: user.id, email: user.email, version: user.tokenVersion }),
  refreshToken: generateRefreshToken({ sub: user.id, email: user.email, version: user.tokenVersion })
});

authRouter.post('/signup', async (req, res) => {
  try {
    const body = signupSchema.parse(req.body);
    const email = body.email.toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already in use.' });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const shareCode = await generateUniqueShareCode();

    const user = await prisma.user.create({
      data: {
        email,
        displayName: body.displayName,
        passwordHash,
        shareCode
      }
    });

    const tokens = issueTokens(user);
    return res.status(201).json({ user: sanitizeUser(user), ...tokens });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid payload.', errors: error.flatten() });
    }
    // eslint-disable-next-line no-console
    console.error('Failed to create account:', error);
    return res.status(500).json({ message: 'Failed to create account.' });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const body = loginSchema.parse(req.body);
    const email = body.email.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isValid = await bcrypt.compare(body.password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const tokens = issueTokens(user);
    return res.json({ user: sanitizeUser(user), ...tokens });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid payload.', errors: error.flatten() });
    }
    return res.status(500).json({ message: 'Failed to login.' });
  }
});

authRouter.post('/refresh', async (req, res) => {
  try {
    const body = refreshSchema.parse(req.body);
    const payload = jwt.verify(body.refreshToken, env.JWT_SECRET) as { sub: string; email: string; version?: number };
    if (typeof payload.version !== 'number') {
      return res.status(401).json({ message: 'Invalid refresh token.' });
    }
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.tokenVersion !== payload.version) {
      return res.status(401).json({ message: 'Invalid refresh token.' });
    }

    const tokens = issueTokens(user);
    return res.json(tokens);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid payload.', errors: error.flatten() });
    }
    return res.status(401).json({ message: 'Invalid refresh token.' });
  }
});

authRouter.post('/logout', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { tokenVersion: { increment: 1 } }
    });
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: 'Failed to logout.' });
  }
});

authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, displayName: true, createdAt: true }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load profile.' });
  }
});

export { authRouter };
