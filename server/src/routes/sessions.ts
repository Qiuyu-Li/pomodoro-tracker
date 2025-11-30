import { Router } from 'express';
import { prisma } from '../db';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';
import { z } from 'zod';

const router = Router();

const baseSessionSchema = z.object({
  phase: z.enum(['focus', 'short-break', 'long-break']).default('focus'),
  sourceSegmentId: z.string().optional().nullable(),
  goal: z.string().max(500).optional().nullable(),
  project: z.string().max(200).optional().nullable(),
  durationMinutes: z.number().int().positive(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  progressPercent: z.number().int().min(0).max(100).optional(),
  focusLevel: z.number().int().min(1).max(10).optional(),
  comment: z.string().max(1000).optional().nullable()
});

const createSchema = baseSessionSchema;
const updateSchema = baseSessionSchema.partial();

router.use(requireAuth);

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { userId: req.user!.id },
      orderBy: { startTime: 'desc' }
    });

    return res.json({ sessions });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load sessions.' });
  }
});

router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const body = createSchema.parse(req.body);

    const session = await prisma.session.create({
      data: {
        userId: req.user!.id,
        phase: body.phase,
        sourceSegmentId: body.sourceSegmentId ?? null,
        goal: body.goal ?? null,
        project: body.project ?? null,
        durationMin: body.durationMinutes,
        startTime: new Date(body.startTime),
        endTime: new Date(body.endTime),
        progress: body.progressPercent,
        focusScore: body.focusLevel,
        comment: body.comment ?? null
      }
    });

    return res.status(201).json({ session });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid payload.', errors: error.flatten() });
    }
    return res.status(500).json({ message: 'Failed to create session.' });
  }
});

router.put('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const body = updateSchema.parse(req.body);
    const sessionId = req.params.id;

    const existing = await prisma.session.findFirst({ where: { id: sessionId, userId: req.user!.id } });
    if (!existing) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    const session = await prisma.session.update({
      where: { id: sessionId },
      data: {
        phase: body.phase ?? existing.phase,
        sourceSegmentId: body.sourceSegmentId ?? existing.sourceSegmentId,
        goal: body.goal ?? existing.goal,
        project: body.project ?? existing.project,
        durationMin: body.durationMinutes ?? existing.durationMin,
        startTime: body.startTime ? new Date(body.startTime) : existing.startTime,
        endTime: body.endTime ? new Date(body.endTime) : existing.endTime,
        progress: body.progressPercent ?? existing.progress,
        focusScore: body.focusLevel ?? existing.focusScore,
        comment: body.comment ?? existing.comment
      }
    });

    return res.json({ session });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid payload.', errors: error.flatten() });
    }
    return res.status(500).json({ message: 'Failed to update session.' });
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const sessionId = req.params.id;

    const existing = await prisma.session.findFirst({ where: { id: sessionId, userId: req.user!.id } });
    if (!existing) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    await prisma.session.delete({ where: { id: sessionId } });
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete session.' });
  }
});

export { router as sessionRouter };
