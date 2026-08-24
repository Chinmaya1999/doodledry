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

/*
|--------------------------------------------------------------------------
| CORS Configuration
|--------------------------------------------------------------------------
| Production:
|   Frontend: https://inventory.doodledry.in
|   Backend:  https://api.doodledry.in
|
| Development:
|   localhost / 127.0.0.1
|   Private LAN IPs
|--------------------------------------------------------------------------
*/

// Allowed production origins
const ALLOWED_ORIGINS = [
  'https://inventory.doodledry.in',
  'https://api.doodledry.in',

  // Optional: allow direct access using backend IP
  'http://13.235.50.172',
  'https://13.235.50.172',
];

// Matches:
// http://localhost:3000
// https://localhost:5173
// http://127.0.0.1:3000
// http://192.168.x.x:5173
// http://10.x.x.x:3000
// http://172.16.x.x:3000 - 172.31.x.x
const LAN_ORIGIN_PATTERN =
  /^https?:\/\/(localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2})(?::\d+)?$/;


/*
|--------------------------------------------------------------------------
| Helmet
|--------------------------------------------------------------------------
*/

app.use(helmet());


/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

app.use(
  cors({
    origin: function (origin, callback) {

      // Allow requests without an Origin header.
      // Examples:
      // curl
      // Postman
      // server-to-server requests
      if (!origin) {
        return callback(null, true);
      }

      // Allow configured production origins
      if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      // Allow localhost/private LAN during development
      if (
        env.nodeEnv !== 'production' &&
        LAN_ORIGIN_PATTERN.test(origin)
      ) {
        return callback(null, true);
      }

      console.error(`CORS blocked origin: ${origin}`);

      return callback(
        new Error(`Origin ${origin} is not allowed by CORS.`)
      );
    },

    // Required if your frontend uses cookies
    credentials: true,

    // Explicitly allow common methods
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    // Explicitly allow common headers
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
    ],

    // Allow browsers to access these response headers
    exposedHeaders: [
      'Content-Length',
    ],

    // Cache preflight response
    maxAge: 86400,

    // HTTP 204 response for OPTIONS
    optionsSuccessStatus: 204,
  })
);


/*
|--------------------------------------------------------------------------
| Explicit OPTIONS / Preflight Handling
|--------------------------------------------------------------------------
*/

app.options('*', cors());


/*
|--------------------------------------------------------------------------
| Body Parsers
|--------------------------------------------------------------------------
*/

app.use(
  express.json({
    limit: '2mb',
  })
);

app.use(
  express.urlencoded({
    extended: true,
  })
);


/*
|--------------------------------------------------------------------------
| Cookie Parser
|--------------------------------------------------------------------------
*/

app.use(cookieParser());


/*
|--------------------------------------------------------------------------
| MongoDB Sanitization
|--------------------------------------------------------------------------
*/

app.use(mongoSanitize());


/*
|--------------------------------------------------------------------------
| HTTP Logger
|--------------------------------------------------------------------------
*/

if (env.nodeEnv !== 'test') {
  app.use(
    morgan(
      env.nodeEnv === 'production'
        ? 'combined'
        : 'dev'
    )
  );
}


/*
|--------------------------------------------------------------------------
| Static Uploads
|--------------------------------------------------------------------------
*/

app.use(
  '/uploads',
  express.static(
    path.resolve('uploads')
  )
);


/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

app.use(
  '/api',
  apiLimiter,
  routes
);


/*
|--------------------------------------------------------------------------
| 404 Handler
|--------------------------------------------------------------------------
*/

app.use(notFoundHandler);


/*
|--------------------------------------------------------------------------
| Global Error Handler
|--------------------------------------------------------------------------
*/

app.use(errorHandler);


/*
|--------------------------------------------------------------------------
| Export App
|--------------------------------------------------------------------------
*/

export default app;