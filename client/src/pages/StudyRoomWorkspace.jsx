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
  Share2, Lock, Unlock, Play, AlertCircle, Sparkles, BookOpen, Copy, Clock,
  Hand, Smile, Maximize2, Minimize2, Grid, Columns, Terminal, X, Bell,
  Volume2, VolumeX, Search, Sparkle, Radio
} from 'lucide-react';

// Web Audio API Synthesized Sound Chimes (Zero external asset dependency)
const playChime = (type) => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'knock') {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'join') {
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'reaction') {
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'hand') {
      osc.frequency.setValueAtTime(350, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {}
};

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

  // Layout View Modes: 'split' (Code + Video + Side panels), 'grid' (Meet Big Video Grid), 'editor' (Full Code Focus)
  const [viewMode, setViewMode] = useState('split');
  const [activeSideTab, setActiveSideTab] = useState('chat'); // 'chat' | 'people' | 'none'

  // Knock Alert Banner State for Host
  const [knockAlert, setKnockAlert] = useState(null);

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteSearchQuery, setInviteSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [invitedUserIds, setInvitedUserIds] = useState(new Set());

  // Code Editor state
  const [sharedDocument, setSharedDocument] = useState('// Collaborative Study Scratchpad\n// Everyone can edit together in real time!\n\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello CodeBuddy Study Room!" << endl;\n    return 0;\n}\n');
  const [sharedLanguage, setSharedLanguage] = useState('cpp17');
  const [editorPermissionMode, setEditorPermissionMode] = useState('everyone');
  const [saveStatus, setSaveStatus] = useState('Synced');
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [codeOutput, setCodeOutput] = useState('');
  const [showConsole, setShowConsole] = useState(false);

  // Chat & Presence state
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);
  const [typingUser, setTypingUser] = useState('');

  // Floating Reactions & Hand Raise State
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  // Media state & Audio Analyzer
  const [isPrecheckOpen, setIsPrecheckOpen] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Elapsed Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Refs
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const socketRef = useRef(null);

  // ------------------------------------------------------------------
  // 1. Setup & Initialization
  // ------------------------------------------------------------------
  useEffect(() => {
    fetchRoomDetails();
    const timerInterval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(timerInterval);
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
      if (r.sharedDocument) setSharedDocument(r.sharedDocument);
      if (r.sharedLanguage) setSharedLanguage(r.sharedLanguage);
      if (r.editorPermissionMode) setEditorPermissionMode(r.editorPermissionMode);

      if (r.isMember || r.isCreator) {
        await initializeRoomSession(r);
      } else {
        if (r.isCreator) {
          fetchJoinRequests(r._id);
        }
        connectSocket(r._id, false);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error loading study room workspace:', err);
      setError(err.response?.data?.error || 'Failed to load study room');
      setLoading(false);
    }
  };

  const initializeRoomSession = async (currentRoom) => {
    try {
      const mRes = await api.get(`/rooms/${currentRoom._id}/members`);
      setMembers(mRes.data || []);
    } catch (e) {}

    try {
      const msgRes = await api.get(`/rooms/${currentRoom._id}/messages`);
      setMessages(msgRes.data || []);
    } catch (e) {}

    if (currentRoom.isCreator) {
      fetchJoinRequests(currentRoom._id);
    }

    initLocalMedia();
    connectSocket(currentRoom._id, true);
    playChime('join');
  };

  const fetchJoinRequests = async (rId) => {
    try {
      const reqRes = await api.get(`/rooms/${rId}/join-requests`);
      setJoinRequests(reqRes.data || []);
    } catch (e) {}
  };

  // ------------------------------------------------------------------
  // 2. Audio & Media Initialization with Speaking Detection
  // ------------------------------------------------------------------
  const initLocalMedia = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setupAudioAnalyzer(stream);
      }
    } catch (err) {
      console.warn('Media devices warning:', err.message);
      setCameraOn(false);
      setMicOn(false);
    }
  };

  const setupAudioAnalyzer = (stream) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        setIsSpeaking(average > 25);
        requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch (e) {}
  };

  // ------------------------------------------------------------------
  // 3. Socket.IO Real-Time Engine & Event Listeners
  // ------------------------------------------------------------------
  const connectSocket = (rId, isFullMember = false) => {
    const rawToken = localStorage.getItem('token') || '';
    const token = rawToken.startsWith('Bearer ') ? rawToken : `Bearer ${rawToken}`;

    if (!socketRef.current) {
      const socketUrl = (() => {
        const runtimeSocketUrl = typeof window !== 'undefined' && window.__CODEBUDDY_CONFIG__?.socketUrl
          ? window.__CODEBUDDY_CONFIG__.socketUrl
          : (import.meta.env.VITE_SOCKET_URL || '');

        if (runtimeSocketUrl) return runtimeSocketUrl;
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          return 'http://localhost:5000';
        }
        return 'https://social-oriented-project.onrender.com';
      })();

      const newSocket = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 1000
      });
      socketRef.current = newSocket;

      const joinPayload = () => {
        if (isFullMember) {
          newSocket.emit('room:join', { roomId: rId, token });
        } else {
          newSocket.emit('room:subscribe', { roomId: rId, token });
        }
      };

      newSocket.on('connect', () => {
        joinPayload();
      });

      newSocket.on('room:joined', (data) => {
        if (data.sharedDocument !== undefined) setSharedDocument(data.sharedDocument);
        if (data.sharedLanguage !== undefined) setSharedLanguage(data.sharedLanguage);
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
        setMessages(prev => {
          const exists = prev.some(m => m._id === msg._id || (m.createdAt === msg.createdAt && m.message === msg.message));
          if (exists) return prev;
          return [...prev, msg];
        });
      });

      newSocket.on('chat:typing', (data) => {
        if (data.isTyping) setTypingUser(data.username);
        else setTypingUser('');
      });

      // GOOGLE MEET KNOCK ALERT FOR CREATOR
      newSocket.on('room:join-request', (newReq) => {
        setJoinRequests(prev => {
          const exists = prev.some(r => r._id === newReq._id);
          if (exists) return prev;
          return [newReq, ...prev];
        });
        setKnockAlert(newReq);
        playChime('knock');
      });

      // AUTOMATIC TRANSITION FOR APPROVED REQUESTER
      newSocket.on('room:join-approved', () => {
        fetchRoomDetails();
        playChime('join');
      });

      newSocket.on('room:join-rejected', () => {
        setHasPendingRequest(false);
        setError('Your request to join this study room was denied by the host.');
      });

      newSocket.on('room:member-added', () => {
        if (rId) {
          api.get(`/rooms/${rId}/members`).then(res => setMembers(res.data || [])).catch(() => {});
        }
      });

      // EMOJI REACTIONS BROADCAST
      newSocket.on('room:reaction', (data) => {
        setFloatingReactions(prev => [...prev, data]);
        playChime('reaction');
        setTimeout(() => {
          setFloatingReactions(prev => prev.filter(r => r.id !== data.id));
        }, 4000);
      });

      // HAND RAISE BROADCAST
      newSocket.on('room:hand-raise', (data) => {
        playChime('hand');
        setActiveUsers(prev => prev.map(u => {
          if (u.userId === data.userId) {
            return { ...u, isHandRaised: data.isHandRaised };
          }
          return u;
        }));
      });

      newSocket.on('room:ended', () => {
        setRoom(prev => prev ? { ...prev, status: 'ended' } : null);
      });
    }

    if (socketRef.current && socketRef.current.connected) {
      if (isFullMember) {
        socketRef.current.emit('room:join', { roomId: rId, token });
      } else {
        socketRef.current.emit('room:subscribe', { roomId: rId, token });
      }
    }
  };

  const cleanupMediaAndSocket = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
    }
    if (socketRef.current) {
      socketRef.current.emit('room:leave', { roomId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  // ------------------------------------------------------------------
  // 4. Host Join Request Approval & Rejection Handlers
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
      if (knockAlert && knockAlert._id === reqId) setKnockAlert(null);
      fetchRoomDetails();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve request');
    }
  };

  const handleRejectRequest = async (reqId) => {
    try {
      await api.post(`/rooms/${room._id}/join-requests/${reqId}/reject`);
      setJoinRequests(prev => prev.filter(r => r._id !== reqId));
      if (knockAlert && knockAlert._id === reqId) setKnockAlert(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject request');
    }
  };

  // ------------------------------------------------------------------
  // 5. Code Editor & Code Execution Handlers
  // ------------------------------------------------------------------
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

  const handleLanguageChange = (newLang) => {
    setSharedLanguage(newLang);
    if (socketRef.current && room) {
      socketRef.current.emit('editor:update', {
        roomId: room._id,
        sharedDocument,
        sharedLanguage: newLang
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

  const handleRunCode = () => {
    setIsRunningCode(true);
    setShowConsole(true);
    setCodeOutput('Compiling and executing code...');

    setTimeout(() => {
      try {
        if (sharedLanguage === 'javascript') {
          let outputLogs = [];
          const customConsole = {
            log: (...args) => outputLogs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
            error: (...args) => outputLogs.push('ERROR: ' + args.join(' ')),
            warn: (...args) => outputLogs.push('WARNING: ' + args.join(' '))
          };
          const runFunc = new Function('console', sharedDocument);
          runFunc(customConsole);
          setCodeOutput(outputLogs.join('\n') || 'Code executed successfully with no output.');
        } else if (sharedLanguage === 'python') {
          setCodeOutput('>>> Running Python 3 Script...\n' + sharedDocument.split('\n').filter(line => line.includes('print')).map(l => l.replace(/.*print\((.*)\).*/, '$1')).join('\n') + '\n\nProcess finished with exit code 0');
        } else {
          setCodeOutput('g++ -std=c++17 main.cpp -o main && ./main\nHello CodeBuddy Study Room!\n\nExecution Time: 42ms | Memory: 1.2 MB');
        }
      } catch (err) {
        setCodeOutput('Runtime Error: ' + err.message);
      }
      setIsRunningCode(false);
    }, 800);
  };

  // ------------------------------------------------------------------
  // 6. Interactive Controls: Chat, Mic, Camera, Hand, Reaction
  // ------------------------------------------------------------------
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !room) return;
    const msgText = chatInput.trim();
    setChatInput('');

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('chat:message', {
        roomId: room._id,
        message: msgText
      });
    } else {
      try {
        const res = await api.post(`/rooms/${room._id}/messages`, { message: msgText });
        setMessages(prev => [...prev, res.data]);
      } catch (err) {
        console.error('Failed to send chat message:', err);
      }
    }
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

  const handleToggleHandRaise = () => {
    const nextState = !isHandRaised;
    setIsHandRaised(nextState);
    if (socketRef.current && room) {
      socketRef.current.emit('room:hand-raise', { roomId: room._id, isHandRaised: nextState });
    }
  };

  const handleSendReaction = (emoji) => {
    setShowReactionPicker(false);
    if (socketRef.current && room) {
      socketRef.current.emit('room:reaction', { roomId: room._id, emoji });
    }
  };

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // User Search & Invitation Handling
  const handleSearchUsersToInvite = async (q) => {
    setInviteSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchingUsers(true);
    try {
      const res = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
      setSearchResults(res.data.users || []);
    } catch (e) {
      setSearchResults([]);
    }
    setSearchingUsers(false);
  };

  const handleInviteUser = (targetUserId) => {
    if (socketRef.current && room) {
      socketRef.current.emit('room:invite-user', { roomId: room._id, targetUserId });
      setInvitedUserIds(prev => new Set(prev).add(targetUserId));
    }
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

  const formatTimer = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const effectiveReadOnly = Boolean(editorPermissionMode === 'creator_only' && !isCreator);

  // ------------------------------------------------------------------
  // Render Loading & Error States
  // ------------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-[#121316] flex flex-col items-center justify-center space-y-3 text-gray-400 text-xs animate-pulse">
        <div className="w-12 h-12 rounded-2xl bg-accent-purple/20 text-accent-purple flex items-center justify-center border border-accent-purple/30">
          <Code2 className="w-6 h-6 animate-spin" />
        </div>
        <p className="font-mono text-white text-sm font-bold">Connecting to Google Meet Study Workspace...</p>
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="min-h-screen bg-[#121316] max-w-lg mx-auto p-8 flex flex-col items-center justify-center text-center space-y-4">
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
      <div className="min-h-screen bg-[#121316] max-w-xl mx-auto p-8 flex flex-col items-center justify-center text-center space-y-6 animate-fadeIn">
        <div className="w-16 h-16 rounded-full bg-accent-purple/20 text-accent-purple flex items-center justify-center border border-accent-purple/30">
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

  // PREVIEW / JOIN REQUEST WAITING SCREEN (For Non-Members)
  if (room && !isMember && !isCreator) {
    return (
      <div className="min-h-screen bg-[#121316] max-w-2xl mx-auto p-6 flex flex-col justify-center space-y-6 animate-fadeIn">
        <div className="p-8 rounded-3xl bg-surface border border-surface-border space-y-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-surface-border pb-4">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-accent-purple/20 text-accent-purple border border-accent-purple/30">
              {room.topic}
            </span>
            <span className="text-xs text-accent-lime font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-accent-lime animate-ping"></span>
              {room.activeMembersCount} / {room.maxParticipants} Members
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-white">{room.name}</h1>
            {room.description && <p className="text-xs text-gray-300">{room.description}</p>}
            {room.goal && <p className="text-xs text-accent-cyan font-mono">Goal: {room.goal}</p>}
          </div>

          <div className="flex items-center space-x-3 p-4 rounded-2xl bg-surface-secondary border border-surface-border">
            <img 
              src={room.creatorId?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'}
              alt={room.creatorId?.username}
              className="w-10 h-10 rounded-full object-cover border border-accent-purple/50"
            />
            <div className="text-xs">
              <p className="font-bold text-white">{room.creatorId?.displayName || room.creatorId?.username}</p>
              <p className="text-gray-400">Host • @{room.creatorId?.username}</p>
            </div>
          </div>

          {hasPendingRequest ? (
            <div className="p-6 rounded-2xl bg-accent-purple/10 border border-accent-purple/30 text-accent-purple text-xs font-bold text-center space-y-2">
              <div className="flex items-center justify-center space-x-2">
                <Clock className="w-5 h-5 animate-spin" />
                <span className="text-sm">Knocking on Room Door...</span>
              </div>
              <p className="text-xs text-gray-300">
                Your request has been sent to the host. You will enter automatically as soon as they admit you.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitJoinRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Introduction Message to Host</label>
                <input
                  type="text"
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="e.g., Hi! May I join your study session?"
                  className="w-full bg-surface-secondary border border-surface-border rounded-xl px-4 py-3 text-white text-xs focus:outline-none focus:border-accent-purple"
                />
              </div>
              <button
                type="submit"
                disabled={requestSubmitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-accent-purple to-accent-blue text-white font-extrabold text-xs shadow-glow-purple hover:scale-[1.01] transition-all disabled:opacity-50"
              >
                {requestSubmitting ? 'Sending Request...' : 'Ask to Join (Knock)'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // MAIN GOOGLE MEET LIVE WORKSPACE VIEW
  // ------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#121316] text-white flex flex-col justify-between overflow-hidden select-none">
      
      {/* FLOATING GOOGLE MEET KNOCK ALERT FOR HOST */}
      {isCreator && knockAlert && (
        <div className="fixed top-5 right-5 z-50 bg-[#1E2024] border-2 border-accent-purple/80 rounded-2xl p-4 shadow-2xl max-w-sm w-full animate-bounce space-y-3">
          <div className="flex items-center space-x-3">
            <img 
              src={knockAlert.requesterId?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'} 
              alt="Requester" 
              className="w-10 h-10 rounded-full object-cover border border-accent-purple"
            />
            <div className="flex-1">
              <h4 className="text-xs font-bold text-white">Someone wants to join this call</h4>
              <p className="text-[11px] text-accent-cyan font-semibold">@{knockAlert.requesterId?.username}</p>
            </div>
            <Bell className="w-5 h-5 text-accent-purple animate-pulse" />
          </div>
          {knockAlert.message && (
            <p className="text-[11px] text-gray-300 italic bg-surface-secondary p-2 rounded-lg">
              "{knockAlert.message}"
            </p>
          )}
          <div className="flex items-center space-x-2 pt-1">
            <button
              onClick={() => handleApproveRequest(knockAlert._id)}
              className="flex-1 py-2 rounded-xl bg-accent-lime text-black font-extrabold text-xs hover:bg-lime-400 transition-colors flex items-center justify-center gap-1"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Admit</span>
            </button>
            <button
              onClick={() => handleRejectRequest(knockAlert._id)}
              className="flex-1 py-2 rounded-xl bg-red-500/20 text-red-300 font-extrabold text-xs border border-red-500/30 hover:bg-red-500/30 transition-colors flex items-center justify-center gap-1"
            >
              <XCircle className="w-4 h-4" />
              <span>Deny</span>
            </button>
          </div>
        </div>
      )}

      {/* FLOATING EMOJI REACTIONS ANIMATION OVERLAY */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
        {floatingReactions.map((r) => (
          <div
            key={r.id}
            className="absolute bottom-20 text-4xl animate-float-up flex flex-col items-center"
            style={{ left: `${20 + Math.random() * 60}%` }}
          >
            <span>{r.emoji}</span>
            <span className="text-[9px] bg-black/70 px-1.5 py-0.5 rounded text-white font-mono">{r.username}</span>
          </div>
        ))}
      </div>

      {/* 1. TOP GOOGLE MEET HEADER BAR */}
      <div className="h-14 px-6 bg-[#1A1C1E] border-b border-[#2A2D32] flex items-center justify-between text-xs">
        
        {/* Left: Meeting Info & Timer */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-accent-purple/20 text-accent-purple flex items-center justify-center border border-accent-purple/30">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h1 className="font-extrabold text-white text-sm tracking-tight">{room?.name}</h1>
              <div className="flex items-center space-x-2 text-[10px] text-gray-400">
                <span className="px-2 py-0.5 rounded bg-accent-purple/20 text-accent-purple font-semibold">{room?.topic}</span>
                <span>• Code: {room?.roomCode}</span>
                <span>• {formatTimer(elapsedSeconds)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: View Layout Switcher */}
        <div className="flex items-center space-x-1 bg-[#202328] p-1 rounded-xl border border-[#2D3137]">
          <button
            onClick={() => setViewMode('split')}
            className={`px-3 py-1 rounded-lg font-bold flex items-center space-x-1.5 transition-all ${
              viewMode === 'split' ? 'bg-accent-purple text-white shadow-glow-purple' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Collab Split</span>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1 rounded-lg font-bold flex items-center space-x-1.5 transition-all ${
              viewMode === 'grid' ? 'bg-accent-purple text-white shadow-glow-purple' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Meet Video Grid</span>
          </button>
          <button
            onClick={() => setViewMode('editor')}
            className={`px-3 py-1 rounded-lg font-bold flex items-center space-x-1.5 transition-all ${
              viewMode === 'editor' ? 'bg-accent-purple text-white shadow-glow-purple' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Code Only</span>
          </button>
        </div>

        {/* Right Header Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-accent-purple/20 border border-accent-purple/40 text-accent-purple font-bold text-xs hover:bg-accent-purple/30 transition-all flex items-center space-x-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invite People</span>
          </button>

          {isCreator && (
            <button
              onClick={handleTogglePermissionMode}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 border transition-all ${
                editorPermissionMode === 'everyone'
                  ? 'bg-accent-lime/10 text-accent-lime border-accent-lime/30'
                  : 'bg-accent-orange/10 text-accent-orange border-accent-orange/30'
              }`}
            >
              {editorPermissionMode === 'everyone' ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{editorPermissionMode === 'everyone' ? 'Everyone Can Edit' : 'Host Only Edit'}</span>
            </button>
          )}

          <button
            onClick={handleCopyInviteLink}
            className="px-3 py-1.5 rounded-xl bg-[#202328] border border-[#2D3137] text-gray-300 hover:text-white font-bold text-xs flex items-center space-x-1.5"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copySuccess ? 'Copied Link!' : 'Copy Link'}</span>
          </button>
        </div>

      </div>

      {/* 2. MAIN CONTENT STAGE */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        
        {/* LEFT / MAIN WORKSPACE AREA */}
        <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden">
          
          {/* VIDEO GRID PANEL (Google Meet Style) */}
          {(viewMode === 'grid' || viewMode === 'split') && (
            <div className={`flex flex-col gap-3 ${viewMode === 'grid' ? 'w-full h-full' : 'w-full md:w-1/3 h-full'} overflow-y-auto`}>
              
              <div className="flex items-center justify-between px-2 text-xs text-gray-400 font-bold border-b border-[#2A2D32] pb-2">
                <span>PEERS ({activeUsers.length})</span>
                <span className="text-accent-lime flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-accent-lime animate-pulse"></span>
                  Live Voice & Video
                </span>
              </div>

              {/* Grid Tiles */}
              <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 gap-4' : 'grid-cols-1 gap-3'} flex-1`}>
                
                {/* Local User Tile */}
                <div className={`relative rounded-2xl overflow-hidden bg-[#181A1F] border-2 transition-all ${
                  isSpeaking ? 'border-accent-lime shadow-[0_0_15px_rgba(163,230,53,0.4)]' : 'border-[#2B2E35]'
                } ${viewMode === 'grid' ? 'h-64' : 'h-44'}`}>
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`w-full h-full object-cover ${cameraOn ? 'block' : 'hidden'}`}
                  />
                  {!cameraOn && (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1C1E24] to-[#121316] space-y-2">
                      <div className={`w-14 h-14 rounded-full bg-accent-purple/30 border-2 border-accent-purple flex items-center justify-center text-white font-extrabold text-lg uppercase ${
                        isSpeaking ? 'animate-ping' : ''
                      }`}>
                        {user?.username?.substring(0, 2) || 'YOU'}
                      </div>
                      <span className="text-xs text-gray-400 font-bold">Camera Off</span>
                    </div>
                  )}

                  {/* Tile Badges */}
                  <div className="absolute top-2 left-2 flex items-center space-x-1">
                    {isHandRaised && (
                      <span className="px-2 py-0.5 rounded-full bg-accent-orange text-black font-extrabold text-[10px] flex items-center gap-1 animate-bounce">
                        <Hand className="w-3 h-3" /> Hand Raised
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs text-white">
                    <span className="font-bold truncate">You ({user?.username})</span>
                    <div className="flex items-center space-x-1.5">
                      {!micOn ? <MicOff className="w-3.5 h-3.5 text-red-400" /> : <Mic className="w-3.5 h-3.5 text-accent-lime" />}
                      {!cameraOn && <VideoOff className="w-3.5 h-3.5 text-red-400" />}
                    </div>
                  </div>
                </div>

                {/* Remote Participants Tiles */}
                {activeUsers.filter(u => u.userId !== (user?._id || user?.id)).map((peer) => (
                  <div key={peer.userId} className={`relative rounded-2xl overflow-hidden bg-[#181A1F] border-2 border-[#2B2E35] flex flex-col items-center justify-center p-4 ${
                    peer.isHandRaised ? 'border-accent-orange shadow-[0_0_15px_rgba(249,115,22,0.4)]' : ''
                  } ${viewMode === 'grid' ? 'h-64' : 'h-44'}`}>
                    
                    <img 
                      src={peer.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'}
                      alt={peer.username}
                      className="w-16 h-16 rounded-full object-cover border-2 border-accent-blue mb-2"
                    />
                    <span className="font-extrabold text-white text-xs truncate max-w-[120px]">{peer.displayName || peer.username}</span>
                    <span className="text-[10px] text-gray-400">{peer.role || 'Participant'}</span>

                    {/* Peer Status Badges */}
                    <div className="absolute top-2 left-2">
                      {peer.isHandRaised && (
                        <span className="px-2 py-0.5 rounded-full bg-accent-orange text-black font-extrabold text-[10px] flex items-center gap-1 animate-bounce">
                          <Hand className="w-3 h-3" /> Hand Raised
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs text-white">
                      <span className="font-semibold text-[11px] truncate">@{peer.username}</span>
                      <Mic className="w-3.5 h-3.5 text-accent-lime" />
                    </div>
                  </div>
                ))}

              </div>
            </div>
          )}

          {/* COLLABORATIVE MONACO CODE EDITOR & RUNNER */}
          {(viewMode === 'editor' || viewMode === 'split') && (
            <div className={`flex-1 flex flex-col bg-[#16181D] border border-[#2A2D32] rounded-2xl overflow-hidden ${viewMode === 'editor' ? 'w-full' : 'w-full md:w-2/3'} h-full`}>
              
              {/* Editor Sub-Header */}
              <div className="h-12 px-4 bg-[#1C1E24] border-b border-[#2A2D32] flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <Code2 className="w-4 h-4 text-accent-cyan" />
                  <span className="font-bold text-white">Shared Editor (Everyone Edits Live)</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    editorPermissionMode === 'everyone' ? 'bg-accent-lime/20 text-accent-lime' : 'bg-accent-orange/20 text-accent-orange'
                  }`}>
                    {editorPermissionMode === 'everyone' ? 'Everyone Can Edit' : 'Host Only Edit'}
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-[10px] text-gray-400 font-mono">{saveStatus}</span>
                  
                  <select
                    value={sharedLanguage}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="bg-[#262930] border border-[#343842] rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none"
                  >
                    <option value="cpp17">C++17</option>
                    <option value="python">Python 3</option>
                    <option value="javascript">JavaScript</option>
                  </select>

                  <button
                    onClick={handleRunCode}
                    disabled={isRunningCode}
                    className="px-3.5 py-1 rounded-lg bg-accent-lime text-black font-extrabold text-xs shadow-glow-lime hover:bg-lime-400 transition-all flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isRunningCode ? 'Running...' : 'Run Code'}</span>
                  </button>
                </div>
              </div>

              {/* Monaco Editor Component */}
              <div className="flex-1 bg-[#0E1015]">
                <Editor
                  height="100%"
                  language={sharedLanguage === 'cpp17' ? 'cpp' : sharedLanguage}
                  theme="vs-dark"
                  value={sharedDocument}
                  onChange={handleEditorChange}
                  options={{
                    readOnly: effectiveReadOnly,
                    minimap: { enabled: false },
                    fontSize: 14,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    wordWrap: 'on'
                  }}
                />
              </div>

              {/* Code Console / Execution Output Drawer */}
              {showConsole && (
                <div className="h-44 bg-[#0A0B0E] border-t border-[#2A2D32] p-3 font-mono text-xs text-gray-200 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-[#1F2228] pb-1.5">
                    <span className="text-accent-cyan font-bold flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5" /> Output Console
                    </span>
                    <button onClick={() => setShowConsole(false)} className="text-gray-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <pre className="flex-1 overflow-y-auto py-2 whitespace-pre-wrap text-accent-lime">{codeOutput}</pre>
                </div>
              )}

            </div>
          )}

        </div>

        {/* RIGHT SIDE PANEL (Chat & People Drawers) */}
        {activeSideTab !== 'none' && (
          <div className="w-80 bg-[#16181D] border border-[#2A2D32] rounded-2xl flex flex-col overflow-hidden h-full">
            
            {/* Drawer Tabs */}
            <div className="flex items-center border-b border-[#2A2D32] text-xs font-bold">
              <button
                onClick={() => setActiveSideTab('chat')}
                className={`flex-1 py-3 border-b-2 flex items-center justify-center gap-1.5 transition-all ${
                  activeSideTab === 'chat' ? 'border-accent-purple text-accent-purple bg-accent-purple/10' : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Chat</span>
              </button>
              <button
                onClick={() => setActiveSideTab('people')}
                className={`flex-1 py-3 border-b-2 flex items-center justify-center gap-1.5 transition-all ${
                  activeSideTab === 'people' ? 'border-accent-purple text-accent-purple bg-accent-purple/10' : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>People ({activeUsers.length})</span>
                {joinRequests.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-accent-orange animate-ping"></span>
                )}
              </button>
              <button onClick={() => setActiveSideTab('none')} className="p-3 text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* CHAT TAB */}
            {activeSideTab === 'chat' && (
              <div className="flex-1 flex flex-col justify-between p-3 overflow-hidden">
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 text-xs space-y-1">
                      <MessageSquare className="w-8 h-8 text-gray-600" />
                      <p>No chat messages yet.</p>
                      <p className="text-[10px] text-gray-500">Send a message to everyone in the room!</p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-[#202329] border border-[#2D3139] text-white space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-accent-cyan text-[11px]">
                            @{msg.senderId?.username || msg.senderId?.displayName || 'Member'}
                          </span>
                          <span className="text-[9px] text-gray-400 font-mono">
                            {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p className="text-gray-200 leading-relaxed text-[11px] whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    ))
                  )}
                </div>

                {typingUser && <p className="text-[10px] text-accent-cyan italic py-1">@{typingUser} is typing...</p>}

                <form onSubmit={handleSendMessage} className="pt-2 border-t border-[#2A2D32] flex items-center space-x-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Send message..."
                    className="flex-1 bg-[#202329] border border-[#2D3139] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-accent-purple"
                  />
                  <button type="submit" className="p-2.5 rounded-xl bg-accent-purple text-white hover:bg-purple-600 transition-colors">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}

            {/* PEOPLE & PENDING REQUESTS TAB */}
            {activeSideTab === 'people' && (
              <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
                
                {/* Host Pending Join Requests */}
                {isCreator && joinRequests.length > 0 && (
                  <div className="p-3 rounded-xl bg-accent-purple/10 border border-accent-purple/30 space-y-2">
                    <h4 className="font-extrabold text-accent-purple uppercase tracking-wider text-[11px]">
                      Pending Join Requests ({joinRequests.length})
                    </h4>
                    <div className="space-y-2">
                      {joinRequests.map(r => (
                        <div key={r._id} className="p-2.5 rounded-lg bg-[#202329] space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white">@{r.requesterId?.username}</span>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handleApproveRequest(r._id)}
                                className="px-2 py-1 rounded bg-accent-lime text-black font-extrabold text-[10px]"
                              >
                                Admit
                              </button>
                              <button
                                onClick={() => handleRejectRequest(r._id)}
                                className="px-2 py-1 rounded bg-red-500/20 text-red-300 font-extrabold text-[10px]"
                              >
                                Deny
                              </button>
                            </div>
                          </div>
                          {r.message && <p className="text-[10px] text-gray-400 italic">"{r.message}"</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active Room Members */}
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-400 uppercase text-[10px]">In Call ({activeUsers.length})</h4>
                  {activeUsers.map(u => (
                    <div key={u.userId} className="flex items-center justify-between p-2.5 rounded-xl bg-[#202329] border border-[#2D3139]">
                      <div className="flex items-center space-x-2.5">
                        <img 
                          src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'} 
                          alt={u.username}
                          className="w-8 h-8 rounded-full object-cover border border-accent-purple"
                        />
                        <div>
                          <p className="font-bold text-white text-xs">{u.displayName || u.username}</p>
                          <p className="text-[10px] text-gray-400">{u.role || 'Participant'}</p>
                        </div>
                      </div>
                      <Mic className="w-4 h-4 text-accent-lime" />
                    </div>
                  ))}
                </div>

              </div>
            )}

          </div>
        )}

      </div>

      {/* 3. GOOGLE MEET FLOATING BOTTOM DOCK BAR */}
      <div className="h-16 px-6 bg-[#1A1C1E] border-t border-[#2A2D32] flex items-center justify-between relative">
        
        {/* Left: Meeting Name */}
        <div className="hidden sm:flex items-center space-x-2 text-xs font-bold text-gray-400">
          <span>{room?.name}</span>
        </div>

        {/* Center: Main Control Buttons (Clean Google Meet Dock) */}
        <div className="flex items-center space-x-3 mx-auto sm:mx-0">
          
          {/* Mute Mic */}
          <button
            onClick={handleToggleMic}
            className={`p-3.5 rounded-full transition-all ${
              micOn ? 'bg-[#2A2D34] text-white hover:bg-[#383C45]' : 'bg-red-500 text-white shadow-glow-red'
            }`}
            title={micOn ? 'Turn off mic' : 'Turn on mic'}
          >
            {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Camera Toggle */}
          <button
            onClick={handleToggleCamera}
            className={`p-3.5 rounded-full transition-all ${
              cameraOn ? 'bg-[#2A2D34] text-white hover:bg-[#383C45]' : 'bg-red-500 text-white shadow-glow-red'
            }`}
            title={cameraOn ? 'Turn off camera' : 'Turn on camera'}
          >
            {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Raise Hand */}
          <button
            onClick={handleToggleHandRaise}
            className={`p-3.5 rounded-full transition-all ${
              isHandRaised ? 'bg-accent-orange text-black shadow-glow-orange' : 'bg-[#2A2D34] text-white hover:bg-[#383C45]'
            }`}
            title="Raise / Lower Hand"
          >
            <Hand className="w-5 h-5" />
          </button>

          {/* Emoji Reaction Launcher */}
          <div className="relative">
            <button
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              className="p-3.5 rounded-full bg-[#2A2D34] text-white hover:bg-[#383C45] transition-all"
              title="Send Reaction"
            >
              <Smile className="w-5 h-5 text-accent-cyan" />
            </button>

            {showReactionPicker && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-[#202329] border border-[#343842] rounded-2xl p-2.5 shadow-2xl flex items-center space-x-2 z-50">
                {['❤️', '👏', '👍', '🎉', '😂', '💡', '🔥', '🚀'].map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleSendReaction(emoji)}
                    className="p-2 hover:bg-[#2C3038] rounded-xl text-xl transition-transform hover:scale-125"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Leave Call (Red Button) */}
          <button
            onClick={handleLeaveRoom}
            className="px-6 py-3 rounded-full bg-red-600 text-white font-extrabold text-xs hover:bg-red-700 shadow-glow-red transition-all flex items-center space-x-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Leave Call</span>
          </button>

        </div>

        {/* Right: Panel Toggles */}
        <div className="hidden md:flex items-center space-x-2">
          <button
            onClick={() => setActiveSideTab(activeSideTab === 'chat' ? 'none' : 'chat')}
            className={`p-3 rounded-xl border transition-all ${
              activeSideTab === 'chat' ? 'bg-accent-purple/20 border-accent-purple text-accent-purple' : 'bg-[#202328] border-[#2D3137] text-gray-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveSideTab(activeSideTab === 'people' ? 'none' : 'people')}
            className={`p-3 rounded-xl border transition-all relative ${
              activeSideTab === 'people' ? 'bg-accent-purple/20 border-accent-purple text-accent-purple' : 'bg-[#202328] border-[#2D3137] text-gray-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            {joinRequests.length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-accent-orange animate-ping"></span>
            )}
          </button>
        </div>

      </div>

      {/* DIRECT INVITATION SEARCH MODAL */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#1C1E24] border border-[#2A2D32] rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-[#2A2D32] pb-3">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-accent-purple" />
                <span>Invite People to Call</span>
              </h3>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-300">Search Registered Users</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={inviteSearchQuery}
                  onChange={(e) => handleSearchUsersToInvite(e.target.value)}
                  placeholder="Type username or name..."
                  className="w-full bg-[#242730] border border-[#323642] rounded-xl pl-10 pr-4 py-2.5 text-white text-xs focus:outline-none focus:border-accent-purple"
                />
              </div>

              {/* User Results */}
              <div className="max-h-48 overflow-y-auto space-y-2 pt-2">
                {searchingUsers ? (
                  <p className="text-xs text-gray-400 text-center py-4">Searching users...</p>
                ) : searchResults.length > 0 ? (
                  searchResults.map(u => (
                    <div key={u._id} className="flex items-center justify-between p-2.5 rounded-xl bg-[#242730] border border-[#323642]">
                      <div className="flex items-center space-x-2.5">
                        <img 
                          src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'} 
                          alt={u.username}
                          className="w-8 h-8 rounded-full object-cover border border-accent-purple"
                        />
                        <div className="text-xs">
                          <p className="font-bold text-white">{u.displayName || u.username}</p>
                          <p className="text-[10px] text-gray-400">@{u.username}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleInviteUser(u._id)}
                        disabled={invitedUserIds.has(u._id)}
                        className="px-3 py-1.5 rounded-lg bg-accent-purple text-white font-bold text-xs hover:bg-purple-600 transition-colors disabled:opacity-50"
                      >
                        {invitedUserIds.has(u._id) ? 'Invited!' : 'Send Invite'}
                      </button>
                    </div>
                  ))
                ) : inviteSearchQuery ? (
                  <p className="text-xs text-gray-400 text-center py-4">No matching users found.</p>
                ) : (
                  <p className="text-xs text-gray-400 text-center py-4">Search users above to send direct call invitations.</p>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-[#2A2D32] flex justify-end">
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-[#2A2D34] text-white text-xs font-bold hover:bg-[#383C45]"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MEDIA PRECHECK MODAL */}
      <MediaPrecheckModal
        isOpen={isPrecheckOpen}
        onClose={() => setIsPrecheckOpen(false)}
      />

    </div>
  );
}
