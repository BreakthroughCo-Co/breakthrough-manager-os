import React from 'react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import {
  UserPlus,
  FileCheck,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Edit
} from 'lucide-react';

const activityIcons = {
  client_added: UserPlus,
  billing_submitted: DollarSign,
  compliance_updated: FileCheck,
  alert_created: AlertTriangle,
  task_completed: CheckCircle,
  record_updated: Edit,
  default: Clock
};

const activityColors = {
  client_added: 'bg-teal-100 text-teal-600',
  billing_submitted: 'bg-purple-100 text-purple-600',
  compliance_updated: 'bg-blue-100 text-blue-600',
  alert_created: 'bg-amber-100 text-amber-600',
  task_completed: 'bg-emerald-100 text-emerald-600',
  record_updated: 'bg-slate-100 text-slate-600',
  default: 'bg-slate-100 text-slate-600'
};

export default function RecentActivity({ activities = [], className }) {
  if (activities.length === 0) {
    return (
      <div className={cn("bg-white rounded-2xl border border-slate-200 p-6", className)}>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h3>
        <div className="flex flex-col items-center justify-center py-8 text-slate-400">
          <Clock className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">No recent activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-2xl border border-slate-200 p-6", className)}>
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {activities.slice(0, 8).map((activity, index) => {
          const Icon = activityIcons[activity.type] || activityIcons.default;
          const colorClass = activityColors[activity.type] || activityColors.default;
          
          return (
            <div key={index} className="flex items-start gap-3">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", colorClass)}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 leading-tight">{activity.description}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}