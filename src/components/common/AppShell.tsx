/**
 * SALUS Sync — AppShell
 * Centered phone-frame wrapper for all authenticated screens.
 * Contains the page content area + bottom navigation.
 */

import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export function AppShell() {
  return (
    <div className="app-wrapper">
      <div className="app-shell">
        <div className="page-content">
          <Outlet />
        </div>
        <BottomNav />
      </div>
    </div>
  );
}
