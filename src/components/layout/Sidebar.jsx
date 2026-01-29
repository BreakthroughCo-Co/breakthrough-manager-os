import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Shield,
  Calculator,
  DollarSign,
  Boxes,
  ListTodo,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Settings,
  Building2,
  MessageSquare,
  Zap,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
  { name: 'Practitioners', icon: UserCheck, page: 'Practitioners' },
  { name: 'Clients', icon: Users, page: 'Clients' },
  { name: 'Compliance', icon: Shield, page: 'Compliance' },
  { name: 'Billing', icon: DollarSign, page: 'Billing' },
  { name: 'Programs', icon: Boxes, page: 'Programs' },
  { name: 'Tasks', icon: ListTodo, page: 'Tasks' },
  { name: 'Messages', icon: MessageSquare, page: 'Messages' },
  { name: 'Reports', icon: FileText, page: 'Reports' },
  { name: 'Workflows', icon: Zap, page: 'WorkflowTriggers' },
  { name: 'Calculator', icon: Calculator, page: 'NDISCalculator' },
  { name: 'AI Assistant', icon: Sparkles, page: 'AIAssistant' },
];

export default function Sidebar({ currentPage }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-r border-slate-800/50 z-50 transition-all duration-300 flex flex-col",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "h-16 flex items-center border-b border-slate-800/50 px-4",
        collapsed ? "justify-center" : "gap-3"
      )}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-white font-semibold text-sm leading-tight">Breakthrough</span>
            <span className="text-slate-400 text-xs">Manager OS</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = currentPage === item.page;
          return (
            <Link
              key={item.name}
              to={createPageUrl(item.page)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                isActive
                  ? "bg-teal-500/10 text-teal-400"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50",
                collapsed && "justify-center px-0"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 flex-shrink-0 transition-transform",
                isActive && "scale-110"
              )} />
              {!collapsed && (
                <span className="text-sm font-medium">{item.name}</span>
              )}
              {isActive && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Settings */}
      <div className="p-3 border-t border-slate-800/50">
        <Link
          to={createPageUrl('Settings')}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all",
            collapsed && "justify-center px-0"
          )}
        >
          <Settings className="w-5 h-5" />
          {!collapsed && <span className="text-sm font-medium">Settings</span>}
        </Link>
      </div>

      {/* Collapse Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </Button>
    </aside>
  );
}