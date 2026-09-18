const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const securityMiddleware = [
  helmet({
    contentSecurityPolicy: false // Allow inline scripts for Monaco Editor & dev mode
  }),
  cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
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

module.exports = { securityMiddleware, apiLimiter, oauthLimiter };

