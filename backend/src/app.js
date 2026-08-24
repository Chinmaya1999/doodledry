import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import path from 'node:path';
import env from './config/env.js';
import routes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

const app = express();

// Matches http(s)://localhost, 127.0.0.1, or any private LAN IP (192.168.x.x,
// 10.x.x.x, 172.16-31.x.x) on any port - lets the same dev build be opened
// from a phone on the same Wi-Fi without hand-editing CORS config each time.
const LAN_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2})(?::\d+)?$/;

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true); // same-origin / curl / server-to-server
    if (env.clientUrls.includes(origin)) return callback(null, true);
    if (env.nodeEnv !== 'production' && LAN_ORIGIN_PATTERN.test(origin)) return callback(null, true);
    return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(mongoSanitize());

if (env.nodeEnv !== 'test') {
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
}

app.use('/uploads', express.static(path.resolve('uploads')));

app.use('/api', apiLimiter, routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
