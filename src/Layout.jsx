import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import AppErrorBoundary from '@/components/errors/AppErrorBoundary';
import { ThemeProvider, useTheme } from '@/components/theme/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';

function LayoutContent({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const { isDark, toggleTheme } = useTheme();

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
    <AppErrorBoundary>
      <div className={cn(
        "min-h-screen transition-colors duration-300",
        isDark ? "bg-slate-950 text-slate-50" : "bg-slate-50 text-slate-900"
      )}>
        <Sidebar currentPage={currentPageName} />
        
        {/* Main Content */}
        <main className={cn(
          "transition-all duration-300 min-h-screen",
          "ml-64"
        )}>
          {/* Top Bar */}
          <header className={cn(
            "h-16 flex items-center justify-between px-8 sticky top-0 z-40 transition-colors duration-300 border-b",
            isDark 
              ? "bg-slate-900 border-slate-800" 
              : "bg-white border-slate-200"
          )}>
            <div>
              <h1 className={cn(
                "text-lg font-semibold capitalize transition-colors duration-300",
                isDark ? "text-slate-50" : "text-slate-900"
              )}>
                {currentPageName?.replace(/([A-Z])/g, ' $1').trim() || 'Dashboard'}
              </h1>
            </div>
            <div className="flex items-center gap-6">
              <NotificationBell />
              <button
                onClick={toggleTheme}
                className={cn(
                  "p-2 rounded-lg transition-all duration-200",
                  isDark
                    ? "bg-slate-800 hover:bg-slate-700 text-amber-400"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                )}
                title={isDark ? "Light mode" : "Dark mode"}
              >
                {isDark ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>
              {user && (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={cn(
                      "text-sm font-medium transition-colors duration-300",
                      isDark ? "text-slate-50" : "text-slate-900"
                    )}>{user.full_name}</p>
                    <p className={cn(
                      "text-xs transition-colors duration-300",
                      isDark ? "text-slate-400" : "text-slate-500"
                    )}>{user.role === 'admin' ? 'Administrator' : 'User'}</p>
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
    </AppErrorBoundary>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <ThemeProvider>
      <LayoutContent children={children} currentPageName={currentPageName} />
    </ThemeProvider>
  );
}