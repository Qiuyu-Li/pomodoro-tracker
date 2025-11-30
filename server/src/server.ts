import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { sessionRouter } from './routes/sessions';
import { statsRouter } from './routes/stats';
import { env } from './config/env';
import { friendsRouter } from './routes/friends';

export const createServer = () => {
  const app = express();

  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? undefined : env.CORS_ORIGIN,
      credentials: true
    })
  );
  app.use(express.json());

  app.get('/', (_req, res) => res.json({
    status: 'ok',
    message: 'Pomodoro Tracker API is running. Try /health, /auth/signup, /sessions, etc.'
  }));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/auth', authRouter);
  app.use('/sessions', sessionRouter);
  app.use('/stats', statsRouter);
  app.use('/friends', friendsRouter);

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ message: 'Unexpected server error.' });
  });

  return app;
};
