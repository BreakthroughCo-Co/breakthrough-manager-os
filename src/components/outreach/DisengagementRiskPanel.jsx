import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertTriangle, Mail, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const statusConfig = {
  pending:    { label: 'Pending',    color: 'bg-amber-100 text-amber-700',   icon: Clock },
  sent:       { label: 'Sent',       color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  failed:     { label: 'Failed',     color: 'bg-red-100 text-red-700',       icon: XCircle },
  suppressed: { label: 'Suppressed', color: 'bg-slate-100 text-slate-600',   icon: Clock },
};

function riskColor(score) {
  if (score >= 65) return 'text-red-600 font-bold';
  if (score >= 35) return 'text-amber-600 font-semibold';
  return 'text-emerald-600';
}

export default function DisengagementRiskPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const queryClient = useQueryClient();

  const { data: outreachLogs = [], isLoading } = useQuery({
    queryKey: ['scheduledOutreach'],
    queryFn: () => base44.entities.ScheduledOutreach.list('-created_date', 100)
  });

  const handleRun = async () => {
    setIsRunning(true);
    setRunResult(null);
    const res = await base44.functions.invoke('predictClientDisengagementRisk', {});
    setRunResult(res.data);
    setIsRunning(false);
    queryClient.invalidateQueries({ queryKey: ['scheduledOutreach'] });
  };

  const filtered = filterStatus === 'all'
    ? outreachLogs
    : outreachLogs.filter(l => l.status === filterStatus);

  return (
    <div className="space-y-5">
      {/* Trigger panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Client Disengagement Risk Engine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              onClick={handleRun}
              disabled={isRunning}
            >
              {isRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              {isRunning ? 'Analysing all active clients...' : 'Run Disengagement Scan'}
            </Button>
            <p className="text-xs text-slate-500">Analyses case note frequency, funding risk, and sentiment across all active clients. Triggers personalised outreach via Gmail for risk score ≥35.</p>
          </div>
          {runResult && (
            <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm space-y-2">
              <p className="font-medium">Scan Complete</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div><p className="text-2xl font-bold text-slate-700">{runResult.clients_analysed}</p><p className="text-xs text-slate-500">Analysed</p></div>
                <div><p className="text-2xl font-bold text-amber-600">{runResult.outreach_triggered}</p><p className="text-xs text-slate-500">Outreach Triggered</p></div>
                <div><p className="text-2xl font-bold text-red-600">{runResult.high_risk?.length || 0}</p><p className="text-xs text-slate-500">High Risk (≥65)</p></div>
              </div>
              {runResult.high_risk?.length > 0 && (
                <div className="mt-2 space-y-1">
                  {runResult.high_risk.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-xs p-2 bg-red-50 rounded">
                      <span className="font-medium">{r.client}</span>
                      <span className="text-red-600 font-bold">{r.score}/100</span>
                      <span className="text-slate-500">{r.factors?.join(' · ')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Outreach log */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Mail className="w-4 h-4" />Outreach Activity Log
            </CardTitle>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(statusConfig).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-teal-600" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent At</TableHead>
                  <TableHead>Key Factors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(log => {
                  const cfg = statusConfig[log.status] || statusConfig.pending;
                  const Icon = cfg.icon;
                  const factors = (() => { try { return JSON.parse(log.risk_factors || '[]'); } catch { return []; } })();
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium text-sm">{log.client_name}</TableCell>
                      <TableCell><span className={cn('text-sm', riskColor(log.risk_score))}>{log.risk_score}/100</span></TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{log.trigger_reason?.replace(/_/g, ' ')}</Badge></TableCell>
                      <TableCell className="capitalize text-xs">{log.outreach_type}</TableCell>
                      <TableCell>
                        <Badge className={cn('gap-1 text-xs', cfg.color)}>
                          <Icon className="w-3 h-3" />{cfg.label}
                        </Badge>
                        {log.failure_reason && <p className="text-xs text-red-500 mt-0.5">{log.failure_reason}</p>}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {log.sent_at ? format(new Date(log.sent_at), 'dd MMM yy HH:mm') : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 max-w-48">
                        {factors.slice(0, 2).join(' · ')}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="py-10 text-center text-slate-400 text-sm">No outreach activity recorded.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}