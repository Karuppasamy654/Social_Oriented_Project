import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6">
      <img 
        src="/logo.png" 
        alt="CodeBuddy Logo" 
        className="w-20 h-20 object-contain rounded-full mb-4 drop-shadow-xl hover:scale-105 transition-transform" 
      />
      <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl mb-6 text-cyan-400">
        <FileQuestion className="w-10 h-10" />
      </div>

      <h1 className="text-4xl font-extrabold text-white mb-2">404 — Page Not Found</h1>
      <p className="text-gray-400 max-w-md mb-8">The requested CodeBuddy page does not exist or has been moved.</p>
      <Link to="/" className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl transition-all inline-flex items-center">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
      </Link>
    </div>
  );
}
