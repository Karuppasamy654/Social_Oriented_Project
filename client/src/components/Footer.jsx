import React from 'react';
import { useLocation } from 'react-router-dom';
import { Heart } from 'lucide-react';

export default function Footer() {
  const location = useLocation();
  const isOnboarding = location.pathname.startsWith('/onboarding');

  return (
    <footer className="bg-[#0B1020] border-t border-surface-border py-10 mt-20 text-gray-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-3">
          <img 
            src="/logo.png" 
            alt="CodeBuddy Logo" 
            className="w-9 h-9 object-contain rounded-full drop-shadow-sm" 
          />

          <span className="text-white font-bold text-base tracking-tight">CodeBuddy</span>
          <span className="text-xs text-gray-500">— Don't Code Alone</span>
        </div>
        <p className="flex items-center text-xs">
          Built with <Heart className="w-3.5 h-3.5 mx-1 text-red-500 fill-red-500" /> for developers, students, and competitive coders worldwide.
        </p>
        {!isOnboarding && (
          <div className="flex items-center space-x-6 text-xs text-gray-400">
            <a href="#" className="hover:text-accent-blue transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-accent-blue transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-accent-blue transition-colors">Documentation</a>
          </div>
        )}
      </div>
    </footer>
  );
}
