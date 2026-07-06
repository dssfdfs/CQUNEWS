import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'

try {
  const settingsStr = localStorage.getItem('settings');
  if (settingsStr) {
    const settings = JSON.parse(settingsStr);
    const body = document.body;
    body.classList.remove('light', 'dark');
    if (settings.theme === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      body.classList.add(systemDark ? 'dark' : 'light');
    } else {
      body.classList.add(settings.theme || 'light');
    }
    document.documentElement.style.fontSize = `${settings.fontSize || 14}px`;
    document.documentElement.lang = settings.language || 'zh';
  } else {
    document.body.classList.add('light');
    document.documentElement.style.fontSize = '14px';
    document.documentElement.lang = 'zh';
  }
} catch {
  document.body.classList.add('light');
  document.documentElement.style.fontSize = '14px';
  document.documentElement.lang = 'zh';
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)