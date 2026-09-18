import React from 'react';
import ReactDOM from 'react-dom/client';
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import App from './App.jsx';
import './index.css';

// Configure Monaco Environment worker fallback to prevent browser 404s
window.MonacoEnvironment = {
  getWorkerUrl: function (_moduleId, _label) {
    return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
      self.onmessage = function() {};
    `)}`;
  }
};

loader.config({ monaco });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
