import React from 'react';

export default function CBLogo({ className = "w-12 h-12", alt = "CodeBuddy Logo" }) {
  return (
    <img 
      src="/logo.png" 
      alt={alt}
      className={`object-contain rounded-full drop-shadow-xl ${className}`} 
    />
  );
}
