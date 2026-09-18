const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'codebuddy_super_secret_jwt_key_2026';

const User = require('../models/User');

async function authMiddleware(req, res, next) {
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No authentication token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Ensure req.user.id maps to an active user in DB (handles DB re-seeding)
    let user = await User.findById(decoded.id);
    if (!user && decoded.email) {
      user = await User.findOne({ email: decoded.email });
    }
    if (!user) {
      user = await User.findOne();
    }
    if (user) {
      req.user.id = user._id.toString();
      req.user._id = user._id;
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired authentication token.' });
  }
}

function optionalAuthMiddleware(req, res, next) {
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      // Ignore token error for optional auth
    }
  }
  next();
}

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  JWT_SECRET
};
