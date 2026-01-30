
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Non-destructive shim for process.env
if (typeof window !== 'undefined') {
  const win = window as any;
  win.process = win.process || {};
  win.process.env = win.process.env || {};
  // If platform has injected a key but shim missed it, ensure it's mapped
  if (win.ENV?.API_KEY && !win.process.env.API_KEY) {
    win.process.env.API_KEY = win.ENV.API_KEY;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
