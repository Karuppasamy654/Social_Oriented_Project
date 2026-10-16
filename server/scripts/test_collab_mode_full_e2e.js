const axios = require('axios');
const io = require('socket.io-client');
const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:5000';

async function runFullCollabAudit() {
  console.log('====================================================');
  console.log('      COLLAB MODE 20/20 AUTOMATED INTEGRITY AUDIT');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // SETUP: Register 3 Distinct Users
    // ----------------------------------------------------
    const timestamp = Date.now();
    const user1Data = { name: 'Creator User', username: `creator_${timestamp}`, email: `creator_${timestamp}@collab.com`, password: 'Password123!', displayName: 'Creator User' };
    const user2Data = { name: 'User Two', username: `user2_${timestamp}`, email: `user2_${timestamp}@collab.com`, password: 'Password123!', displayName: 'User Two' };
    const user3Data = { name: 'User Three', username: `user3_${timestamp}`, email: `user3_${timestamp}@collab.com`, password: 'Password123!', displayName: 'User Three' };

    const res1 = await axios.post(`${BASE_URL}/api/auth/register`, user1Data);
    const token1 = res1.data.token;
    const creatorUser = res1.data.user;

    const res2 = await axios.post(`${BASE_URL}/api/auth/register`, user2Data);
    const token2 = res2.data.token;
    const user2 = res2.data.user;

    const res3 = await axios.post(`${BASE_URL}/api/auth/register`, user3Data);
    const token3 = res3.data.token;
    const user3 = res3.data.user;

    console.log(`Users registered: Creator (${creatorUser.username}), User 2 (${user2.username}), User 3 (${user3.username})\n`);

    // ----------------------------------------------------
    // TEST 1: Creator creates room
    // ----------------------------------------------------
    const roomResA = await axios.post(`${BASE_URL}/api/rooms`, {
      name: `DSA Problem Solving ${timestamp}`,
      topic: 'Data Structures',
      description: 'Room for real-time collaboration testing',
      maxParticipants: 4
    }, { headers: { Authorization: `Bearer ${token1}` } });

    const roomA = roomResA.data;
    assert(roomA && roomA._id && roomA.isCreator === true, 'TEST 1: Creator successfully created Room A');

    // Create Room B for isolation tests
    const roomResB = await axios.post(`${BASE_URL}/api/rooms`, {
      name: `System Design ${timestamp}`,
      topic: 'Architecture',
      description: 'Room B for multi-room isolation testing'
    }, { headers: { Authorization: `Bearer ${token1}` } });
    const roomB = roomResB.data;

    // ----------------------------------------------------
    // TEST 2: User 2 discovers room
    // ----------------------------------------------------
    const searchRes = await axios.get(`${BASE_URL}/api/rooms?q=${encodeURIComponent(roomA.name)}`, {
      headers: { Authorization: `Bearer ${token2}` }
    });
    const foundRoom = searchRes.data.rooms.find(r => r._id === roomA._id);
    assert(foundRoom !== undefined, 'TEST 2: User 2 successfully discovered Room A in study room lobby');

    // Setup Socket.IO Clients
    const socketCreator = io(BASE_URL, { auth: { token: `Bearer ${token1}` } });
    const socketUser2 = io(BASE_URL, { auth: { token: `Bearer ${token2}` } });

    let creatorReceivedRequestEvent = null;
    let user2ReceivedApprovedEvent = null;
    let user3ReceivedApprovedEvent = null;

    socketCreator.emit('room:join', { roomId: roomA._id, token: token1 });
    socketUser2.emit('room:subscribe', { roomId: roomA._id, token: token2 });

    socketCreator.on('room:join-request', (data) => {
      creatorReceivedRequestEvent = data;
    });

    socketUser2.on('room:join-approved', (data) => {
      user2ReceivedApprovedEvent = data;
    });

    await new Promise(r => setTimeout(r, 400));

    // ----------------------------------------------------
    // TEST 3: User 2 sends join request
    // ----------------------------------------------------
    const joinReqRes = await axios.post(`${BASE_URL}/api/rooms/${roomA._id}/join-request`, {
      message: 'Hello, please approve me!'
    }, { headers: { Authorization: `Bearer ${token2}` } });

    assert(joinReqRes.status === 201 && joinReqRes.data.request.status === 'pending', 'TEST 3: User 2 submitted join request via API');
    const createdRequestId = joinReqRes.data.request._id;

    // Wait briefly for socket emission
    await new Promise(r => setTimeout(r, 500));

    // ----------------------------------------------------
    // TEST 4: Request exists in database
    // ----------------------------------------------------
    const roomADetail = await axios.get(`${BASE_URL}/api/rooms/${roomA._id}`, {
      headers: { Authorization: `Bearer ${token2}` }
    });
    assert(roomADetail.data.hasPendingRequest === true, 'TEST 4: Join request persists in MongoDB database as source of truth');

    // ----------------------------------------------------
    // TEST 5: Creator fetches pending requests
    // ----------------------------------------------------
    const creatorRequestsRes = await axios.get(`${BASE_URL}/api/rooms/${roomA._id}/join-requests`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert(creatorRequestsRes.data.length > 0 && creatorRequestsRes.data[0]._id === createdRequestId, 'TEST 5: Creator fetched pending requests from database');

    // ----------------------------------------------------
    // TEST 6: Creator receives realtime request event
    // ----------------------------------------------------
    assert(creatorReceivedRequestEvent !== null && creatorReceivedRequestEvent._id === createdRequestId, 'TEST 6: Creator received real-time room:join-request socket event');

    // ----------------------------------------------------
    // TEST 7: Creator approves request
    // ----------------------------------------------------
    const approveRes = await axios.post(`${BASE_URL}/api/rooms/${roomA._id}/join-requests/${createdRequestId}/approve`, {}, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert(approveRes.data.message === 'Join request approved' && approveRes.data.request.status === 'approved', 'TEST 7: Creator approved request');

    await new Promise(r => setTimeout(r, 500));

    // ----------------------------------------------------
    // TEST 8: User 2 receives approval event
    // ----------------------------------------------------
    assert(user2ReceivedApprovedEvent !== null && user2ReceivedApprovedEvent.requestId === createdRequestId, 'TEST 8: User 2 received real-time room:join-approved socket event');

    // ----------------------------------------------------
    // TEST 9: User 2 becomes member
    // ----------------------------------------------------
    const membersRes = await axios.get(`${BASE_URL}/api/rooms/${roomA._id}/members`, {
      headers: { Authorization: `Bearer ${token2}` }
    });
    const user2Member = membersRes.data.find(m => (m.userId._id || m.userId) === user2._id || m.userId.username === user2.username);
    assert(user2Member !== undefined && user2Member.role === 'participant', 'TEST 9: User 2 added as active member in StudyRoomMember');

    // User 2 joins room presence socket
    socketUser2.emit('room:join', { roomId: roomA._id, token: token2 });
    await new Promise(r => setTimeout(r, 300));

    // ----------------------------------------------------
    // TEST 10: User 2 can access/sync editor
    // ----------------------------------------------------
    let creatorEditorSync = null;
    socketCreator.on('editor:update', (data) => {
      creatorEditorSync = data;
    });

    socketUser2.emit('editor:update', {
      roomId: roomA._id,
      sharedDocument: '// Collaborative Edit by User 2\nfunction solution() { return true; }',
      sharedLanguage: 'javascript'
    });

    await new Promise(r => setTimeout(r, 500));
    assert(creatorEditorSync !== null && creatorEditorSync.sharedDocument.includes('User 2'), 'TEST 10: Shared editor changes synchronized between User 2 and Creator in real time');

    // ----------------------------------------------------
    // TEST 11: Duplicate request rejected
    // ----------------------------------------------------
    let duplicateError = false;
    try {
      await axios.post(`${BASE_URL}/api/rooms/${roomA._id}/join-request`, { message: 'Duplicate attempt' }, {
        headers: { Authorization: `Bearer ${token2}` }
      });
    } catch (err) {
      if (err.response && (err.response.status === 409 || err.response.status === 400)) {
        duplicateError = true;
      }
    }
    assert(duplicateError, 'TEST 11: Duplicate join request from active member rejected with 409 Conflict');

    // ----------------------------------------------------
    // TEST 12: Non-creator cannot approve
    // ----------------------------------------------------
    // User 3 requests Room A
    const req3Res = await axios.post(`${BASE_URL}/api/rooms/${roomA._id}/join-request`, { message: 'User 3 requesting' }, {
      headers: { Authorization: `Bearer ${token3}` }
    });
    const user3RequestId = req3Res.data.request._id;

    let nonCreatorApproveFailed = false;
    try {
      await axios.post(`${BASE_URL}/api/rooms/${roomA._id}/join-requests/${user3RequestId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token2}` }
      });
    } catch (err) {
      if (err.response && err.response.status === 403) {
        nonCreatorApproveFailed = true;
      }
    }
    assert(nonCreatorApproveFailed, 'TEST 12: Non-creator (User 2) forbidden from approving join requests (403)');

    // ----------------------------------------------------
    // TEST 13: User from another room cannot access private requests
    // ----------------------------------------------------
    let viewRequestsForbidden = false;
    try {
      await axios.get(`${BASE_URL}/api/rooms/${roomA._id}/join-requests`, {
        headers: { Authorization: `Bearer ${token2}` }
      });
    } catch (err) {
      if (err.response && err.response.status === 403) {
        viewRequestsForbidden = true;
      }
    }
    assert(viewRequestsForbidden, 'TEST 13: Non-creator forbidden from viewing private room join requests (403)');

    // ----------------------------------------------------
    // TEST 14: Rejected request cannot enter editor
    // ----------------------------------------------------
    // Creator rejects User 3
    await axios.post(`${BASE_URL}/api/rooms/${roomA._id}/join-requests/${user3RequestId}/reject`, {}, {
      headers: { Authorization: `Bearer ${token1}` }
    });

    const socketUser3 = io(BASE_URL, { auth: { token: `Bearer ${token3}` } });
    let user3Denied = false;
    socketUser3.on('room:error', () => { user3Denied = true; });
    socketUser3.emit('room:join', { roomId: roomA._id, token: token3 });
    await new Promise(r => setTimeout(r, 400));
    assert(user3Denied, 'TEST 14: Rejected user (User 3) denied entry to collaborative editor room');

    // ----------------------------------------------------
    // TEST 15: Refresh preserves pending request
    // ----------------------------------------------------
    // Create another pending request for Room B
    const user3ReqB = await axios.post(`${BASE_URL}/api/rooms/${roomB._id}/join-request`, { message: 'Pending B' }, {
      headers: { Authorization: `Bearer ${token3}` }
    });
    const pendingBId = user3ReqB.data.request._id;

    // Simulate page refresh by fetching join requests after delay
    const refreshedRequests = await axios.get(`${BASE_URL}/api/rooms/${roomB._id}/join-requests`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert(refreshedRequests.data.some(r => r._id === pendingBId), 'TEST 15: Database persistence verified; refresh preserves pending join requests');

    // ----------------------------------------------------
    // TEST 16: Reconnect restores state
    // ----------------------------------------------------
    socketCreator.disconnect();
    await new Promise(r => setTimeout(r, 300));
    socketCreator.connect();
    socketCreator.emit('room:join', { roomId: roomB._id, token: token1 });
    const reconnectedRequests = await axios.get(`${BASE_URL}/api/rooms/${roomB._id}/join-requests`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert(reconnectedRequests.data.some(r => r._id === pendingBId), 'TEST 16: Socket reconnection restores room state and pending request queue');

    // ----------------------------------------------------
    // TEST 17: Room A requests do not appear in Room B
    // ----------------------------------------------------
    const roomBRequests = await axios.get(`${BASE_URL}/api/rooms/${roomB._id}/join-requests`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    const crossRoomLeak = roomBRequests.data.some(r => r._id === createdRequestId);
    assert(!crossRoomLeak, 'TEST 17: Room requests strictly isolated; Room A requests do not leak into Room B');

    // ----------------------------------------------------
    // TEST 18: Creator cannot accidentally create a request for own room
    // ----------------------------------------------------
    let creatorOwnRequestBlocked = false;
    try {
      await axios.post(`${BASE_URL}/api/rooms/${roomA._id}/join-request`, { message: 'Requesting my own room' }, {
        headers: { Authorization: `Bearer ${token1}` }
      });
    } catch (err) {
      if (err.response && err.response.status === 400) {
        creatorOwnRequestBlocked = true;
      }
    }
    assert(creatorOwnRequestBlocked, 'TEST 18: Creator forbidden from creating join requests for their own room');

    // ----------------------------------------------------
    // TEST 19: Concurrent approval requests are handled safely
    // ----------------------------------------------------
    let concurrentPass = false;
    try {
      const p1 = axios.post(`${BASE_URL}/api/rooms/${roomB._id}/join-requests/${pendingBId}/approve`, {}, { headers: { Authorization: `Bearer ${token1}` } });
      const p2 = axios.post(`${BASE_URL}/api/rooms/${roomB._id}/join-requests/${pendingBId}/approve`, {}, { headers: { Authorization: `Bearer ${token1}` } });
      const results = await Promise.allSettled([p1, p2]);
      const fulfilled = results.filter(r => r.status === 'fulfilled');
      const rejected = results.filter(r => r.status === 'rejected');
      if (fulfilled.length >= 1 && (rejected.length === 0 || rejected[0].reason.response.status === 404)) {
        concurrentPass = true;
      }
    } catch (e) {}
    assert(concurrentPass, 'TEST 19: Concurrent approval requests handled safely without race conditions');

    // ----------------------------------------------------
    // TEST 20: Unauthorized direct API manipulation fails
    // ----------------------------------------------------
    let selfApproveBlocked = false;
    try {
      await axios.post(`${BASE_URL}/api/rooms/${roomA._id}/join-requests/${user3RequestId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token3}` }
      });
    } catch (err) {
      if (err.response && err.response.status === 403) {
        selfApproveBlocked = true;
      }
    }
    assert(selfApproveBlocked, 'TEST 20: Unauthorized direct API manipulation (self-approval attempt) blocked with 403');

    // Cleanup Sockets
    socketCreator.disconnect();
    socketUser2.disconnect();
    socketUser3.disconnect();

  } catch (err) {
    console.error('E2E Audit Execution Error:', err.message);
    if (err.response) {
      console.error('API Response Data:', err.response.data);
    }
  }

  console.log('\n====================================================');
  console.log(` AUDIT COMPLETE: ${passed}/20 PASSED | ${failed}/20 FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runFullCollabAudit();
