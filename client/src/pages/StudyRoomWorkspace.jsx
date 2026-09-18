import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Editor from '@monaco-editor/react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import MediaPrecheckModal from '../components/MediaPrecheckModal';
import { 
  Users, Video, VideoOff, Mic, MicOff, Send, Settings, LogOut, 
  UserPlus, CheckCircle2, XCircle, Code2, MessageSquare, ShieldCheck, 
  Share2, Lock, Unlock, Play, AlertCircle, Sparkles, BookOpen, Copy
} from 'lucide-react';

export default function StudyRoomWorkspace() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Room state
  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreator, setIsCreator] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Editor state
  const [sharedDocument, setSharedDocument] = useState('// Collaborative Study Scratchpad\n');
  const [sharedLanguage, setSharedLanguage] = useState('cpp17');
  const [editorPermissionMode, setEditorPermissionMode] = useState('everyone');
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Saved');

  // Chat & Presence state
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);
  const [typingUser, setTypingUser] = useState('');

  // Media state
  const [isPrecheckOpen, setIsPrecheckOpen] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);

  // Socket.IO & WebRTC refs
  const socketRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());

  useEffect(() => {
    fetchRoomDetails();
    return () => {
      cleanupMediaAndSocket();
    };
  }, [roomId]);

  const fetchRoomDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/rooms/${roomId}`);
      const r = res.data;
      setRoom(r);
      setIsCreator(r.isCreator);
      setIsMember(r.isMember);
      setHasPendingRequest(r.hasPendingRequest);
      setSharedDocument(r.sharedDocument || '// Collaborative Study Scratchpad\n');
      setSharedLanguage(r.sharedLanguage || 'cpp17');
      setEditorPermissionMode(r.editorPermissionMode || 'everyone');

      if (r.isMember || r.isCreator) {
        await initializeRoomSession(r);
      } else if (r.isCreator) {
        fetchJoinRequests(r._id);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error loading study room workspace:', err);
      setError(err.response?.data?.error || 'Failed to load study room');
      setLoading(false);
    }
  };

  const initializeRoomSession = async (currentRoom) => {
    // 1. Load active members
    try {
      const mRes = await api.get(`/rooms/${currentRoom._id}/members`);
      setMembers(mRes.data || []);
    } catch (e) {}

    // 2. Load chat messages
    try {
      const msgRes = await api.get(`/rooms/${currentRoom._id}/messages`);
      setMessages(msgRes.data || []);
    } catch (e) {}

    // 3. Load join requests if creator
    if (currentRoom.isCreator) {
      fetchJoinRequests(currentRoom._id);
    }

    // 4. Initialize Local Media Stream
    initLocalMedia();

    // 5. Connect Socket.IO
    connectSocket(currentRoom._id);
  };

  const fetchJoinRequests = async (rId) => {
    try {
      const reqRes = await api.get(`/rooms/${rId}/join-requests`);
      setJoinRequests(reqRes.data || []);
    } catch (e) {}
  };

  const initLocalMedia = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      }
    } catch (err) {
      console.warn('Media devices warning:', err.message);
      setCameraOn(false);
      setMicOn(false);
    }
  };

  const connectSocket = (rId) => {
    if (socketRef.current) return;

    const token = localStorage.getItem('token');
    const newSocket = io(window.location.origin, {
      auth: { token: token ? `Bearer ${token}` : '' }
    });
    socketRef.current = newSocket;

    newSocket.emit('room:join', { roomId: rId, token });

    newSocket.on('room:joined', (data) => {
      if (data.sharedDocument) setSharedDocument(data.sharedDocument);
      if (data.sharedLanguage) setSharedLanguage(data.sharedLanguage);
      if (data.editorPermissionMode) setEditorPermissionMode(data.editorPermissionMode);
      if (data.activeUsers) setActiveUsers(data.activeUsers);
    });

    newSocket.on('presence:update', (data) => {
      setActiveUsers(data.activeUsers || []);
    });

    newSocket.on('editor:update', (data) => {
      if (data.sharedDocument !== undefined) setSharedDocument(data.sharedDocument);
      if (data.sharedLanguage !== undefined) setSharedLanguage(data.sharedLanguage);
      setSaveStatus('Synced');
    });

    newSocket.on('editor:permission-changed', (data) => {
      setEditorPermissionMode(data.editorPermissionMode);
    });

    newSocket.on('editor:permission-denied', (data) => {
      setError(data.error);
      if (data.sharedDocument) setSharedDocument(data.sharedDocument);
    });

    newSocket.on('chat:message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    newSocket.on('chat:typing', (data) => {
      if (data.isTyping) setTypingUser(data.username);
      else setTypingUser('');
    });

    newSocket.on('room:ended', () => {
      setRoom(prev => prev ? { ...prev, status: 'ended' } : null);
    });
  };

  const cleanupMediaAndSocket = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.emit('room:leave', { roomId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  // ------------------------------------------------------------------
  // Actions: Join Request, Approvals, Editor, Settings, Controls
  // ------------------------------------------------------------------
  const handleSubmitJoinRequest = async (e) => {
    e.preventDefault();
    setRequestSubmitting(true);
    try {
      await api.post(`/rooms/${room._id}/join-request`, { message: requestMessage });
      setHasPendingRequest(true);
      setRequestSubmitting(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit request');
      setRequestSubmitting(false);
    }
  };

  const handleApproveRequest = async (reqId) => {
    try {
      await api.post(`/rooms/${room._id}/join-requests/${reqId}/approve`);
      setJoinRequests(prev => prev.filter(r => r._id !== reqId));
      fetchRoomDetails();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve request');
    }
  };

  const handleRejectRequest = async (reqId) => {
    try {
      await api.post(`/rooms/${room._id}/join-requests/${reqId}/reject`);
      setJoinRequests(prev => prev.filter(r => r._id !== reqId));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject request');
    }
  };

  const handleEditorChange = (value) => {
    const newDoc = value || '';
    setSharedDocument(newDoc);
    setSaveStatus('Saving...');

    if (socketRef.current && room) {
      socketRef.current.emit('editor:update', {
        roomId: room._id,
        sharedDocument: newDoc,
        sharedLanguage
      });
    }
  };

  const handleTogglePermissionMode = async () => {
    if (!isCreator || !room) return;
    const nextMode = editorPermissionMode === 'everyone' ? 'creator_only' : 'everyone';
    try {
      await api.patch(`/rooms/${room._id}/settings`, { editorPermissionMode: nextMode });
      setEditorPermissionMode(nextMode);

      if (socketRef.current) {
        socketRef.current.emit('editor:permission-change', {
          roomId: room._id,
          editorPermissionMode: nextMode
        });
      }
    } catch (err) {
      setError('Failed to update permission mode');
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socketRef.current || !room) return;

    socketRef.current.emit('chat:message', {
      roomId: room._id,
      message: chatInput
    });
    setChatInput('');
  };

  const handleToggleMic = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(t => { t.enabled = !micOn; });
      setMicOn(!micOn);
      if (socketRef.current && room) {
        socketRef.current.emit('media:state-change', { roomId: room._id, micOn: !micOn, cameraOn });
      }
    }
  };

  const handleToggleCamera = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(t => { t.enabled = !cameraOn; });
      setCameraOn(!cameraOn);
      if (socketRef.current && room) {
        socketRef.current.emit('media:state-change', { roomId: room._id, micOn, cameraOn: !cameraOn });
      }
    }
  };

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleLeaveRoom = async () => {
    try {
      await api.post(`/rooms/${room._id}/leave`);
      cleanupMediaAndSocket();
      navigate('/study');
    } catch (err) {
      navigate('/study');
    }
  };

  const handleKickParticipant = async (targetUserId) => {
    if (!isCreator || !room) return;
    try {
      await api.post(`/rooms/${room._id}/kick`, { targetUserId });
      setMembers(prev => prev.filter(m => (m.userId._id || m.userId).toString() !== targetUserId));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to kick participant');
    }
  };

  const handleEndRoom = async () => {
    if (!isCreator || !room) return;
    try {
      await api.post(`/rooms/${room._id}/end`);
      setRoom(prev => prev ? { ...prev, status: 'ended' } : null);
    } catch (err) {
      setError('Failed to end study room');
    }
  };

  // Determine Monaco read-only status based on permission mode
  const effectiveReadOnly = Boolean(editorPermissionMode === 'creator_only' && !isCreator);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-xs animate-pulse">
        Connecting to CodeBuddy Study Workspace...
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="min-h-screen max-w-lg mx-auto p-8 flex flex-col items-center justify-center text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <h2 className="text-xl font-bold text-white">Room Access Error</h2>
        <p className="text-xs text-gray-400">{error}</p>
        <button
          onClick={() => navigate('/study')}
          className="px-6 py-2 rounded-xl bg-surface-secondary text-white font-bold text-xs"
        >
          Back to Study Rooms
        </button>
      </div>
    );
  }

  // ROOM ENDED VIEW
  if (room && room.status === 'ended') {
    return (
      <div className="min-h-screen max-w-xl mx-auto p-8 flex flex-col items-center justify-center text-center space-y-6 animate-fadeIn">
        <div className="w-16 h-16 rounded-full bg-accent-purple/20 text-accent-purple flex items-center justify-center">
          <BookOpen className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-white">Study Room Session Ended</h2>
          <p className="text-xs text-gray-400">
            This room has been concluded by the creator. All participants have been disconnected.
          </p>
        </div>
        <button
          onClick={() => navigate('/study')}
          className="px-6 py-2.5 rounded-xl bg-accent-purple text-white font-bold text-xs shadow-glow-purple"
        >
          Return to Study Lobby
        </button>
      </div>
    );
  }

  // PREVIEW / JOIN REQUEST SCREEN (For Non-Members)
  if (room && !isMember && !isCreator) {
    return (
      <div className="min-h-screen max-w-2xl mx-auto p-6 flex flex-col justify-center space-y-6 animate-fadeIn">
        
        <div className="p-8 rounded-3xl bg-surface border border-surface-border space-y-6">
          <div className="flex items-center justify-between border-b border-surface-border pb-4">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-accent-purple/20 text-accent-purple border border-accent-purple/30">
              {room.topic}
            </span>
            <span className="text-xs text-accent-lime font-bold">
              {room.activeMembersCount} / {room.maxParticipants} Members
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-white">{room.name}</h1>
            {room.description && <p className="text-xs text-gray-300">{room.description}</p>}
            {room.goal && <p className="text-xs text-accent-cyan font-mono">Goal: {room.goal}</p>}
          </div>

          {/* Host Card */}
          <div className="flex items-center space-x-3 p-4 rounded-2xl bg-surface-secondary border border-surface-border">
            <img 
              src={room.creatorId?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'}
              alt={room.creatorId?.username}
              className="w-10 h-10 rounded-full object-cover border border-accent-purple/50"
            />
            <div className="text-xs">
              <p className="font-bold text-white">{room.creatorId?.displayName || room.creatorId?.username}</p>
              <p className="text-gray-400">Room Creator • @{room.creatorId?.username}</p>
            </div>
          </div>

          {hasPendingRequest ? (
            <div className="p-4 rounded-2xl bg-accent-purple/10 border border-accent-purple/30 text-accent-purple text-xs font-bold text-center space-y-1">
              <Clock className="w-5 h-5 mx-auto animate-spin" />
              <p>Join Request Pending Creator Approval</p>
              <p className="text-[11px] text-gray-400 font-normal">You will enter automatically once approved.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitJoinRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Introduction Message</label>
                <input
                  type="text"
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="e.g., Hi! May I join your study session on Graphs?"
                  className="w-full bg-surface-secondary border border-surface-border rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-accent-purple"
                />
              </div>
              <button
                type="submit"
                disabled={requestSubmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-accent-purple to-accent-blue text-white font-extrabold text-xs shadow-glow-purple disabled:opacity-50"
              >
                {requestSubmitting ? 'Submitting Request...' : 'Request to Join Room'}
              </button>
            </form>
          )}

        </div>

      </div>
    );
  }

  // LIVE ROOM WORKSPACE VIEW
  return (
    <div className="min-h-screen max-w-[1600px] mx-auto px-4 py-4 flex flex-col space-y-4 animate-fadeIn">
      
      {/* 1. Header Bar */}
      <div className="bg-surface border border-surface-border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-accent-purple/20 text-accent-purple border border-accent-purple/30">
            <Code2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-extrabold text-white">{room?.name}</h1>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-accent-purple/20 text-accent-purple border border-accent-purple/30">
                {room?.topic}
              </span>
            </div>
            {room?.goal && <p className="text-xs text-accent-cyan font-mono mt-0.5">Goal: {room.goal}</p>}
          </div>
        </div>

        {/* Right Header Buttons */}
        <div className="flex items-center space-x-2">
          
          <button
            onClick={handleCopyInviteLink}
            className="px-3 py-1.5 rounded-xl bg-surface-secondary border border-surface-border text-gray-300 hover:text-white font-bold text-xs flex items-center space-x-1.5"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copySuccess ? 'Copied Link!' : 'Invite'}</span>
          </button>

          {isCreator && (
            <button
              onClick={handleTogglePermissionMode}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 border transition-all ${
                editorPermissionMode === 'everyone'
                  ? 'bg-accent-lime/10 text-accent-lime border-accent-lime/30'
                  : 'bg-accent-orange/10 text-accent-orange border-accent-orange/30'
              }`}
            >
              {editorPermissionMode === 'everyone' ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{editorPermissionMode === 'everyone' ? 'Everyone Can Edit' : 'Creator Only Edit'}</span>
            </button>
          )}

          {isCreator && (
            <button
              onClick={handleEndRoom}
              className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 font-bold text-xs hover:bg-red-500/20"
            >
              End Room
            </button>
          )}

          <button
            onClick={handleLeaveRoom}
            className="px-3.5 py-1.5 rounded-xl bg-surface-secondary text-gray-300 hover:text-white font-bold text-xs flex items-center space-x-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Leave</span>
          </button>

        </div>

      </div>

      {/* 2. Main 3-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 h-[750px]">
        
        {/* LEFT COLUMN (4 cols): WebRTC Video Grid, Controls, & Participants */}
        <div className="lg:col-span-3 bg-surface border border-surface-border rounded-2xl p-4 flex flex-col justify-between space-y-4 overflow-hidden">
          
          <div className="space-y-3 overflow-y-auto flex-1">
            <div className="flex items-center justify-between border-b border-surface-border pb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Video className="w-4 h-4 text-accent-purple" />
                <span>Video & Audio</span>
              </h3>
              <span className="text-[10px] font-mono text-accent-lime">{activeUsers.length} Online</span>
            </div>

            {/* Video Tiles Grid */}
            <div className="grid grid-cols-1 gap-2.5">
              
              {/* Local User Video */}
              <div className="relative rounded-xl overflow-hidden bg-[#080C19] border border-accent-purple/40 h-36">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover ${cameraOn ? 'block' : 'hidden'}`}
                />
                {!cameraOn && (
                  <div className="w-full h-full flex items-center justify-center bg-surface-secondary text-gray-400 text-xs font-bold">
                    Camera Off
                  </div>
                )}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black/60 px-2 py-1 rounded-lg text-[10px] text-white">
                  <span className="font-semibold truncate">You ({user?.username})</span>
                  <div className="flex items-center space-x-1">
                    {!micOn && <MicOff className="w-3 h-3 text-red-400" />}
                    {!cameraOn && <VideoOff className="w-3 h-3 text-red-400" />}
                  </div>
                </div>
              </div>

              {/* Remote Users Tiles */}
              {activeUsers.filter(u => u.userId !== (user?._id || user?.id)).map((peer) => (
                <div key={peer.userId} className="relative rounded-xl overflow-hidden bg-surface-secondary border border-surface-border h-28 flex flex-col items-center justify-center p-3 text-xs">
                  <img 
                    src={peer.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'}
                    alt={peer.username}
                    className="w-10 h-10 rounded-full object-cover border border-accent-blue/50 mb-1"
                  />
                  <span className="font-bold text-white truncate max-w-[120px]">{peer.displayName || peer.username}</span>
                  
                  {isCreator && (
                    <button
                      onClick={() => handleKickParticipant(peer.userId)}
                      className="absolute top-1.5 right-1.5 text-[9px] text-red-400 hover:underline"
                    >
                      Kick
                    </button>
                  )}
                </div>
              ))}

            </div>

            {/* Join Requests Panel (Creator Only) */}
            {isCreator && joinRequests.length > 0 && (
              <div className="pt-3 border-t border-surface-border space-y-2">
                <h4 className="text-xs font-bold text-accent-purple uppercase tracking-wider">
                  Join Requests ({joinRequests.length})
                </h4>
                <div className="space-y-2">
                  {joinRequests.map(r => (
                    <div key={r._id} className="p-2.5 rounded-xl bg-surface-secondary border border-surface-border text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">@{r.requesterId?.username}</span>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleApproveRequest(r._id)}
                            className="p-1 rounded bg-accent-lime/20 text-accent-lime hover:bg-accent-lime/30"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRejectRequest(r._id)}
                            className="p-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {r.message && <p className="text-[10px] text-gray-400 italic">"{r.message}"</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Media Control Toolbar */}
          <div className="flex items-center justify-center space-x-2 pt-3 border-t border-surface-border">
            <button
              onClick={handleToggleMic}
              className={`p-2.5 rounded-xl transition-all ${micOn ? 'bg-surface-secondary text-white' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}
              title={micOn ? 'Mute Mic' : 'Unmute Mic'}
            >
              {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>

            <button
              onClick={handleToggleCamera}
              className={`p-2.5 rounded-xl transition-all ${cameraOn ? 'bg-surface-secondary text-white' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}
              title={cameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
            >
              {cameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setIsPrecheckOpen(true)}
              className="p-2.5 rounded-xl bg-surface-secondary text-gray-300 hover:text-white"
              title="Media Precheck"
            >
              <ShieldCheck className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* CENTER COLUMN (6 cols): Shared Collaborative Monaco Editor */}
        <div className="lg:col-span-6 bg-surface border border-surface-border rounded-2xl p-4 flex flex-col justify-between space-y-3">
          
          {/* Editor Header Bar */}
          <div className="flex items-center justify-between border-b border-surface-border pb-3 text-xs">
            <div className="flex items-center space-x-2">
              <Code2 className="w-4 h-4 text-accent-cyan" />
              <span className="font-bold text-white">Shared Workspace</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                editorPermissionMode === 'everyone' ? 'bg-accent-lime/20 text-accent-lime' : 'bg-accent-orange/20 text-accent-orange'
              }`}>
                {editorPermissionMode === 'everyone' ? 'Everyone Can Edit' : 'Creator Only Edit'}
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-[10px] text-gray-400 font-mono">{saveStatus}</span>
              <select
                value={sharedLanguage}
                onChange={(e) => setSharedLanguage(e.target.value)}
                className="bg-surface-secondary border border-surface-border rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none"
              >
                <option value="cpp17">C++17</option>
                <option value="python">Python 3</option>
                <option value="javascript">JavaScript</option>
              </select>
            </div>
          </div>

          {/* Monaco Editor Component */}
          <div className="flex-1 rounded-xl overflow-hidden border border-surface-border bg-[#080C19]">
            <Editor
              height="100%"
              language={sharedLanguage === 'cpp17' ? 'cpp' : sharedLanguage}
              theme="vs-dark"
              value={sharedDocument}
              onChange={handleEditorChange}
              options={{
                readOnly: effectiveReadOnly,
                minimap: { enabled: false },
                fontSize: 13,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: 'on'
              }}
            />
          </div>

          {/* Editor Status Footer */}
          {effectiveReadOnly && (
            <div className="p-2 rounded-xl bg-accent-orange/10 border border-accent-orange/30 text-accent-orange text-[11px] font-semibold text-center">
              Editing is currently restricted to creator-only mode.
            </div>
          )}

        </div>

        {/* RIGHT COLUMN (3 cols): Live Room Chat */}
        <div className="lg:col-span-3 bg-surface border border-surface-border rounded-2xl p-4 flex flex-col justify-between overflow-hidden">
          
          <div className="flex items-center justify-between border-b border-surface-border pb-2.5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-accent-blue" />
              <span>Live Study Chat</span>
            </h3>
            <span className="text-[10px] text-gray-400 font-mono">{messages.length} msgs</span>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 py-3 text-xs">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center text-gray-400 text-[11px]">
                No messages yet. Start the study conversation!
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-surface-secondary border border-surface-border text-white space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-accent-blue text-[11px]">
                      @{msg.senderId?.username || msg.senderId?.displayName || 'Member'}
                    </span>
                    <span className="text-[9px] text-gray-400 font-mono">
                      {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <p className="text-gray-200 leading-relaxed text-[11px]">{msg.message}</p>
                </div>
              ))
            )}
          </div>

          {typingUser && (
            <p className="text-[10px] text-accent-cyan italic pb-1">@{typingUser} is typing...</p>
          )}

          {/* Chat Input */}
          <form onSubmit={handleSendMessage} className="pt-2 border-t border-surface-border flex items-center space-x-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Send message..."
              className="flex-1 bg-surface-secondary border border-surface-border rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-accent-purple"
            />
            <button
              type="submit"
              className="p-2 rounded-xl bg-accent-purple text-white hover:bg-purple-600 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>

      </div>

      {/* Media Precheck Modal */}
      <MediaPrecheckModal
        isOpen={isPrecheckOpen}
        onClose={() => setIsPrecheckOpen(false)}
        onProceed={() => setIsPrecheckOpen(false)}
      />

    </div>
  );
}
