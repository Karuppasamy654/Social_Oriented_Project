const AuditLog = require('../models/AuditLog');

/**
 * Sanitizes metadata to ensure secrets or sensitive tokens are never logged.
 */
function sanitizeMetadata(meta) {
  if (!meta || typeof meta !== 'object') return {};
  const sanitized = { ...meta };
  const sensitiveKeys = [
    'client_secret', 'clientSecret', 'access_token', 'accessToken',
    'refresh_token', 'refreshToken', 'password', 'code', 'token', 'secret'
  ];

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(s => key.toLowerCase().includes(s.toLowerCase()))) {
      delete sanitized[key];
    }
  }
  return sanitized;
}

/**
 * Logs a security audit event to the database.
 */
async function logAuditEvent(req, eventType, metadata = {}, userId = null) {
  try {
    const ipAddress = req
      ? (req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || '')
      : '';
    const userAgent = req ? (req.headers['user-agent'] || '') : '';
    const effectiveUserId = userId || (req && req.user ? (req.user.id || req.user._id) : null);

    await AuditLog.create({
      userId: effectiveUserId || null,
      eventType,
      ipAddress: String(ipAddress).split(',')[0].trim(),
      userAgent: String(userAgent),
      metadata: sanitizeMetadata(metadata),
      timestamp: new Date()
    });
  } catch (err) {
    console.error(`🔒 Audit logger error [${eventType}]:`, err.message);
  }
}

module.exports = {
  logAuditEvent,
  sanitizeMetadata
};
