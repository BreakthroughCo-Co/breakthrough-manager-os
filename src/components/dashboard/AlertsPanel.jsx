import React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, Clock, FileWarning, UserX, ChevronRight } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';

const alertIcons = {
  compliance: Shield,
  client: Users,
  practitioner: UserCheck,
  billing: DollarSign,
  default: AlertTriangle
};

import { Shield, Users, UserCheck, DollarSign } from 'lucide-react';

export default function AlertsPanel({ alerts = [], className }) {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-50 border-red-200 text-red-700';
      case 'high': return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'medium': return 'bg-blue-50 border-blue-200 text-blue-700';
      default: return 'bg-slate-50 border-slate-200 text-slate-700';
    }
  };

  const getPriorityDot = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-amber-500';
      case 'medium': return 'bg-blue-500';
      default: return 'bg-slate-400';
    }
  };

  if (alerts.length === 0) {
    return (
      <div className={cn("bg-white rounded-2xl border border-slate-200 p-6", className)}>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Alerts & Attention</h3>
        <div className="flex flex-col items-center justify-center py-8 text-slate-400">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
            <Shield className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-sm font-medium text-slate-600">All Clear</p>
          <p className="text-xs text-slate-400">No urgent items requiring attention</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-2xl border border-slate-200 p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Alerts & Attention</h3>
        <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
          {alerts.length} Active
        </span>
      </div>

      <div className="space-y-3">
        {alerts.slice(0, 5).map((alert, index) => {
          const Icon = alertIcons[alert.type] || alertIcons.default;
          return (
            <div
              key={index}
              className={cn(
                "relative p-4 rounded-xl border transition-all hover:shadow-sm cursor-pointer group",
                getPriorityColor(alert.priority)
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                  getPriorityDot(alert.priority)
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">{alert.title}</p>
                  <p className="text-xs opacity-70 mt-1">{alert.description}</p>
                  {alert.dueDate && (
                    <div className="flex items-center gap-1 mt-2 text-xs opacity-60">
                      <Clock className="w-3 h-3" />
                      <span>Due {format(new Date(alert.dueDate), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          );
        })}
      </div>

      {alerts.length > 5 && (
        <Button variant="ghost" className="w-full mt-4 text-slate-600">
          View All {alerts.length} Alerts
        </Button>
      )}
    </div>
  );
}