const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const defaultProductionOrigins = [
  'https://s-o-p.vercel.app',
  'https://client-ten-pi-39.vercel.app',
  'https://client-huqud2r0z-karuppasamy654s-projects.vercel.app'
];

const configuredOrigins = (process.env.CLIENT_ORIGIN || `http://localhost:3000,${defaultProductionOrigins[0]}`)
  .split(',').map(origin => origin.trim()).filter(Boolean);

// Browsers treat localhost and 127.0.0.1 as different origins. Permit both
// only for local development/test; production stays limited to CLIENT_ORIGIN.
const localOrigins = process.env.NODE_ENV === 'production'
  ? []
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];
const allowedOrigins = [...new Set([...defaultProductionOrigins, ...configuredOrigins, ...localOrigins])];

function originIsAllowed(origin) {
  if (!origin) return true;

  if (process.env.NODE_ENV !== 'production') {
    // Permit any local development origin (localhost or 127.0.0.1 on any port)
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  }

  if (allowedOrigins.includes(origin)) return true;

  // Permit Vercel production frontends without requiring one hardcoded hostname.
  if (/^https:\/\/.*\.vercel\.app$/i.test(origin)) return true;

  return false;
}

const securityMiddleware = [
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: false
  }),
  cors({
    origin(origin, callback) {
      callback(null, originIsAllowed(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 204
  })
];

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // max 300 requests per 15 mins per IP
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});

const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // max 50 OAuth attempts per 15 mins per IP
  message: { error: 'Too many OAuth requests from this IP, please try again after 15 minutes.' }
});

module.exports = { securityMiddleware, apiLimiter, oauthLimiter, allowedOrigins, originIsAllowed };

