import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';
import { buildFocusSnapshotForUser } from '../utils/stats';

const statsRouter = Router();

statsRouter.use(requireAuth);

statsRouter.get('/summary', async (req: AuthenticatedRequest, res) => {
  try {
    const snapshot = await buildFocusSnapshotForUser(req.user!.id);
    return res.json(snapshot);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load stats.' });
  }
});

export { statsRouter };
