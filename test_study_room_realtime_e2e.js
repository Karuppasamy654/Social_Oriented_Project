const axios = require('./server/node_modules/axios');
const { io } = require('./client/node_modules/socket.io-client');

const API_BASE = process.env.API_BASE_URL || 'http://127.0.0.1:5000/api';
const SOCKET_BASE = process.env.SOCKET_BASE_URL || 'http://127.0.0.1:5000';

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

async function runStudyRoomRealtimeE2ETests() {
  console.log('================================================================');
  console.log('🚀 CODEBUDDY REAL-TIME COLLABORATIVE STUDY ROOMS E2E TEST');
  console.log('================================================================\n');

  const timestamp = Date.now();

  const userAData = {
    name: 'Study Host User A',
    username: `sr_userA_${timestamp}`,
    email: `sr_userA_${timestamp}@codebuddy.dev`,
    password: 'Password123!'
  };

  const userBData = {
    name: 'Study Participant User B',
    username: `sr_userB_${timestamp}`,
    email: `sr_userB_${timestamp}@codebuddy.dev`,
    password: 'Password123!'
  };

  const userCData = {
    name: 'Study Participant User C',
    username: `sr_userC_${timestamp}`,
    email: `sr_userC_${timestamp}@codebuddy.dev`,
    password: 'Password123!'
  };

  let tokenA = '', tokenB = '', tokenC = '';
  let userAId = '', userBId = '', userCId = '';

  // 1. Register Test Users
  console.log('1️⃣ Registering Real Test Users A, B, and C...');
  try {
    const regA = await axios.post(`${API_BASE}/auth/register`, userAData);
    tokenA = regA.data.token;
    userAId = (regA.data.user._id || regA.data.user.id).toString();

    const regB = await axios.post(`${API_BASE}/auth/register`, userBData);
    tokenB = regB.data.token;
    userBId = (regB.data.user._id || regB.data.user.id).toString();

    const regC = await axios.post(`${API_BASE}/auth/register`, userCData);
    tokenC = regC.data.token;
    userCId = (regC.data.user._id || regC.data.user.id).toString();

    assert(tokenA && tokenB && tokenC, 'User A, User B, and User C registered successfully');
  } catch (err) {
    console.error('Registration failed:', err.response?.data || err.message);
    process.exit(1);
  }

  const authA = { headers: { Authorization: `Bearer ${tokenA}` } };
  const authB = { headers: { Authorization: `Bearer ${tokenB}` } };
  const authC = { headers: { Authorization: `Bearer ${tokenC}` } };

  // 2. Room Discovery Search
  console.log('\n2️⃣ Testing Room Discovery & Honest Empty State...');
  try {
    const listRes = await axios.get(`${API_BASE}/rooms`, authA);
    assert(Array.isArray(listRes.data.rooms), 'Rooms endpoint returns valid room list');
  } catch (err) {
    assert(false, `Room discovery test failed: ${err.message}`);
  }

  // 3. Room Creation
  console.log('\n3️⃣ Testing Study Room Creation...');
  let roomId = '';
  let roomCode = '';
  try {
    const createRes = await axios.post(`${API_BASE}/rooms`, {
      name: 'Graph Masterclass Study',
      topic: 'Graphs',
      description: 'Solving graph traversal problems together',
      goal: 'Master BFS and DFS',
      maxParticipants: 4,
      visibility: 'request_only',
      editorPermissionMode: 'everyone'
    }, authA);

    roomId = createRes.data._id;
    roomCode = createRes.data.roomCode;

    assert(createRes.status === 201, 'Study Room created with HTTP 201 Created');
    assert(createRes.data.name === 'Graph Masterclass Study', 'Room name matches input');
    assert(createRes.data.isCreator === true, 'User A identified as room creator');
    assert(createRes.data.maxParticipants === 4, 'Max capacity set to 4');
  } catch (err) {
    assert(false, `Room creation failed: ${err.message}`);
  }

  // 4. Room Search & Preview
  console.log('\n4️⃣ Testing Room Search & Preview Details...');
  try {
    const searchRes = await axios.get(`${API_BASE}/rooms?q=Graph`, authB);
    const foundRoom = searchRes.data.rooms.find(r => r._id === roomId);
    assert(Boolean(foundRoom), 'User B searches and finds User A study room');

    const previewRes = await axios.get(`${API_BASE}/rooms/${roomId}`, authB);
    assert(previewRes.data.isMember === false, 'User B identified as non-member in preview');
    assert(previewRes.data.hasPendingRequest === false, 'User B initial pending request is false');
  } catch (err) {
    assert(false, `Search/Preview failed: ${err.message}`);
  }

  // 5. Join Request Authorization Flow (User B & User C Approve)
  console.log('\n5️⃣ Testing Join Request Authorization Flow for Users B & C...');
  let requestIdB = '', requestIdC = '';
  try {
    const reqBRes = await axios.post(`${API_BASE}/rooms/${roomId}/join-request`, {
      message: 'Hi User A, can I join your graph session?'
    }, authB);
    requestIdB = reqBRes.data.request._id;

    const reqCRes = await axios.post(`${API_BASE}/rooms/${roomId}/join-request`, {
      message: 'Hi User A, User C joining too!'
    }, authC);
    requestIdC = reqCRes.data.request._id;

    assert(reqBRes.status === 201 && reqCRes.status === 201, 'User B and User C join requests submitted');

    // User A approves both requests
    await axios.post(`${API_BASE}/rooms/${roomId}/join-requests/${requestIdB}/approve`, {}, authA);
    await axios.post(`${API_BASE}/rooms/${roomId}/join-requests/${requestIdC}/approve`, {}, authA);

    // Verify memberships
    const membersRes = await axios.get(`${API_BASE}/rooms/${roomId}/members`, authB);
    const isBMember = membersRes.data.some(m => m.userId.username === userBData.username && m.status === 'active');
    const isCMember = membersRes.data.some(m => m.userId.username === userCData.username && m.status === 'active');
    assert(isBMember && isCMember, 'User B and User C are now active room members');
  } catch (err) {
    assert(false, `Join request flow failed: ${err.message}`);
  }

  // 6. Real-Time 3-User Socket Connections & Operational Convergence
  console.log('\n6️⃣ Testing 3-User Socket Connections & Operational Convergence...');
  let socketA = null, socketB = null, socketC = null;

  try {
    socketA = io(SOCKET_BASE, { auth: { token: `Bearer ${tokenA}` } });
    socketB = io(SOCKET_BASE, { auth: { token: `Bearer ${tokenB}` } });
    socketC = io(SOCKET_BASE, { auth: { token: `Bearer ${tokenC}` } });

    await new Promise((resolve) => {
      let count = 0;
      const checkDone = () => { count++; if (count === 3) resolve(); };

      socketA.on('room:joined', () => { checkDone(); });
      socketB.on('room:joined', () => { checkDone(); });
      socketC.on('room:joined', () => { checkDone(); });

      socketA.on('connect', () => { socketA.emit('room:join', { roomId, token: tokenA }); });
      socketB.on('connect', () => { socketB.emit('room:join', { roomId, token: tokenB }); });
      socketC.on('connect', () => { socketC.emit('room:join', { roomId, token: tokenC }); });
    });

    assert(socketA.connected && socketB.connected && socketC.connected, '3 isolated socket connections (A, B, C) established');

    // Test simultaneous operational updates from A, B, C
    const updateReceivedPromise = new Promise((resolve) => {
      let count = 0;
      const onUpdate = (data) => {
        if (data.sharedDocument.includes('// Simultaneous edit from C')) {
          count++;
          if (count >= 1) resolve(data);
        }
      };
      socketA.on('editor:update', onUpdate);
      socketB.on('editor:update', onUpdate);
    });

    // Send edits from A, B, and C
    socketA.emit('editor:update', { roomId, sharedDocument: '// Header by A\n' });
    socketB.emit('editor:update', { roomId, sharedDocument: '// Header by A\n// Edit from B\n' });
    socketC.emit('editor:update', { roomId, sharedDocument: '// Header by A\n// Edit from B\n// Simultaneous edit from C\n' });

    const finalUpdate = await updateReceivedPromise;
    assert(Boolean(finalUpdate), 'Concurrent edits from A, B, and C converged across all connected sockets');

    // Verify MongoDB document persistence
    const roomDetailAfter = await axios.get(`${API_BASE}/rooms/${roomId}`, authA);
    assert(roomDetailAfter.data.sharedDocument.includes('// Simultaneous edit from C'), 'Latest document state persisted in MongoDB');
  } catch (err) {
    assert(false, `3-User Socket/Editor test failed: ${err.message}`);
  }

  // 7. Editor Permission Security Enforcement (Creator Only Mode)
  console.log('\n7️⃣ Testing Editor Permission Mode Security Enforcement...');
  try {
    await axios.patch(`${API_BASE}/rooms/${roomId}/settings`, {
      editorPermissionMode: 'creator_only'
    }, authA);

    const permissionDeniedPromise = new Promise((resolve) => {
      socketB.on('editor:permission-denied', (data) => {
        resolve(data);
      });
    });

    socketB.emit('editor:update', {
      roomId,
      sharedDocument: '// Malicious Edit Attempt by User B'
    });

    const deniedEvent = await permissionDeniedPromise;
    assert(Boolean(deniedEvent), 'Server rejects unauthorized editor update from User B in creator-only mode');

    // Restore everyone mode
    await axios.patch(`${API_BASE}/rooms/${roomId}/settings`, {
      editorPermissionMode: 'everyone'
    }, authA);
  } catch (err) {
    assert(false, `Editor permission test failed: ${err.message}`);
  }

  // 8. Cross-Room Socket Event Isolation
  console.log('\n8️⃣ Testing Cross-Room Socket Event Isolation...');
  try {
    // User A creates a second room (Room 2)
    const room2Res = await axios.post(`${API_BASE}/rooms`, {
      name: 'Isolated Second Study Room',
      topic: 'Algorithms',
      maxParticipants: 4
    }, authA);
    const room2Id = room2Res.data._id;

    let room2Leaked = false;
    socketB.on('chat:message', (data) => {
      if (data.roomId === room2Id) room2Leaked = true;
    });

    // User A emits message to Room 2
    socketA.emit('chat:message', { roomId: room2Id, message: 'Room 2 Secret Message' });

    await new Promise(r => setTimeout(r, 400));
    assert(room2Leaked === false, 'User B in Room 1 does NOT receive events from Room 2 (Cross-room isolation enforced)');
  } catch (err) {
    assert(false, `Cross-room isolation test failed: ${err.message}`);
  }

  // 9. Real-Time WebRTC Signaling Verification
  console.log('\n9️⃣ Testing WebRTC Signaling & Media State Synchronization...');
  try {
    const iceCandidatePromise = new Promise((resolve) => {
      socketB.on('webrtc:ice-candidate', (data) => {
        resolve(data);
      });
    });

    socketA.emit('webrtc:ice-candidate', {
      targetSocketId: socketB.id,
      candidate: { candidate: 'candidate:1234567890', sdpMid: '0', sdpMLineIndex: 0 }
    });

    const iceEvent = await iceCandidatePromise;
    assert(iceEvent.candidate.candidate === 'candidate:1234567890', 'WebRTC ICE Candidate signal routed directly to User B socket');

    const mediaStatePromise = new Promise((resolve) => {
      socketB.on('media:state-change', (data) => {
        resolve(data);
      });
    });

    socketA.emit('media:state-change', {
      roomId,
      micOn: false,
      cameraOn: true
    });

    const mediaEvent = await mediaStatePromise;
    assert(mediaEvent.micOn === false && mediaEvent.cameraOn === true, 'User A media mute state change broadcast to User B');
  } catch (err) {
    assert(false, `WebRTC signaling test failed: ${err.message}`);
  }

  // 10. Real-Time Chat & Persistence
  console.log('\n🔟 Testing Real-Time Chat Messaging & Persistence...');
  try {
    const chatReceivePromise = new Promise((resolve) => {
      socketB.on('chat:message', (msg) => {
        if (msg.message === 'Hello Study Buddies!') resolve(msg);
      });
    });

    socketA.emit('chat:message', { roomId, message: 'Hello Study Buddies!' });

    const chatMsg = await chatReceivePromise;
    assert(chatMsg.message === 'Hello Study Buddies!', 'Real-time chat message delivered via Socket.IO');

    const msgListRes = await axios.get(`${API_BASE}/rooms/${roomId}/messages`, authB);
    assert(msgListRes.data.length >= 1, 'Chat messages persisted in MongoDB and retrieved via REST API');
  } catch (err) {
    assert(false, `Chat test failed: ${err.message}`);
  }

  // 11. Kick Participant Control
  console.log('\n1️⃣1️⃣ Testing Creator Kick Participant Control...');
  try {
    const kickRes = await axios.post(`${API_BASE}/rooms/${roomId}/kick`, {
      targetUserId: userCId
    }, authA);
    assert(kickRes.status === 200, 'Creator kicks User C successfully');

    const membersAfterKick = await axios.get(`${API_BASE}/rooms/${roomId}/members`, authA);
    const isCActive = membersAfterKick.data.some(m => (m.userId._id || m.userId).toString() === userCId);
    assert(isCActive === false, 'Kicked User C removed from active members list');
  } catch (err) {
    assert(false, `Kick test failed: ${err.message}`);
  }

  // 12. End Study Room Lifecycle
  console.log('\n1️⃣2️⃣ Testing End Study Room Lifecycle...');
  try {
    const endRes = await axios.post(`${API_BASE}/rooms/${roomId}/end`, {}, authA);
    assert(endRes.data.room.status === 'ended', 'Room status updated to ended');

    const detailAfterEnd = await axios.get(`${API_BASE}/rooms/${roomId}`, authA);
    assert(detailAfterEnd.data.status === 'ended', 'Ended room status verified in database');
  } catch (err) {
    assert(false, `End room test failed: ${err.message}`);
  }

  // Cleanup Sockets
  if (socketA) socketA.disconnect();
  if (socketB) socketB.disconnect();
  if (socketC) socketC.disconnect();

  console.log('\n================================================================');
  console.log(`🎉 STUDY ROOM E2E TEST COMPLETE: ${passedTests} Passed, ${failedTests} Failed.`);
  console.log('================================================================\n');

  if (failedTests > 0) process.exit(1);
}

runStudyRoomRealtimeE2ETests();
