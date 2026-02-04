import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeContext';
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Settings,
  FileText
} from 'lucide-react';

/**
 * BottomTabs - Mobile-optimized navigation
 * 
 * NDIS Compliance: Touch-optimized navigation for field access
 * Displays only on mobile devices (< 768px)
 * Respects safe-area-inset-bottom for notch/home indicator
 */
export default function BottomTabs() {
  const location = useLocation();
  const { isDark } = useTheme();
  const currentPath = location.pathname;

  const tabs = [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
    { name: 'Clients', icon: Users, page: 'Clients' },
    { name: 'Compliance', icon: ClipboardCheck, page: 'ComplianceMonitoring' },
    { name: 'Reports', icon: FileText, page: 'Reports' },
    { name: 'Settings', icon: Settings, page: 'Settings' }
  ];

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden",
        "border-t transition-colors duration-300",
        isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
      )}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentPath === `/${tab.page}`;
          
          return (
            <Link
              key={tab.page}
              to={createPageUrl(tab.page)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full",
                "touch-manipulation select-none",
                "transition-colors duration-200",
                "min-h-[44px]",
                isActive
                  ? isDark
                    ? "text-teal-400"
                    : "text-teal-600"
                  : isDark
                    ? "text-slate-400 hover:text-slate-300"
                    : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}