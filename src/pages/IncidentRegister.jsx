import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, differenceInHours, differenceInDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeContext';
import {
  AlertTriangle, Clock, CheckCircle2, Search, Filter,
  ChevronDown, ChevronUp, Eye, MoreHorizontal, FileText, Calendar
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import IncidentDetailPanel from '@/components/incidents/IncidentDetailPanel';

const severityConfig = {
  critical:             { label: 'Critical',             color: 'bg-red-100 text-red-700 border-red-200' },
  serious_injury:       { label: 'Serious Injury',        color: 'bg-orange-100 text-orange-700 border-orange-200' },
  safeguarding_concern: { label: 'Safeguarding',          color: 'bg-amber-100 text-amber-700 border-amber-200' },
  non_compliance:       { label: 'Non-Compliance',        color: 'bg-purple-100 text-purple-700 border-purple-200' },
  operational_issue:    { label: 'Operational',           color: 'bg-blue-100 text-blue-700 border-blue-200' },
  other:                { label: 'Other',                 color: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const statusConfig = {
  reported:             { label: 'Reported',              color: 'bg-yellow-100 text-yellow-700' },
  under_investigation:  { label: 'Under Investigation',   color: 'bg-blue-100 text-blue-700' },
  action_required:      { label: 'Action Required',       color: 'bg-red-100 text-red-700' },
  resolved:             { label: 'Resolved',              color: 'bg-emerald-100 text-emerald-700' },
  closed:               { label: 'Closed',                color: 'bg-slate-100 text-slate-600' },
};

const NDIS_24H_TYPES = ['critical', 'serious_injury', 'safeguarding_concern'];

function DeadlineCell({ incident }) {
  if (!incident.incident_date) return null;
  const incidentTime = parseISO(incident.incident_date);
  const now = new Date();
  const hoursElapsed = differenceInHours(now, incidentTime);
  const daysElapsed = differenceInDays(now, incidentTime);

  const isNDIS24h = NDIS_24H_TYPES.includes(incident.severity);
  const is24hBreached = isNDIS24h && hoursElapsed > 24;
  const is24hWarning = isNDIS24h && hoursElapsed > 18 && hoursElapsed <= 24;
  const is5dBreached = daysElapsed > 5 && incident.status !== 'resolved' && incident.status !== 'closed';
  const is5dWarning = daysElapsed > 3 && daysElapsed <= 5 && incident.status !== 'resolved' && incident.status !== 'closed';

  return (
    <div className="space-y-1 text-xs">
      {isNDIS24h && (
        <div className={cn(
          "flex items-center gap-1 px-1.5 py-0.5 rounded font-medium",
          is24hBreached ? "bg-red-100 text-red-700" :
          is24hWarning ? "bg-amber-100 text-amber-700" :
          "bg-slate-100 text-slate-500"
        )}>
          <Clock className="w-3 h-3" />
          24h: {is24hBreached ? 'OVERDUE' : `${Math.max(0, 24 - hoursElapsed).toFixed(0)}h left`}
        </div>
      )}
      {incident.status !== 'resolved' && incident.status !== 'closed' && (
        <div className={cn(
          "flex items-center gap-1 px-1.5 py-0.5 rounded font-medium",
          is5dBreached ? "bg-red-100 text-red-700" :
          is5dWarning ? "bg-amber-100 text-amber-700" :
          "bg-slate-100 text-slate-500"
        )}>
          <FileText className="w-3 h-3" />
          5-day: {is5dBreached ? 'OVERDUE' : `${Math.max(0, 5 - daysElapsed)}d left`}
        </div>
      )}
    </div>
  );
}

export default function IncidentRegister() {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortField, setSortField] = useState('incident_date');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedIncident, setSelectedIncident] = useState(null);

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => base44.entities.Incident.list('-incident_date', 200),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Incident.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      if (selectedIncident) {
        setSelectedIncident(prev => ({ ...prev, ...updateMutation.variables?.data }));
      }
    },
  });

  const filtered = useMemo(() => {
    return incidents
      .filter(i => {
        const matchSearch = !search ||
          i.client_name?.toLowerCase().includes(search.toLowerCase()) ||
          i.description?.toLowerCase().includes(search.toLowerCase()) ||
          i.location?.toLowerCase().includes(search.toLowerCase());
        const matchSeverity = severityFilter === 'all' || i.severity === severityFilter;
        const matchStatus = statusFilter === 'all' || i.status === statusFilter;
        const matchType = typeFilter === 'all' || i.incident_type === typeFilter;
        return matchSearch && matchSeverity && matchStatus && matchType;
      })
      .sort((a, b) => {
        let aVal = a[sortField] ?? '';
        let bVal = b[sortField] ?? '';
        if (sortField === 'incident_date') {
          aVal = new Date(aVal);
          bVal = new Date(bVal);
        }
        return sortDir === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
      });
  }, [incidents, search, severityFilter, statusFilter, typeFilter, sortField, sortDir]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }) => sortField === field
    ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
    : <ChevronDown className="w-3 h-3 opacity-30" />;

  // Summary counts
  const openCount = incidents.filter(i => !['resolved','closed'].includes(i.status)).length;
  const criticalCount = incidents.filter(i => i.severity === 'critical' || i.severity === 'serious_injury').length;
  const overdueCount = incidents.filter(i => {
    if (!i.incident_date) return false;
    const h = differenceInHours(new Date(), parseISO(i.incident_date));
    if (NDIS_24H_TYPES.includes(i.severity) && h > 24 && !['resolved','closed'].includes(i.status)) return true;
    if (differenceInDays(new Date(), parseISO(i.incident_date)) > 5 && !['resolved','closed'].includes(i.status)) return true;
    return false;
  }).length;

  return (
    <div className={cn("space-y-6", isDark ? "text-slate-50" : "text-slate-900")}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Incident Register</h2>
        <p className={cn("mt-1 text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
          NDIS reportable incident tracking with 24-hour and 5-day deadline monitoring
        </p>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Incidents', value: incidents.length, color: 'text-slate-700' },
          { label: 'Open', value: openCount, color: 'text-blue-600' },
          { label: 'Critical / Serious', value: criticalCount, color: 'text-red-600' },
          { label: 'Deadline Overdue', value: overdueCount, color: overdueCount > 0 ? 'text-red-600' : 'text-slate-500' },
        ].map(s => (
          <div key={s.label} className={cn(
            "rounded-xl border p-4",
            isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
          )}>
            <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
            <p className={cn("text-xs mt-0.5", isDark ? "text-slate-400" : "text-slate-500")}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className={cn(
        "flex flex-wrap items-center gap-3 p-3 rounded-xl border",
        isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
      )}>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search client, description, location..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-40 h-8 text-sm"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="serious_injury">Serious Injury</SelectItem>
            <SelectItem value="safeguarding_concern">Safeguarding</SelectItem>
            <SelectItem value="non_compliance">Non-Compliance</SelectItem>
            <SelectItem value="operational_issue">Operational</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-8 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="reported">Reported</SelectItem>
            <SelectItem value="under_investigation">Under Investigation</SelectItem>
            <SelectItem value="action_required">Action Required</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40 h-8 text-sm"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="behaviour">Behaviour</SelectItem>
            <SelectItem value="injury">Injury</SelectItem>
            <SelectItem value="safeguarding">Safeguarding</SelectItem>
            <SelectItem value="medication">Medication</SelectItem>
            <SelectItem value="equipment_failure">Equipment Failure</SelectItem>
            <SelectItem value="documentation">Documentation</SelectItem>
            <SelectItem value="compliance_breach">Compliance Breach</SelectItem>
            <SelectItem value="communication">Communication</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <span className={cn("text-xs ml-auto", isDark ? "text-slate-400" : "text-slate-500")}>
          {filtered.length} of {incidents.length}
        </span>
      </div>

      {/* Table */}
      <div className={cn(
        "rounded-xl border overflow-hidden",
        isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
      )}>
        <Table>
          <TableHeader>
            <TableRow className={isDark ? "bg-slate-900 border-slate-700" : "bg-slate-50"}>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('incident_date')}>
                <span className="flex items-center gap-1">Date <SortIcon field="incident_date" /></span>
              </TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('severity')}>
                <span className="flex items-center gap-1">Severity <SortIcon field="severity" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('status')}>
                <span className="flex items-center gap-1">Status <SortIcon field="status" /></span>
              </TableHead>
              <TableHead>NDIS Deadlines</TableHead>
              <TableHead>Risk Score</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(incident => (
              <TableRow
                key={incident.id}
                className={cn(
                  "cursor-pointer",
                  isDark ? "hover:bg-slate-700 border-slate-700" : "hover:bg-slate-50",
                  selectedIncident?.id === incident.id && (isDark ? "bg-slate-700" : "bg-teal-50")
                )}
                onClick={() => setSelectedIncident(incident)}
              >
                <TableCell className="text-sm whitespace-nowrap">
                  {incident.incident_date
                    ? format(parseISO(incident.incident_date), 'dd MMM yyyy HH:mm')
                    : '—'}
                </TableCell>
                <TableCell>
                  <p className="font-medium text-sm">{incident.client_name || '—'}</p>
                  {incident.location && <p className="text-xs text-slate-500">{incident.location}</p>}
                </TableCell>
                <TableCell>
                  <span className="text-xs capitalize">{incident.incident_type?.replace(/_/g, ' ') || '—'}</span>
                </TableCell>
                <TableCell>
                  <Badge className={cn("text-xs border", severityConfig[incident.severity]?.color || 'bg-slate-100 text-slate-600')}>
                    {severityConfig[incident.severity]?.label || incident.severity || '—'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={cn("text-xs", statusConfig[incident.status]?.color || 'bg-slate-100 text-slate-600')}>
                    {statusConfig[incident.status]?.label || incident.status || '—'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DeadlineCell incident={incident} />
                </TableCell>
                <TableCell>
                  {incident.risk_score !== undefined ? (
                    <span className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded",
                      incident.risk_score >= 70 ? "bg-red-100 text-red-700" :
                      incident.risk_score >= 40 ? "bg-amber-100 text-amber-700" :
                      "bg-emerald-100 text-emerald-700"
                    )}>{incident.risk_score}</span>
                  ) : <span className="text-xs text-slate-400">—</span>}
                </TableCell>
                <TableCell onClick={e => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {['reported','under_investigation','action_required','resolved','closed'].map(s => (
                        <DropdownMenuItem
                          key={s}
                          onClick={() => updateMutation.mutate({ id: incident.id, data: { status: s } })}
                          className={incident.status === s ? 'font-semibold' : ''}
                        >
                          {statusConfig[s]?.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length === 0 && !isLoading && (
          <div className="py-16 text-center">
            <AlertTriangle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className={cn("text-sm", isDark ? "text-slate-400" : "text-slate-500")}>No incidents match the current filters</p>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedIncident && (
        <IncidentDetailPanel
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onStatusChange={(id, status) => updateMutation.mutate({ id, data: { status } })}
          isDark={isDark}
        />
      )}
    </div>
  );
}