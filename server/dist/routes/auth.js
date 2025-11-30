"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const db_1 = require("../db");
const zod_1 = require("zod");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const tokens_1 = require("../utils/tokens");
const requireAuth_1 = require("../middleware/requireAuth");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const authRouter = (0, express_1.Router)();
exports.authRouter = authRouter;
const signupSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    displayName: zod_1.z.string().min(1)
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8)
});
const refreshSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1)
});
const sanitizeUser = (user) => ({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt
});
const issueTokens = (user) => ({
    accessToken: (0, tokens_1.generateAccessToken)({ sub: user.id, email: user.email }),
    refreshToken: (0, tokens_1.generateRefreshToken)({ sub: user.id, email: user.email })
});
authRouter.post('/signup', async (req, res) => {
    try {
        const body = signupSchema.parse(req.body);
        const email = body.email.toLowerCase();
        const existingUser = await db_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ message: 'Email already in use.' });
        }
        const passwordHash = await bcryptjs_1.default.hash(body.password, 10);
        const user = await db_1.prisma.user.create({
            data: {
                email,
                displayName: body.displayName,
                passwordHash
            }
        });
        const tokens = issueTokens(user);
        return res.status(201).json({ user: sanitizeUser(user), ...tokens });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Invalid payload.', errors: error.flatten() });
        }
        console.error('Signup failed:', error);
        return res.status(500).json({ message: 'Failed to create account.' });
    }
});
authRouter.post('/login', async (req, res) => {
    try {
        const body = loginSchema.parse(req.body);
        const email = body.email.toLowerCase();
        const user = await db_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        const isValid = await bcryptjs_1.default.compare(body.password, user.passwordHash);
        if (!isValid) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        const tokens = issueTokens(user);
        return res.json({ user: sanitizeUser(user), ...tokens });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Invalid payload.', errors: error.flatten() });
        }
        console.error('Signup failed:', error);
        return res.status(500).json({ message: 'Failed to login.' });
    }
});
authRouter.post('/refresh', (req, res) => {
    try {
        const body = refreshSchema.parse(req.body);
        const payload = jsonwebtoken_1.default.verify(body.refreshToken, env_1.env.JWT_SECRET);
        const tokens = issueTokens({ id: payload.sub, email: payload.email });
        return res.json(tokens);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Invalid payload.', errors: error.flatten() });
        }
        return res.status(401).json({ message: 'Invalid refresh token.' });
    }
});
authRouter.get('/me', requireAuth_1.requireAuth, async (req, res) => {
    try {
        const user = await db_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, email: true, displayName: true, createdAt: true }
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        return res.json({ user });
    }
    catch (error) {
        console.error('Load profile failed:', error);
        return res.status(500).json({ message: 'Failed to load profile.' });
    }
});
