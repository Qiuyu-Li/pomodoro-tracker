"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statsRouter = void 0;
const express_1 = require("express");
const requireAuth_1 = require("../middleware/requireAuth");
const db_1 = require("../db");
const date_fns_1 = require("date-fns");
const statsRouter = (0, express_1.Router)();
exports.statsRouter = statsRouter;
const sumMinutes = (sessions) => sessions.reduce((acc, session) => acc + session.durationMin, 0);
const average = (values) => {
    const filtered = values.filter((value) => typeof value === 'number');
    if (!filtered.length)
        return null;
    return filtered.reduce((acc, value) => acc + value, 0) / filtered.length;
};
statsRouter.use(requireAuth_1.requireAuth);
statsRouter.get('/summary', async (req, res) => {
    try {
        const now = new Date();
        const weekStart = (0, date_fns_1.startOfWeek)(now, { weekStartsOn: 1 });
        const todayStart = (0, date_fns_1.startOfDay)(now);
        const sessions = await db_1.prisma.session.findMany({
            where: {
                userId: req.user.id,
                startTime: { gte: weekStart }
            }
        });
        const todaySessions = sessions.filter((session) => session.startTime >= todayStart);
        const response = {
            todayMinutes: sumMinutes(todaySessions),
            weekMinutes: sumMinutes(sessions),
            averageProgress: average(sessions.map((session) => session.progress)),
            averageFocus: average(sessions.map((session) => session.focusScore))
        };
        return res.json(response);
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to load stats.' });
    }
});
