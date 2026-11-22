import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const appBase = import.meta.env.BASE_URL
  window.addEventListener('load', () => navigator.serviceWorker.register(`${appBase}sw.js`, { scope: appBase }).catch(() => {}))
}