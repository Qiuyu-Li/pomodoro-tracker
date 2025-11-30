"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = require("./routes/auth");
const sessions_1 = require("./routes/sessions");
const stats_1 = require("./routes/stats");
const env_1 = require("./config/env");
const createServer = () => {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)({
        origin: env_1.env.CORS_ORIGIN === '*' ? undefined : env_1.env.CORS_ORIGIN,
        credentials: true
    }));
    app.use(express_1.default.json());
    app.get('/', (_req, res) => res.json({
        status: 'ok',
        message: 'Pomodoro Tracker API is running. Try /health, /auth/signup, /sessions, etc.'
    }));
    app.get('/health', (_req, res) => res.json({ status: 'ok' }));
    app.use('/auth', auth_1.authRouter);
    app.use('/sessions', sessions_1.sessionRouter);
    app.use('/stats', stats_1.statsRouter);
    app.use((err, _req, res, _next) => {
        // eslint-disable-next-line no-console
        console.error(err);
        res.status(500).json({ message: 'Unexpected server error.' });
    });
    return app;
};
exports.createServer = createServer;
