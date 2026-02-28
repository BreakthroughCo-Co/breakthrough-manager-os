import React from 'react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { X, AlertTriangle, Clock, User, MapPin, FileText, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const statusConfig = {
  reported:            { label: 'Reported',            color: 'bg-yellow-100 text-yellow-700' },
  under_investigation: { label: 'Under Investigation', color: 'bg-blue-100 text-blue-700' },
  action_required:     { label: 'Action Required',     color: 'bg-red-100 text-red-700' },
  resolved:            { label: 'Resolved',            color: 'bg-emerald-100 text-emerald-700' },
  closed:              { label: 'Closed',              color: 'bg-slate-100 text-slate-600' },
};

const severityConfig = {
  critical:             { label: 'Critical',          color: 'bg-red-100 text-red-700 border-red-200' },
  serious_injury:       { label: 'Serious Injury',    color: 'bg-orange-100 text-orange-700 border-orange-200' },
  safeguarding_concern: { label: 'Safeguarding',      color: 'bg-amber-100 text-amber-700 border-amber-200' },
  non_compliance:       { label: 'Non-Compliance',    color: 'bg-purple-100 text-purple-700 border-purple-200' },
  operational_issue:    { label: 'Operational',       color: 'bg-blue-100 text-blue-700 border-blue-200' },
  other:                { label: 'Other',             color: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export default function IncidentDetailPanel({ incident, onClose, onStatusChange, isDark }) {
  if (!incident) return null;

  return (
    <div className={cn(
      "rounded-xl border p-6 space-y-5",
      isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
    )}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-lg">{incident.client_name || 'Unknown Client'}</h3>
          <p className={cn("text-sm mt-0.5", isDark ? "text-slate-400" : "text-slate-500")}>
            {incident.incident_date ? format(parseISO(incident.incident_date), 'EEEE d MMMM yyyy, HH:mm') : '—'}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge className={cn("border text-xs", severityConfig[incident.severity]?.color || 'bg-slate-100')}>
          {severityConfig[incident.severity]?.label || incident.severity}
        </Badge>
        <Badge className={cn("text-xs", statusConfig[incident.status]?.color || 'bg-slate-100')}>
          {statusConfig[incident.status]?.label || incident.status}
        </Badge>
        {incident.incident_type && (
          <Badge variant="outline" className="text-xs capitalize">{incident.incident_type.replace(/_/g,' ')}</Badge>
        )}
        {incident.recurrence_risk && (
          <Badge className={cn("text-xs",
            incident.recurrence_risk === 'high' ? 'bg-red-100 text-red-700' :
            incident.recurrence_risk === 'medium' ? 'bg-amber-100 text-amber-700' :
            'bg-emerald-100 text-emerald-700'
          )}>
            Recurrence: {incident.recurrence_risk}
          </Badge>
        )}
      </div>

      {/* Description */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">Description</p>
        <p className={cn("text-sm leading-relaxed", isDark ? "text-slate-300" : "text-slate-700")}>
          {incident.description || '—'}
        </p>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {incident.location && (
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span className={isDark ? "text-slate-300" : "text-slate-600"}>{incident.location}</span>
          </div>
        )}
        {incident.reported_by && (
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span className={isDark ? "text-slate-300" : "text-slate-600"}>{incident.reported_by}</span>
          </div>
        )}
        {incident.risk_score !== undefined && (
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
            <span className={isDark ? "text-slate-300" : "text-slate-600"}>Risk Score: <strong>{incident.risk_score}/100</strong></span>
          </div>
        )}
        {incident.assigned_to && (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
            <span className={isDark ? "text-slate-300" : "text-slate-600"}>Assigned: {incident.assigned_to}</span>
          </div>
        )}
      </div>

      {/* Root Cause */}
      {incident.root_cause && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">Root Cause</p>
          <p className={cn("text-sm", isDark ? "text-slate-300" : "text-slate-700")}>{incident.root_cause}</p>
        </div>
      )}

      {/* Contributing Factors */}
      {incident.contributing_factors?.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-2">Contributing Factors</p>
          <ul className="space-y-1">
            {incident.contributing_factors.map((f, i) => (
              <li key={i} className={cn("text-sm flex items-start gap-2", isDark ? "text-slate-300" : "text-slate-700")}>
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Preventative Measures */}
      {incident.preventative_measures?.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-2">Preventative Measures</p>
          <ul className="space-y-1">
            {incident.preventative_measures.map((m, i) => (
              <li key={i} className={cn("text-sm flex items-start gap-2", isDark ? "text-slate-300" : "text-slate-700")}>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Update Status */}
      <div className={cn("pt-4 border-t", isDark ? "border-slate-700" : "border-slate-200")}>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-2">Update Status</p>
        <div className="flex flex-wrap gap-2">
          {['reported','under_investigation','action_required','resolved','closed'].map(s => (
            <Button
              key={s}
              size="sm"
              variant={incident.status === s ? 'default' : 'outline'}
              className={cn("text-xs h-7", incident.status === s && "bg-teal-600 hover:bg-teal-700")}
              onClick={() => onStatusChange(incident.id, s)}
            >
              {statusConfig[s]?.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}