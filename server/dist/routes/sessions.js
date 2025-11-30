"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionRouter = void 0;
const express_1 = require("express");
const db_1 = require("../db");
const requireAuth_1 = require("../middleware/requireAuth");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
exports.sessionRouter = router;
const baseSessionSchema = zod_1.z.object({
    phase: zod_1.z.enum(['focus', 'short-break', 'long-break']).default('focus'),
    sourceSegmentId: zod_1.z.string().optional().nullable(),
    goal: zod_1.z.string().max(500).optional().nullable(),
    project: zod_1.z.string().max(200).optional().nullable(),
    durationMinutes: zod_1.z.number().int().positive(),
    startTime: zod_1.z.string().datetime(),
    endTime: zod_1.z.string().datetime(),
    progressPercent: zod_1.z.number().int().min(0).max(100).optional(),
    focusLevel: zod_1.z.number().int().min(1).max(10).optional(),
    comment: zod_1.z.string().max(1000).optional().nullable()
});
const createSchema = baseSessionSchema;
const updateSchema = baseSessionSchema.partial();
router.use(requireAuth_1.requireAuth);
router.get('/', async (req, res) => {
    try {
        const sessions = await db_1.prisma.session.findMany({
            where: { userId: req.user.id },
            orderBy: { startTime: 'desc' }
        });
        return res.json({ sessions });
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to load sessions.' });
    }
});
router.post('/', async (req, res) => {
    try {
        const body = createSchema.parse(req.body);
        const session = await db_1.prisma.session.create({
            data: {
                userId: req.user.id,
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
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Invalid payload.', errors: error.flatten() });
        }
        return res.status(500).json({ message: 'Failed to create session.' });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const body = updateSchema.parse(req.body);
        const sessionId = req.params.id;
        const existing = await db_1.prisma.session.findFirst({ where: { id: sessionId, userId: req.user.id } });
        if (!existing) {
            return res.status(404).json({ message: 'Session not found.' });
        }
        const session = await db_1.prisma.session.update({
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
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Invalid payload.', errors: error.flatten() });
        }
        return res.status(500).json({ message: 'Failed to update session.' });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const sessionId = req.params.id;
        const existing = await db_1.prisma.session.findFirst({ where: { id: sessionId, userId: req.user.id } });
        if (!existing) {
            return res.status(404).json({ message: 'Session not found.' });
        }
        await db_1.prisma.session.delete({ where: { id: sessionId } });
        return res.status(204).send();
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to delete session.' });
    }
});
