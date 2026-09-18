import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import CreateStudyRoomModal from '../components/CreateStudyRoomModal';
import { 
  Users, Search, Plus, Filter, Lock, Globe, MessageSquare, Code2, 
  BookOpen, ArrowRight, ShieldCheck, CheckCircle2, Clock
} from 'lucide-react';

export default function StudyRoomPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [totalRooms, setTotalRooms] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, [selectedTopic]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRooms();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      if (selectedTopic !== 'All') params.append('topic', selectedTopic);
      params.append('status', 'active');

      const res = await api.get(`/rooms?${params.toString()}`);
      setRooms(res.data.rooms || []);
      setTotalRooms(res.data.pagination?.total || (res.data.rooms || []).length);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching rooms:', err);
      setRooms([]);
      setLoading(false);
    }
  };

  const handleRoomCreated = (newRoom) => {
    navigate(`/study/rooms/${newRoom._id || newRoom.roomCode}`);
  };

  const handleJoinClick = async (room) => {
    navigate(`/study/rooms/${room._id || room.roomCode}`);
  };

  const topicsList = ['All', 'Array', 'HashMap', 'Graphs', 'Trees', 'Dynamic Programming', 'Strings'];

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-surface-border pb-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-accent-purple/20 to-accent-blue/20 text-accent-purple border border-accent-purple/30">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Collaborative Study Rooms</span>
              </h1>
              <p className="text-xs text-gray-400">Study together in real time with shared editor, WebRTC video/audio, chat, and presence.</p>
            </div>
          </div>
        </div>

        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-accent-purple via-purple-600 to-accent-blue text-white font-extrabold text-xs shadow-glow-purple hover:scale-105 transition-all flex items-center space-x-2 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Study Room</span>
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface border border-surface-border p-4 rounded-2xl">
        
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rooms by name, topic, or host..."
            className="w-full bg-surface-secondary border border-surface-border rounded-xl pl-10 pr-4 py-2 text-white text-xs focus:outline-none focus:border-accent-purple"
          />
        </div>

        {/* Topic Filters */}
        <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {topicsList.map((tp) => (
            <button
              key={tp}
              onClick={() => setSelectedTopic(tp)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedTopic === tp
                  ? 'bg-accent-purple text-white border border-accent-purple/50 shadow-glow-purple'
                  : 'bg-surface-secondary text-gray-400 hover:text-white border border-surface-border'
              }`}
            >
              {tp}
            </button>
          ))}
        </div>

      </div>

      {/* Active Rooms Grid */}
      {loading ? (
        <div className="py-20 text-center text-gray-400 text-xs animate-pulse">
          Loading real study rooms...
        </div>
      ) : rooms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <div 
              key={room._id}
              className="p-6 rounded-3xl bg-surface border border-surface-border hover:border-accent-purple/50 transition-all shadow-xl flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                {/* Top Badges */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-accent-purple/20 text-accent-purple border border-accent-purple/30">
                    {room.topic}
                  </span>
                  <div className="flex items-center space-x-1.5 text-xs text-accent-lime font-bold">
                    <span className="w-2 h-2 rounded-full bg-accent-lime animate-pulse"></span>
                    <span>{room.activeMembersCount || 1} / {room.maxParticipants} Members</span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-accent-cyan transition-colors">
                  {room.name}
                </h3>
                {room.description && (
                  <p className="text-xs text-gray-400 line-clamp-2">{room.description}</p>
                )}

                {/* Host Info */}
                <div className="flex items-center space-x-2.5 pt-2 border-t border-surface-border">
                  <img 
                    src={room.creatorId?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'}
                    alt={room.creatorId?.username || 'Host'}
                    className="w-7 h-7 rounded-full object-cover border border-accent-purple/50"
                  />
                  <div className="text-xs">
                    <p className="font-semibold text-white truncate">{room.creatorId?.displayName || room.creatorId?.username || 'Host'}</p>
                    <p className="text-[10px] text-gray-400">Host</p>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-surface-border space-y-2">
                {room.goal && (
                  <p className="text-[11px] text-accent-cyan font-mono truncate">Goal: {room.goal}</p>
                )}
                <button
                  onClick={() => handleJoinClick(room)}
                  className="w-full py-2.5 rounded-xl bg-surface-secondary border border-surface-border hover:border-accent-purple text-white text-xs font-bold flex items-center justify-center space-x-2 transition-all group-hover:bg-gradient-to-r group-hover:from-accent-purple group-hover:to-accent-blue"
                >
                  <span>View & Join Room</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          ))}
        </div>
      ) : (
        /* HONEST EMPTY STATE (REAL DATA REQUIREMENT) */
        <div className="py-16 text-center space-y-4 bg-surface border border-surface-border rounded-3xl p-8 max-w-xl mx-auto">
          <div className="w-16 h-16 mx-auto rounded-full bg-accent-purple/10 border border-accent-purple/30 flex items-center justify-center text-accent-purple">
            <Users className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">No active study rooms found</h3>
            <p className="text-xs text-gray-400">
              Create a room and invite your friends or classmates to study together in real time.
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-2.5 rounded-xl bg-accent-purple text-white font-bold text-xs shadow-glow-purple hover:bg-purple-600 transition-colors inline-flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Study Room</span>
          </button>
        </div>
      )}

      {/* Create Room Modal */}
      <CreateStudyRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onRoomCreated={handleRoomCreated}
      />

    </div>
  );
}
