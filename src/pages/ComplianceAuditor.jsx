import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ShieldCheck, Scan, AlertTriangle, CheckCircle, ChevronDown, ChevronRight, Loader2, FileText } from 'lucide-react';
import UnifiedComplianceHub from '@/components/compliance/UnifiedComplianceHub';
import AuditTrailViewer from '@/components/compliance/AuditTrailViewer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const severityConfig = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200',
};

const riskConfig = {
  low: { color: 'text-emerald-600', bar: 'bg-emerald-500', label: 'Low Risk' },
  medium: { color: 'text-amber-600', bar: 'bg-amber-500', label: 'Medium Risk' },
  high: { color: 'text-red-600', bar: 'bg-red-500', label: 'High Risk' },
  critical: { color: 'text-red-800', bar: 'bg-red-700', label: 'Critical Risk' },
};

function FindingRow({ finding }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border rounded-lg mb-2 overflow-hidden">
      <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50" onClick={() => setExpanded(!expanded)}>
        {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        <Badge className={cn('text-xs', severityConfig[finding.severity] || severityConfig.medium)}>{finding.severity?.toUpperCase()}</Badge>
        <span className="text-sm font-medium flex-1">{finding.description}</span>
        <span className="text-xs text-slate-400">{finding.category}</span>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-0 bg-slate-50 space-y-2 text-sm">
          <p><span className="font-medium text-slate-700">NDIS Standard:</span> {finding.ndis_standard || 'N/A'}</p>
          <p><span className="font-medium text-slate-700">Record Reference:</span> {finding.record_reference || 'N/A'}</p>
          <div className="p-2 bg-amber-50 border border-amber-200 rounded">
            <p className="font-medium text-amber-800 text-xs mb-1">Corrective Action Required</p>
            <p className="text-amber-900">{finding.corrective_action}</p>
          </div>
          {finding.timeline && <p className="text-xs text-slate-500">Timeline: {finding.timeline}</p>}
        </div>
      )}
    </div>
  );
}

export default function ComplianceAuditor() {
  const [activeTab, setActiveTab] = useState('scanner');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scopeClient, setScopeClient] = useState('');
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => base44.entities.Client.list() });
  const { data: pastScans = [] } = useQuery({ queryKey: ['complianceScans'], queryFn: () => base44.entities.ComplianceScanResult.list('-scan_date', 10) });

  const handleScan = async () => {
    setIsScanning(true);
    setScanResult(null);
    const payload = scopeClient ? { client_id: scopeClient, scan_scope: 'client_specific' } : { scan_scope: 'full' };
    const res = await base44.functions.invoke('runComplianceScan', payload);
    setScanResult(res.data);
    queryClient.invalidateQueries({ queryKey: ['complianceScans'] });
    setIsScanning(false);
  };

  const displayResult = scanResult;
  const scoreColor = displayResult?.audit_readiness_score >= 80 ? 'text-emerald-600' : displayResult?.audit_readiness_score >= 60 ? 'text-amber-600' : 'text-red-600';
  const riskCfg = riskConfig[displayResult?.risk_level] || riskConfig.medium;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-teal-600" />
            AI Compliance Auditor
          </h2>
          <p className="text-slate-500 mt-1">Proactive scan of client records, case notes & treatment plans against NDIS standards</p>
        </div>
      </div>

      <UnifiedComplianceHub />

      {/* Scan Controls */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-slate-700 mb-1 block">Scan Scope</label>
              <Select value={scopeClient} onValueChange={setScopeClient}>
                <SelectTrigger><SelectValue placeholder="Full Practice Scan (all clients)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Full Practice Scan</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleScan} disabled={isScanning} className="bg-teal-600 hover:bg-teal-700 min-w-[140px]">
              {isScanning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning...</> : <><Scan className="w-4 h-4 mr-2" />Run Audit Scan</>}
            </Button>
          </div>
          {isScanning && (
            <div className="mt-4 p-3 bg-teal-50 rounded-lg text-sm text-teal-700">
              AI is scanning records against NDIS Practice Standards, Code of Conduct, and Behaviour Support regulations. This may take 15–30 seconds.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scan Results */}
      {displayResult && (
        <div className="space-y-4">
          {/* Score Strip */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="col-span-1">
              <CardContent className="pt-5 text-center">
                <p className={cn('text-4xl font-black', scoreColor)}>{displayResult.audit_readiness_score}</p>
                <p className="text-xs text-slate-500 mt-1">Audit Readiness Score</p>
                <Progress value={displayResult.audit_readiness_score} className="mt-2 h-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 text-center">
                <p className={cn('text-3xl font-bold', riskCfg.color)}>{riskCfg.label}</p>
                <p className="text-xs text-slate-500 mt-1">Overall Risk Level</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 text-center">
                <p className="text-3xl font-bold text-red-600">{displayResult.issues_found || 0}</p>
                <p className="text-xs text-slate-500 mt-1">Issues Identified</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 text-center">
                <p className="text-3xl font-bold text-blue-600">{displayResult.corrective_actions?.length || 0}</p>
                <p className="text-xs text-slate-500 mt-1">Corrective Actions</p>
              </CardContent>
            </Card>
          </div>

          {/* Executive Summary */}
          {displayResult.executive_summary && (
            <Card className="border-l-4 border-l-teal-500">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs font-semibold text-teal-700 mb-1 uppercase tracking-wide">Executive Summary</p>
                <p className="text-sm text-slate-700">{displayResult.executive_summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Findings */}
          {displayResult.findings?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" />Compliance Findings ({displayResult.findings.length})</CardTitle></CardHeader>
              <CardContent>
                {displayResult.findings.sort((a, b) => {
                  const order = { critical: 0, high: 1, medium: 2, low: 3 };
                  return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
                }).map((f, i) => <FindingRow key={i} finding={f} />)}
              </CardContent>
            </Card>
          )}

          {/* Corrective Actions */}
          {displayResult.corrective_actions?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4 text-teal-500" />Corrective Action Plan</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {displayResult.corrective_actions.map((action, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
                      <Badge className="bg-slate-100 text-slate-700 text-xs shrink-0">{action.priority?.toUpperCase() || 'P' + (i + 1)}</Badge>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">{action.action}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Responsible: {action.responsible_party} • Deadline: {action.deadline}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Past Scans */}
      {pastScans.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" />Previous Scan History</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium text-slate-600">Date</th>
                  <th className="text-left p-3 font-medium text-slate-600">Scope</th>
                  <th className="text-left p-3 font-medium text-slate-600">Score</th>
                  <th className="text-left p-3 font-medium text-slate-600">Risk</th>
                  <th className="text-left p-3 font-medium text-slate-600">Issues</th>
                  <th className="text-left p-3 font-medium text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {pastScans.map(scan => {
                  const rc = riskConfig[scan.risk_level] || riskConfig.medium;
                  return (
                    <tr key={scan.id} className="border-b hover:bg-slate-50">
                      <td className="p-3">{scan.scan_date ? format(new Date(scan.scan_date), 'dd MMM yyyy HH:mm') : '-'}</td>
                      <td className="p-3 capitalize">{scan.client_name || scan.scan_scope?.replace(/_/g, ' ')}</td>
                      <td className="p-3 font-bold">{scan.audit_readiness_score ?? '-'}/100</td>
                      <td className={cn('p-3 font-medium', rc.color)}>{rc.label}</td>
                      <td className="p-3">{scan.issues_found ?? 0}</td>
                      <td className="p-3"><Badge className="bg-amber-100 text-amber-700 capitalize">{scan.status?.replace(/_/g, ' ')}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}