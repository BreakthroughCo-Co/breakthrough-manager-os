import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';

export default function Layout({ children, currentPageName }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        // User not logged in
      }
    };
    loadUser();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar currentPage={currentPageName} />
      
      {/* Main Content */}
      <main className={cn(
        "transition-all duration-300 min-h-screen",
        "ml-64" // Matches sidebar width
      )}>
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 capitalize">
              {currentPageName?.replace(/([A-Z])/g, ' $1').trim() || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900">{user.full_name}</p>
                  <p className="text-xs text-slate-500">{user.role === 'admin' ? 'Administrator' : 'User'}</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-medium text-sm">
                  {user.full_name?.charAt(0) || 'U'}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}