const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const OAuthAccount = require('../models/OAuthAccount');
const { authMiddleware, optionalAuthMiddleware, JWT_SECRET } = require('../middleware/auth');
const { oauthLimiter } = require('../middleware/security');
const { logAuditEvent } = require('../services/auditLogger');
const {
  generateOAuthState,
  validateOAuthState,
  createExchangeTicket,
  consumeExchangeTicket,
  getGoogleAuthUrl,
  exchangeGoogleCode,
  getGitHubAuthUrl,
  exchangeGitHubCode,
  sanitizeRedirectUrl
} = require('../services/oauthService');

/**
 * Deterministically generates a unique CodeBuddy username for new OAuth users.
 */
async function generateUniqueUsername(preferredUsername, email, name) {
  let base = (preferredUsername || (email ? email.split('@')[0] : '') || name || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');

  if (!base || base.length < 3) {
    base = 'user_' + base;
  }

  let candidate = base;
  let counter = 1;
  while (await User.findOne({ normalizedUsername: candidate.toLowerCase() })) {
    candidate = `${base}_${counter}`;
    counter++;
  }
  return candidate;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, username, email, password } = req.body;
    if (!email || !password || !name || !username) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(400).json({ message: 'User with this email or username already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      username,
      email,
      passwordHash,
      authProvider: 'local',
      isOnboarded: false
    });

    const token = jwt.sign({ id: user._id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash || '');
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign({ id: user._id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, user });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error during login.' });
  }
});

// POST /api/auth/exchange -> One-Time Exchange Ticket to Session Payload
router.post('/exchange', oauthLimiter, async (req, res) => {
  try {
    const { ticket } = req.body;
    if (!ticket) {
      return res.status(400).json({ message: 'Exchange ticket is required.' });
    }
    const payload = consumeExchangeTicket(ticket);
    if (!payload) {
      return res.status(400).json({ message: 'Invalid or expired exchange ticket.' });
    }
    return res.json(payload);
  } catch (err) {
    console.error('Ticket exchange error:', err);
    return res.status(500).json({ message: 'Ticket exchange failed.' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    let user = await User.findById(req.user.id).select('-passwordHash');
    if (!user && req.user.email) {
      user = await User.findOne({ email: req.user.email }).select('-passwordHash');
    }
    if (!user) {
      user = await User.findOne().select('-passwordHash');
    }
    if (!user) return res.status(404).json({ message: 'User not found.' });
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/auth/google -> Initiate Google OAuth Flow with Nonce
router.get('/google', oauthLimiter, optionalAuthMiddleware, async (req, res) => {
  try {
    const redirectTarget = sanitizeRedirectUrl(req.query.redirect);
    const action = req.query.action === 'link' ? 'link' : 'login';
    const { state, nonce } = generateOAuthState('google', {
      redirect: redirectTarget,
      action,
      userId: req.user ? (req.user.id || req.user._id) : null
    });

    const authUrl = getGoogleAuthUrl(state, nonce);

    if (req.query.format === 'json' || req.headers.accept?.includes('application/json')) {
      return res.json({ url: authUrl, state, nonce });
    }
    return res.redirect(authUrl);
  } catch (err) {
    console.error('Google OAuth init error:', err);
    return res.status(500).json({ message: 'Failed to initiate Google OAuth.' });
  }
});

// GET / POST /api/auth/google/callback -> Handle Google OAuth Callback
const handleGoogleCallback = async (req, res) => {
  try {
    const code = req.query.code || req.body.code;
    const state = req.query.state || req.body.state;

    if (!code || !state) {
      await logAuditEvent(req, 'google_login_failure', { reason: 'missing_code_or_state' });
      return res.status(400).json({ message: 'Authorization code and state are required.' });
    }

    return await processOAuthCallback('google', code, state, req, res);
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    await logAuditEvent(req, 'google_login_failure', { error: err.message });
    return res.status(500).json({ message: err.message || 'Google authentication failed.' });
  }
};

router.get('/google/callback', oauthLimiter, optionalAuthMiddleware, handleGoogleCallback);
router.post('/google/callback', oauthLimiter, optionalAuthMiddleware, handleGoogleCallback);

// GET /api/auth/github -> Initiate GitHub OAuth Flow with PKCE S256
router.get('/github', oauthLimiter, optionalAuthMiddleware, async (req, res) => {
  try {
    const redirectTarget = sanitizeRedirectUrl(req.query.redirect);
    const action = req.query.action === 'link' ? 'link' : 'login';
    const { state, codeChallenge } = generateOAuthState('github', {
      redirect: redirectTarget,
      action,
      userId: req.user ? (req.user.id || req.user._id) : null
    });

    const authUrl = getGitHubAuthUrl(state, codeChallenge);

    if (req.query.format === 'json' || req.headers.accept?.includes('application/json')) {
      return res.json({ url: authUrl, state, codeChallenge });
    }
    return res.redirect(authUrl);
  } catch (err) {
    console.error('GitHub OAuth init error:', err);
    return res.status(500).json({ message: 'Failed to initiate GitHub OAuth.' });
  }
});

// GET / POST /api/auth/github/callback -> Handle GitHub OAuth Callback
const handleGitHubCallback = async (req, res) => {
  try {
    const code = req.query.code || req.body.code;
    const state = req.query.state || req.body.state;

    if (!code || !state) {
      await logAuditEvent(req, 'github_login_failure', { reason: 'missing_code_or_state' });
      return res.status(400).json({ message: 'Authorization code and state are required.' });
    }

    return await processOAuthCallback('github', code, state, req, res);
  } catch (err) {
    console.error('GitHub OAuth callback error:', err);
    await logAuditEvent(req, 'github_login_failure', { error: err.message });
    return res.status(500).json({ message: err.message || 'GitHub authentication failed.' });
  }
};

router.get('/github/callback', oauthLimiter, optionalAuthMiddleware, handleGitHubCallback);
router.post('/github/callback', oauthLimiter, optionalAuthMiddleware, handleGitHubCallback);

/**
 * Shared Processor for OAuth Callbacks (Google & GitHub)
 */
async function processOAuthCallback(provider, code, stateToken, req, res) {
  // 1. Validate state parameter (CSRF protection & PKCE context)
  const stateCheck = validateOAuthState(stateToken, provider);
  if (!stateCheck.valid) {
    await logAuditEvent(req, 'oauth_state_failure', { provider, reason: stateCheck.reason });
    return res.status(400).json({
      error: 'invalid_state',
      message: 'Invalid or expired state parameter. OAuth authentication aborted for security.'
    });
  }

  const extraData = stateCheck.extraData || {};
  const isLinkAction = extraData.action === 'link';
  const redirectTarget = sanitizeRedirectUrl(extraData.redirect);

  // 2. Exchange authorization code with provider (including nonce validation & PKCE verifier)
  let identity;
  try {
    if (provider === 'google') {
      identity = await exchangeGoogleCode(code, stateCheck.nonce);
    } else {
      identity = await exchangeGitHubCode(code, stateCheck.codeVerifier);
    }
  } catch (err) {
    await logAuditEvent(req, `${provider}_login_failure`, { error: err.message });
    return res.status(400).json({
      error: 'code_exchange_failed',
      message: err.message || `Failed to authenticate with ${provider}.`
    });
  }

  // 3. Handle Account Linking Flow
  if (isLinkAction) {
    const userIdToLink = extraData.userId || (req.user ? (req.user.id || req.user._id) : null);
    if (!userIdToLink) {
      await logAuditEvent(req, 'oauth_account_conflict', { provider, reason: 'unauthenticated_link_attempt' });
      return res.status(401).json({ message: 'You must be logged in to link an account.' });
    }

    const existingOAuth = await OAuthAccount.findOne({ provider, providerAccountId: identity.providerAccountId });
    if (existingOAuth && existingOAuth.userId.toString() !== userIdToLink.toString()) {
      await logAuditEvent(req, 'oauth_account_conflict', { provider, providerAccountId: identity.providerAccountId }, userIdToLink);
      return res.status(409).json({ message: `This ${provider} account is already linked to another CodeBuddy user.` });
    }

    if (!existingOAuth) {
      await OAuthAccount.create({
        userId: userIdToLink,
        provider,
        providerAccountId: identity.providerAccountId,
        email: identity.email,
        emailVerified: identity.emailVerified
      });
    }

    await logAuditEvent(req, 'oauth_account_linked', { provider, providerAccountId: identity.providerAccountId }, userIdToLink);

    const linkPayload = { message: `${provider} account successfully linked!`, redirect: redirectTarget };

    // If HTTP GET browser redirect, use one-time ticket to avoid URL token exposure
    if (req.method === 'GET' && !req.headers.accept?.includes('application/json')) {
      const ticket = createExchangeTicket(linkPayload);
      return res.redirect(`/auth/callback?ticket=${encodeURIComponent(ticket)}`);
    }

    return res.json(linkPayload);
  }

  // 4. Handle Standard Login / Registration Flow
  let oauthAcc = await OAuthAccount.findOne({ provider, providerAccountId: identity.providerAccountId });
  let user = null;

  if (oauthAcc) {
    user = await User.findById(oauthAcc.userId);
  }

  // If no OAuthAccount record exists, check verified email matching
  if (!user && identity.emailVerified && identity.email) {
    user = await User.findOne({ email: identity.email });
    if (user) {
      oauthAcc = await OAuthAccount.create({
        userId: user._id,
        provider,
        providerAccountId: identity.providerAccountId,
        email: identity.email,
        emailVerified: identity.emailVerified
      });
      await logAuditEvent(req, 'oauth_account_linked', { provider, providerAccountId: identity.providerAccountId, reason: 'verified_email_match' }, user._id);
    }
  }

  // If no existing user was found, create a new real CodeBuddy user
  if (!user) {
    const uniqueUsername = await generateUniqueUsername(identity.username, identity.email, identity.name);
    user = await User.create({
      name: identity.name || uniqueUsername,
      displayName: identity.name || uniqueUsername,
      username: uniqueUsername,
      email: identity.email || `${uniqueUsername}@${provider}.auth`,
      avatar: identity.avatar || (provider === 'google'
        ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250'
        : 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=250'),
      authProvider: provider,
      isOnboarded: false,
      githubUrl: provider === 'github' && identity.username ? `https://github.com/${identity.username}` : ''
    });

    oauthAcc = await OAuthAccount.create({
      userId: user._id,
      provider,
      providerAccountId: identity.providerAccountId,
      email: identity.email,
      emailVerified: identity.emailVerified
    });
  }

  await logAuditEvent(req, `${provider}_login_success`, { providerAccountId: identity.providerAccountId }, user._id);

  const token = jwt.sign(
    { id: user._id, email: user.email, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const authResultPayload = {
    token,
    user,
    redirect: redirectTarget
  };

  // If browser GET redirect, use short-lived one-time exchange ticket (never place raw JWT in URL!)
  if (req.method === 'GET' && !req.headers.accept?.includes('application/json')) {
    const ticket = createExchangeTicket(authResultPayload);
    return res.redirect(`/auth/callback?ticket=${encodeURIComponent(ticket)}`);
  }

  return res.json(authResultPayload);
}

// GET /api/auth/providers -> Get connected accounts for current user
router.get('/providers', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const accounts = await OAuthAccount.find({ userId });
    const googleAcc = accounts.find(a => a.provider === 'google');
    const githubAcc = accounts.find(a => a.provider === 'github');

    return res.json({
      google: {
        connected: Boolean(googleAcc),
        email: googleAcc ? googleAcc.email : null,
        linkedAt: googleAcc ? googleAcc.createdAt : null
      },
      github: {
        connected: Boolean(githubAcc),
        email: githubAcc ? githubAcc.email : null,
        linkedAt: githubAcc ? githubAcc.createdAt : null
      },
      hasPassword: Boolean(user.passwordHash && user.passwordHash.length > 0)
    });
  } catch (err) {
    console.error('Get providers error:', err);
    return res.status(500).json({ message: 'Server error retrieving providers.' });
  }
});

// DELETE /api/auth/providers/:provider -> Unlink an OAuth provider
router.delete('/providers/:provider', authMiddleware, async (req, res) => {
  try {
    const { provider } = req.params;
    if (!['google', 'github'].includes(provider)) {
      return res.status(400).json({ message: 'Invalid OAuth provider.' });
    }

    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const targetAccount = await OAuthAccount.findOne({ userId, provider });
    if (!targetAccount) {
      return res.status(404).json({ message: `${provider} account is not linked to your user.` });
    }

    // SAFE UNLINK RULE: Verify user will retain at least one authentication method
    const allLinked = await OAuthAccount.find({ userId });
    const hasPassword = Boolean(user.passwordHash && user.passwordHash.length > 0);
    const totalLoginMethods = allLinked.length + (hasPassword ? 1 : 0);

    if (totalLoginMethods <= 1) {
      await logAuditEvent(req, 'oauth_account_conflict', { provider, reason: 'safe_unlink_rule_blocked' }, userId);
      return res.status(400).json({
        message: 'Cannot unlink your only authentication method. Please enable a password or connect another provider first.'
      });
    }

    await OAuthAccount.deleteOne({ _id: targetAccount._id });
    await logAuditEvent(req, 'oauth_account_unlinked', { provider, providerAccountId: targetAccount.providerAccountId }, userId);

    return res.json({ message: `${provider} account unlinked successfully.` });
  } catch (err) {
    console.error('Unlink provider error:', err);
    return res.status(500).json({ message: 'Failed to unlink OAuth provider.' });
  }
});

module.exports = router;
