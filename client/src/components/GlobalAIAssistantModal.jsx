import React, { useState } from 'react';
import { useAI } from '../context/AIContext';
import { Bot, X, Send, Sparkles } from 'lucide-react';

export default function GlobalAIAssistantModal() {
  const { isOpen, toggleAIModal, messages, sendMessageToAI, loading } = useAI();
  const [input, setInput] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    sendMessageToAI(input);
    setInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg h-[600px] bg-surface border border-surface-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-surface-secondary border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src="/logo.png" 
              alt="CodeBuddy AI Logo" 
              className="w-10 h-10 object-contain rounded-full drop-shadow-md" 
            />

            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                Ask CodeBuddy AI <Sparkles className="w-4 h-4 text-accent-cyan fill-accent-cyan" />
              </h3>
              <p className="text-xs text-gray-400">Contextual Coding & Study Assistant</p>
            </div>
          </div>
          <button 
            onClick={toggleAIModal}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 font-sans text-sm">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.isAI ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[85%] rounded-2xl p-4 ${
                msg.isAI 
                  ? 'bg-surface-secondary text-gray-200 border border-surface-border' 
                  : 'bg-gradient-to-r from-accent-blue to-accent-purple text-white shadow-glow-blue'
              }`}>
                <p className="text-xs font-semibold mb-1 opacity-70">{msg.sender}</p>
                <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-surface-secondary text-gray-400 border border-surface-border rounded-2xl p-4 text-xs flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-accent-purple animate-ping"></div>
                <span>CodeBuddy AI is thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Prompts */}
        <div className="px-6 py-2 bg-surface/50 border-t border-surface-border flex items-center space-x-2 overflow-x-auto text-xs text-gray-300">
          <button 
            onClick={() => sendMessageToAI('What should I study today based on my mistakes?')}
            className="whitespace-nowrap px-3 py-1.5 rounded-full bg-surface-secondary border border-surface-border hover:border-accent-blue hover:text-accent-blue transition-all"
          >
            🎯 Today's Study Plan
          </button>
          <button 
            onClick={() => sendMessageToAI('Explain HashMap time complexity with an example.')}
            className="whitespace-nowrap px-3 py-1.5 rounded-full bg-surface-secondary border border-surface-border hover:border-accent-purple hover:text-accent-purple transition-all"
          >
            💡 HashMap Explanation
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="p-4 bg-surface-secondary border-t border-surface-border flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about code, mistakes, or concepts..."
            className="flex-1 bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-accent-blue placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="p-2.5 rounded-xl bg-accent-blue text-white hover:bg-blue-600 disabled:opacity-50 transition-colors shadow-glow-blue"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
}
