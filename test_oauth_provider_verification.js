const axios = require('./server/node_modules/axios');
const mongoose = require('./server/node_modules/mongoose');

const API_BASE = process.env.API_BASE_URL || 'http://127.0.0.1:5000/api';
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/codebuddy';

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASSED: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAILED: ${message}`);
    failedTests++;
  }
}

async function runProviderVerificationTests() {
  console.log('================================================================');
  console.log('🔐 OAUTH PROVIDER & OIDC CRYPTOGRAPHIC VERIFICATION TEST');
  console.log('================================================================\n');

  // 1. Google OIDC Nonce & State Generation Test
  console.log('1️⃣ Testing Google OIDC Nonce Generation & URL Binding...');
  try {
    const res = await axios.get(`${API_BASE}/auth/google?format=json`);
    assert(res.data && res.data.state && res.data.nonce, 'Generated state and cryptographic nonce for Google OIDC flow');
    assert(res.data.url.includes('nonce='), 'Google Authorization URL includes OIDC nonce parameter');
  } catch (err) {
    assert(false, `Google OIDC init failed: ${err.message}`);
  }

  // 2. Database Unique Index Audit
  console.log('\n2️⃣ Testing Database-Level Compound Unique Index on OAuthAccount...');
  try {
    const OAuthAccount = require('./server/models/OAuthAccount');
    const schemaIndexes = OAuthAccount.schema.indexes();
    const hasSchemaIndex = schemaIndexes.some(([indexFields, options]) => 
      indexFields.provider === 1 && indexFields.providerAccountId === 1 && options.unique === true
    );
    assert(hasSchemaIndex, 'Compound unique index on (provider, providerAccountId) defined in OAuthAccount schema');
  } catch (err) {
    assert(false, `Database index audit failed: ${err.message}`);
  }


  // 3. Ticket Exchange Route & Security Test
  console.log('\n3️⃣ Testing One-Time Exchange Ticket Security (Preventing JWT Leaks in URLs)...');
  try {
    // Generate valid state & callback
    const initRes = await axios.get(`${API_BASE}/auth/google?format=json`);
    const state = initRes.data.state;

    // Simulate browser GET request (with Accept: text/html header) to trigger ticket redirect
    const callbackRes = await axios.get(`${API_BASE}/auth/google/callback?code=mock_google_code_ticket_test&state=${state}`, {
      headers: { Accept: 'text/html' },
      maxRedirects: 0,
      validateStatus: status => status >= 200 && status < 400
    });


    assert(callbackRes.status === 302, 'Browser callback redirects with HTTP 302');
    const redirectUrl = callbackRes.headers.location;
    assert(redirectUrl.includes('ticket='), 'Redirect URL contains one-time exchange ticket parameter');
    assert(!redirectUrl.includes('token='), 'Redirect URL NEVER contains raw JWT session token');

    // Parse ticket
    const ticket = new URL(redirectUrl, 'http://localhost:5000').searchParams.get('ticket');

    // Exchange ticket for token
    const exchangeRes = await axios.post(`${API_BASE}/auth/exchange`, { ticket });
    assert(exchangeRes.data.token && exchangeRes.data.user, 'One-time ticket successfully exchanged for session payload');

    // Try to reuse same ticket
    try {
      await axios.post(`${API_BASE}/auth/exchange`, { ticket });
      assert(false, 'Reusing exchange ticket should be rejected');
    } catch (err) {
      assert(err.response?.status === 400, 'Reused exchange ticket rejected with HTTP 400 (single-use guarantee)');
    }
  } catch (err) {
    assert(false, `Ticket exchange test failed: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log(`🎉 PROVIDER VERIFICATION SUITE COMPLETE: ${passedTests} Passed, ${failedTests} Failed.`);
  console.log('================================================================\n');

  if (failedTests > 0) process.exit(1);
}

runProviderVerificationTests();
