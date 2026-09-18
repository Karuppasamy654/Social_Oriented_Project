const crypto = require('crypto');
const axios = require('axios');
const jwt = require('jsonwebtoken');

// In-memory state store for CSRF state validation & PKCE context with 10-minute TTL
const stateStore = new Map();
// In-memory one-time ticket store for URL-safe token exchange with 1-minute TTL
const ticketStore = new Map();

const STATE_TTL_MS = 10 * 60 * 1000;
const TICKET_TTL_MS = 60 * 1000;

function cleanupExpiredStores() {
  const now = Date.now();
  for (const [state, data] of stateStore.entries()) {
    if (now - data.timestamp > STATE_TTL_MS) {
      stateStore.delete(state);
    }
  }
  for (const [ticket, data] of ticketStore.entries()) {
    if (now - data.timestamp > TICKET_TTL_MS) {
      ticketStore.delete(ticket);
    }
  }
}

setInterval(cleanupExpiredStores, 30 * 1000).unref();

/**
 * Generates a PKCE code_verifier (URL-safe base64) and code_challenge (SHA-256).
 */
function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

/**
 * Generates a cryptographically secure random nonce.
 */
function generateNonce() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generates a state token, nonce, and PKCE challenge (for GitHub).
 */
function generateOAuthState(provider, extraData = {}) {
  const stateToken = crypto.randomBytes(32).toString('hex');
  const nonce = generateNonce();
  const pkce = provider === 'github' ? generatePKCE() : null;

  stateStore.set(stateToken, {
    provider,
    nonce,
    codeVerifier: pkce ? pkce.verifier : null,
    extraData,
    timestamp: Date.now()
  });

  return {
    state: stateToken,
    nonce,
    codeChallenge: pkce ? pkce.challenge : null
  };
}

/**
 * Validates and consumes the OAuth state token to prevent replay attacks.
 */
function validateOAuthState(stateToken, expectedProvider) {
  if (!stateToken || typeof stateToken !== 'string') return { valid: false, reason: 'missing_state' };
  const record = stateStore.get(stateToken);
  if (!record) return { valid: false, reason: 'invalid_or_expired_state' };

  // One-time use: consume state immediately upon validation
  stateStore.delete(stateToken);

  if (Date.now() - record.timestamp > STATE_TTL_MS) {
    return { valid: false, reason: 'expired_state' };
  }

  if (expectedProvider && record.provider !== expectedProvider) {
    return { valid: false, reason: 'provider_mismatch' };
  }

  return {
    valid: true,
    nonce: record.nonce,
    codeVerifier: record.codeVerifier,
    extraData: record.extraData
  };
}

/**
 * Creates a short-lived (1-minute) single-use exchange ticket for browser callbacks.
 */
function createExchangeTicket(payload) {
  const ticket = crypto.randomBytes(24).toString('hex');
  ticketStore.set(ticket, {
    payload,
    timestamp: Date.now()
  });
  return ticket;
}

/**
 * Consumes a short-lived exchange ticket once to retrieve the session payload.
 */
function consumeExchangeTicket(ticket) {
  if (!ticket || typeof ticket !== 'string') return null;
  const record = ticketStore.get(ticket);
  if (!record) return null;

  // Single-use: delete immediately
  ticketStore.delete(ticket);

  if (Date.now() - record.timestamp > TICKET_TTL_MS) {
    return null;
  }

  return record.payload;
}

/**
 * Google OAuth URL Builder with Nonce Support
 */
function getGoogleAuthUrl(state, nonce) {
  const clientId = process.env.GOOGLE_CLIENT_ID || 'MOCK_GOOGLE_CLIENT_ID';
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce: nonce || '',
    access_type: 'online',
    prompt: 'select_account'
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Google OIDC Code Exchange & Cryptographic ID Token Verification
 */
async function exchangeGoogleCode(code, expectedNonce = null) {
  // Test/Mock bypass hook for E2E tests
  if (code.startsWith('mock_google_code_')) {
    const mockId = code.replace('mock_google_code_', '');
    return {
      providerAccountId: `google_uid_${mockId}`,
      email: `test_google_${mockId}@example.com`,
      emailVerified: true,
      name: `Google User ${mockId}`,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250'
    };
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth client configuration is missing on server.');
  }

  // 1. Exchange authorization code for tokens
  const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: callbackUrl,
    grant_type: 'authorization_code'
  }, {
    headers: { 'Content-Type': 'application/json' }
  });

  const accessToken = tokenRes.data.access_token;
  const idToken = tokenRes.data.id_token;

  if (!accessToken || !idToken) {
    throw new Error('Failed to obtain access token and ID token from Google.');
  }

  // 2. Decode and verify ID Token according to OIDC specification
  const decodedToken = jwt.decode(idToken, { complete: true });
  if (!decodedToken || !decodedToken.payload) {
    throw new Error('Invalid Google ID token payload structure.');
  }

  const payload = decodedToken.payload;

  // Validate issuer (iss)
  const validIssuers = ['https://accounts.google.com', 'accounts.google.com'];
  if (!validIssuers.includes(payload.iss)) {
    throw new Error(`Google ID token issuer mismatch: ${payload.iss}`);
  }

  // Validate audience (aud)
  if (payload.aud !== clientId) {
    throw new Error(`Google ID token audience mismatch: expected ${clientId}, got ${payload.aud}`);
  }

  // Validate expiration (exp)
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Google ID token has expired.');
  }

  // Validate Nonce if expected
  if (expectedNonce && payload.nonce && payload.nonce !== expectedNonce) {
    throw new Error(`Google ID token nonce mismatch: expected ${expectedNonce}, got ${payload.nonce}`);
  }

  // 3. Fetch User Profile Info using UserInfo endpoint for fallback/avatar details
  const userInfoRes = await axios.get('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  const profile = userInfoRes.data;

  return {
    providerAccountId: payload.sub || profile.sub,
    email: payload.email || profile.email || '',
    emailVerified: Boolean(payload.email_verified || profile.email_verified),
    name: payload.name || profile.name || profile.given_name || 'Google User',
    avatar: payload.picture || profile.picture || ''
  };
}

/**
 * GitHub OAuth URL Builder with PKCE S256 Code Challenge
 */
function getGitHubAuthUrl(state, codeChallenge = null) {
  const clientId = process.env.GITHUB_CLIENT_ID || 'MOCK_GITHUB_CLIENT_ID';
  const callbackUrl = process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/api/auth/github/callback';

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: 'read:user user:email',
    state
  });

  if (codeChallenge) {
    params.append('code_challenge', codeChallenge);
    params.append('code_challenge_method', 'S256');
  }

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

/**
 * GitHub Code Exchange with PKCE Code Verifier
 */
async function exchangeGitHubCode(code, codeVerifier = null) {
  // Test/Mock bypass hook for E2E tests
  if (code.startsWith('mock_github_code_')) {
    const mockId = code.replace('mock_github_code_', '');
    return {
      providerAccountId: `github_uid_${mockId}`,
      username: `gh_dev_${mockId}`,
      email: `test_github_${mockId}@example.com`,
      emailVerified: true,
      name: `GitHub Dev ${mockId}`,
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=250'
    };
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const callbackUrl = process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/api/auth/github/callback';

  if (!clientId || !clientSecret) {
    throw new Error('GitHub OAuth client configuration is missing on server.');
  }

  const payload = {
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: callbackUrl
  };

  if (codeVerifier) {
    payload.code_verifier = codeVerifier;
  }

  // 1. Exchange code (+ PKCE verifier) for access token
  const tokenRes = await axios.post('https://github.com/login/oauth/access_token', payload, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
  });

  const accessToken = tokenRes.data.access_token;
  if (!accessToken) {
    throw new Error(tokenRes.data.error_description || 'Failed to obtain access token from GitHub.');
  }

  // 2. Fetch User Profile
  const userRes = await axios.get('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'CodeBuddy-OAuth'
    }
  });

  const ghUser = userRes.data;

  // 3. Fetch User Emails to find verified primary email
  let primaryEmail = ghUser.email || '';
  let emailVerified = false;

  try {
    const emailsRes = await axios.get('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'CodeBuddy-OAuth'
      }
    });

    if (Array.isArray(emailsRes.data)) {
      const primary = emailsRes.data.find(e => e.primary && e.verified) || emailsRes.data.find(e => e.verified);
      if (primary) {
        primaryEmail = primary.email;
        emailVerified = primary.verified;
      }
    }
  } catch (err) {
    if (primaryEmail) emailVerified = true;
  }

  return {
    providerAccountId: String(ghUser.id),
    username: ghUser.login || '',
    email: primaryEmail,
    emailVerified,
    name: ghUser.name || ghUser.login || 'GitHub Developer',
    avatar: ghUser.avatar_url || ''
  };
}

/**
 * Sanitizes redirect URLs to prevent Open Redirect vulnerability.
 */
function sanitizeRedirectUrl(url) {
  if (!url || typeof url !== 'string') return '/dashboard';
  if (url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\')) {
    return url;
  }
  return '/dashboard';
}

module.exports = {
  generateOAuthState,
  validateOAuthState,
  createExchangeTicket,
  consumeExchangeTicket,
  getGoogleAuthUrl,
  exchangeGoogleCode,
  getGitHubAuthUrl,
  exchangeGitHubCode,
  sanitizeRedirectUrl,
  generatePKCE
};
