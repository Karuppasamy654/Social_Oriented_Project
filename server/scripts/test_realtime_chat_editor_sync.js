const axios = require('../node_modules/axios');
const { io } = require('../../client/node_modules/socket.io-client');

const API_BASE = 'http://127.0.0.1:5000/api';
const SOCKET_BASE = 'http://127.0.0.1:5000';

async function verifySync() {
  console.log('🧪 VERIFYING REAL-TIME CHAT & EDITOR SYNC ACROSS MULTIPLE WINDOWS...');
  
  const ts = Date.now();
  const user1 = { name: 'User 1', username: `sync1_${ts}`, email: `sync1_${ts}@test.com`, password: 'Password123!' };
  const user2 = { name: 'User 2', username: `sync2_${ts}`, email: `sync2_${ts}@test.com`, password: 'Password123!' };

  // Register Users
  const reg1 = await axios.post(`${API_BASE}/auth/register`, user1);
  const reg2 = await axios.post(`${API_BASE}/auth/register`, user2);
  const token1 = reg1.data.token;
  const token2 = reg2.data.token;

  const auth1 = { headers: { Authorization: `Bearer ${token1}` } };
  const auth2 = { headers: { Authorization: `Bearer ${token2}` } };

  // Create Room
  const roomRes = await axios.post(`${API_BASE}/rooms`, {
    name: 'Sync Verification Room',
    topic: 'Testing',
    maxParticipants: 4
  }, auth1);
  const roomId = roomRes.data._id;

  // Join Request & Approval
  const reqRes = await axios.post(`${API_BASE}/rooms/${roomId}/join-request`, { message: 'Can I join?' }, auth2);
  await axios.post(`${API_BASE}/rooms/${roomId}/join-requests/${reqRes.data.request._id}/approve`, {}, auth1);

  // Connect Socket 1 and Socket 2
  const s1 = io(SOCKET_BASE, { auth: { token: `Bearer ${token1}` } });
  const s2 = io(SOCKET_BASE, { auth: { token: `Bearer ${token2}` } });

  await new Promise((res) => {
    let c = 0;
    s1.on('room:joined', () => { if (++c === 2) res(); });
    s2.on('room:joined', () => { if (++c === 2) res(); });
    s1.emit('room:join', { roomId, token: token1 });
    s2.emit('room:join', { roomId, token: token2 });
  });

  console.log('  ✅ Connected 2 concurrent clients to room.');

  // Test 1: Real-time Editor Sync (User 1 edits -> User 2 receives)
  const editorSyncPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Editor update timed out')), 3000);
    s2.on('editor:update', (data) => {
      if (data.sharedDocument.includes('// Hello from Window 1')) {
        clearTimeout(timeout);
        resolve(data);
      }
    });
  });

  s1.emit('editor:update', { roomId, sharedDocument: '// Hello from Window 1\nint main() { return 0; }' });
  const editorRecv = await editorSyncPromise;
  console.log('  ✅ Real-time Editor Sync: Window 2 received code edit from Window 1 instantly!');

  // Test 2: Real-time Chat Sync (User 2 sends msg -> User 1 receives)
  const chatSyncPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Chat message timed out')), 3000);
    s1.on('chat:message', (data) => {
      if (data.message === 'Hello from Window 2 chat!') {
        clearTimeout(timeout);
        resolve(data);
      }
    });
  });

  s2.emit('chat:message', { roomId, message: 'Hello from Window 2 chat!' });
  const chatRecv = await chatSyncPromise;
  console.log('  ✅ Real-time Chat Sync: Window 1 received chat message from Window 2 instantly!');

  s1.disconnect();
  s2.disconnect();
  console.log('🎉 ALL SYNC VERIFICATIONS PASSED SUCCESSFULLY!');
}

verifySync().catch(e => {
  console.error('❌ Sync test error:', e.message);
  process.exit(1);
});
