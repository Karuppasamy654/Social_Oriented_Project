import React, { useState, useEffect } from 'react';
import { Camera, Mic, Volume2, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export default function MediaPrecheckModal({ isOpen, onClose, onProceed }) {
  const [micState, setMicState] = useState('checking'); // checking, ready, denied
  const [cameraState, setCameraState] = useState('checking'); // checking, ready, denied

  useEffect(() => {
    if (isOpen) {
      checkMediaDevices();
    }
  }, [isOpen]);

  const checkMediaDevices = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicState('denied');
        setCameraState('denied');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        setMicState('ready');
        setCameraState('ready');
        stream.getTracks().forEach(t => t.stop());
      } catch (err) {
        // Fallback check individually
        try {
          const aStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setMicState('ready');
          aStream.getTracks().forEach(t => t.stop());
        } catch (e) {
          setMicState('denied');
        }

        try {
          const vStream = await navigator.mediaDevices.getUserMedia({ video: true });
          setCameraState('ready');
          vStream.getTracks().forEach(t => t.stop());
        } catch (e) {
          setCameraState('denied');
        }
      }
    } catch (e) {
      setMicState('denied');
      setCameraState('denied');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-surface border border-surface-border rounded-3xl p-6 shadow-2xl space-y-6">
        
        <div className="flex items-center space-x-3 border-b border-surface-border pb-4">
          <div className="p-2.5 rounded-xl bg-accent-blue/20 text-accent-blue border border-accent-blue/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-white">Audio & Video Precheck</h3>
            <p className="text-xs text-gray-400">Verifying media devices before entering room.</p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          
          {/* Microphone status */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-secondary border border-surface-border">
            <div className="flex items-center space-x-3">
              <Mic className="w-4 h-4 text-accent-cyan" />
              <div>
                <p className="font-bold text-white">Microphone</p>
                <p className="text-[11px] text-gray-400">Voice communication</p>
              </div>
            </div>
            {micState === 'ready' ? (
              <span className="flex items-center space-x-1 text-accent-lime font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Ready</span>
              </span>
            ) : micState === 'checking' ? (
              <span className="text-gray-400 animate-pulse">Checking...</span>
            ) : (
              <span className="flex items-center space-x-1 text-red-400 font-bold">
                <AlertCircle className="w-4 h-4" />
                <span>Unavailable</span>
              </span>
            )}
          </div>

          {/* Camera status */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-secondary border border-surface-border">
            <div className="flex items-center space-x-3">
              <Camera className="w-4 h-4 text-accent-purple" />
              <div>
                <p className="font-bold text-white">Camera</p>
                <p className="text-[11px] text-gray-400">Video streaming</p>
              </div>
            </div>
            {cameraState === 'ready' ? (
              <span className="flex items-center space-x-1 text-accent-lime font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Ready</span>
              </span>
            ) : cameraState === 'checking' ? (
              <span className="text-gray-400 animate-pulse">Checking...</span>
            ) : (
              <span className="flex items-center space-x-1 text-red-400 font-bold">
                <AlertCircle className="w-4 h-4" />
                <span>Unavailable</span>
              </span>
            )}
          </div>

        </div>

        <p className="text-[11px] text-gray-400">
          Note: You can still enter and participate in the study room using chat and shared editor even if media devices are muted or disabled.
        </p>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-surface-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-secondary text-gray-300 hover:text-white font-semibold text-xs"
          >
            Cancel
          </button>
          <button
            onClick={onProceed}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-accent-purple to-accent-blue text-white font-bold text-xs shadow-glow-purple"
          >
            Enter Study Workspace →
          </button>
        </div>

      </div>
    </div>
  );
}
