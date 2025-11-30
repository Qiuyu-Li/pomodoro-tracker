import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../db';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing authentication token.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; email: string; version?: number };
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { tokenVersion: true, email: true, id: true } });
    if (!user || typeof payload.version !== 'number' || payload.version !== user.tokenVersion) {
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }
    req.user = { id: user.id, email: payload.email };
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};
