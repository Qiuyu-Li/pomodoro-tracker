"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRefreshToken = exports.generateAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const secret = env_1.env.JWT_SECRET;
const asExpiresIn = (value) => value;
const generateAccessToken = (payload) => jsonwebtoken_1.default.sign(payload, secret, { expiresIn: asExpiresIn(env_1.env.ACCESS_TOKEN_TTL) });
exports.generateAccessToken = generateAccessToken;
const generateRefreshToken = (payload) => jsonwebtoken_1.default.sign(payload, secret, { expiresIn: asExpiresIn(env_1.env.REFRESH_TOKEN_TTL) });
exports.generateRefreshToken = generateRefreshToken;
