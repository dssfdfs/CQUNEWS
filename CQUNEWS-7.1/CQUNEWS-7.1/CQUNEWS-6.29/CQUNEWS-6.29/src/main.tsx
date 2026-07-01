import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'

function restoreThemeFromStorage() {
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
  const savedFontSize = localStorage.getItem('fontSize');
  
  if (savedTheme) {
    if (savedTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', systemTheme);
    } else {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }
  
  if (savedFontSize) {
    document.documentElement.style.fontSize = `${savedFontSize}px`;
  }
  
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', systemTheme);
    }
  });
}

restoreThemeFromStorage();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)