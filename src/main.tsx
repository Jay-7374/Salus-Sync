import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { HealthConnect } from './plugins/HealthConnect';
import { Capacitor } from '@capacitor/core';

// [TEMPORARY DIAGNOSTIC] Check Health Connect availability on mount
if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
  console.log('[HealthConnect] Starting availability check');
  HealthConnect.checkAvailability()
    .then(result => {
      console.log('[HealthConnect] Availability:', result.status);
    })
    .catch(err => {
      console.error('[HealthConnect] Availability check failed:', err);
    });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
