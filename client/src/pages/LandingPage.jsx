import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import CBLogo from '../components/CBLogo';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-[85vh] bg-[#0B1020] text-gray-100 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      
      {/* Background Radial Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-tr from-purple-600/20 via-pink-500/20 to-amber-400/10 blur-3xl pointer-events-none -z-10" />

      {/* Main Minimal Hero Container */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-2xl mx-auto space-y-6"
      >
        {/* CB Logo */}
        <div className="flex justify-center">
          <CBLogo className="w-24 h-24 shadow-2xl hover:scale-105 transition-transform cursor-pointer" />
        </div>

        {/* CodeBuddy Title */}
        <h1 className="text-6xl sm:text-8xl font-black tracking-tight bg-gradient-to-r from-pink-500 via-purple-400 via-amber-300 via-emerald-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-2xl">
          CodeBuddy
        </h1>

        {/* Exactly One Short Line Tagline */}
        <p className="text-lg sm:text-2xl font-bold tracking-wide text-gray-200">
          Learn. Solve. Improve. Compete.
        </p>

        {/* Circular Bright Action Buttons */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-5">
          <Link
            to="/login"
            className="w-full sm:w-auto px-10 py-4 rounded-full bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 text-white font-extrabold text-base shadow-xl shadow-purple-500/30 hover:scale-105 hover:shadow-purple-500/50 transition-all flex items-center justify-center space-x-2"
          >
            <span>Login</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/register"
            className="w-full sm:w-auto px-10 py-4 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-coral-500 text-white font-extrabold text-base shadow-xl shadow-orange-500/30 hover:scale-105 hover:shadow-orange-500/50 transition-all flex items-center justify-center space-x-2"
          >
            <span>Create Account</span>
            <Sparkles className="w-5 h-5" />
          </Link>
        </div>
      </motion.div>

    </div>
  );
}
