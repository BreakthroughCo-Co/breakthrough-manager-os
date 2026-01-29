import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import {
  UserPlus,
  FileText,
  Calculator,
  ClipboardCheck,
  Calendar,
  MessageSquare,
  Sparkles,
  Receipt
} from 'lucide-react';

const actions = [
  { name: 'New Client', icon: UserPlus, page: 'Clients', query: '?action=new', color: 'bg-teal-500' },
  { name: 'Log Billing', icon: Receipt, page: 'Billing', query: '?action=new', color: 'bg-purple-500' },
  { name: 'NDIS Calc', icon: Calculator, page: 'NDISCalculator', color: 'bg-blue-500' },
  { name: 'Compliance', icon: ClipboardCheck, page: 'Compliance', color: 'bg-amber-500' },
  { name: 'AI Assist', icon: Sparkles, page: 'AIAssistant', color: 'bg-pink-500' },
  { name: 'Add Task', icon: FileText, page: 'Tasks', query: '?action=new', color: 'bg-indigo-500' },
];

export default function QuickActions({ className }) {
  return (
    <div className={cn("bg-white rounded-2xl border border-slate-200 p-6", className)}>
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-3 gap-3">
        {actions.map((action) => (
          <Link
            key={action.name}
            to={createPageUrl(action.page) + (action.query || '')}
            className="group flex flex-col items-center p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all"
          >
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-transform group-hover:scale-110",
              action.color
            )}>
              <action.icon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-medium text-slate-600 text-center">{action.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}