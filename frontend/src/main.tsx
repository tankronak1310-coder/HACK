import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import './index.css';

// Apply saved theme immediately to avoid flash
const savedTheme = localStorage.getItem('clubops_theme') || 'dark';
document.documentElement.classList.add(savedTheme);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
