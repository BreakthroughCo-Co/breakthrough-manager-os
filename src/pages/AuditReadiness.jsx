import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { differenceInDays, isBefore, format } from 'date-fns';
import { Shield, CheckCircle, AlertTriangle, XCircle, RefreshCw, Loader2, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

function ScoreDomain({ label, score, max, issues }) {
  const pct = Math.round((score / max) * 100);
  const color = pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600';
  const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className={cn("font-bold", color)}>{pct}%</span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${pct}%` }} />
      </div>
      {issues.length > 0 && (
        <ul className="text-xs text-muted-foreground pl-2 space-y-0.5">
          {issues.slice(0, 3).map((issue, i) => <li key={i}>• {issue}</li>)}
          {issues.length > 3 && <li className="text-amber-600">+{issues.length - 3} more</li>}
        </ul>
      )}
    </div>
  );
}

export default function AuditReadiness() {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: clients = [] } = useQuery({ queryKey: ['clients-audit', refreshKey], queryFn: () => base44.entities.Client.list() });
  const { data: compliance = [] } = useQuery({ queryKey: ['compliance-audit', refreshKey], queryFn: () => base44.entities.ComplianceItem.list() });
  const { data: screenings = [] } = useQuery({ queryKey: ['screenings-audit', refreshKey], queryFn: () => base44.entities.WorkerScreening.list() });
  const { data: restrictive = [] } = useQuery({ queryKey: ['rp-audit', refreshKey], queryFn: () => base44.entities.RestrictivePractice.list() });
  const { data: bsps = [] } = useQuery({ queryKey: ['bsps-audit', refreshKey], queryFn: () => base44.entities.BehaviourSupportPlan.list() });
  const { data: caseNotes = [] } = useQuery({ queryKey: ['casenotes-audit', refreshKey], queryFn: () => base44.entities.CaseNote.list() });
  const { data: practitioners = [] } = useQuery({ queryKey: ['practitioners-audit', refreshKey], queryFn: () => base44.entities.Practitioner.list() });

  // --- Scoring ---
  const complianceIssues = compliance.filter(c => c.status === 'non_compliant' || c.status === 'attention_needed');
  const complianceCritical = compliance.filter(c => c.status === 'non_compliant' && c.priority === 'critical');
  const complianceScore = Math.max(0, 10 - complianceCritical.length * 3 - complianceIssues.length);
  const complianceMax = 10;

  const expiredScreenings = screenings.filter(s => s.expiry_date && differenceInDays(new Date(s.expiry_date), new Date()) < 0);
  const expiringScreenings = screenings.filter(s => s.expiry_date && differenceInDays(new Date(s.expiry_date), new Date()) <= 30 && differenceInDays(new Date(s.expiry_date), new Date()) >= 0);
  const screeningScore = Math.max(0, 10 - expiredScreenings.length * 2 - expiringScreenings.length);
  const screeningMax = 10;

  const unauthorisedRPs = restrictive.filter(r => r.authorisation_status === 'unauthorised');
  const expiringRPs = restrictive.filter(r => r.expiry_date && differenceInDays(new Date(r.expiry_date), new Date()) <= 14 && differenceInDays(new Date(r.expiry_date), new Date()) >= 0);
  const unnotifiedRPs = restrictive.filter(r => !r.ndis_notified);
  const rpScore = Math.max(0, 10 - unauthorisedRPs.length * 3 - expiringRPs.length * 2 - unnotifiedRPs.length);
  const rpMax = 10;

  const activeBSPs = bsps.filter(b => b.status === 'active' || b.status === 'approved');
  const activeClients = clients.filter(c => c.status === 'active');
  const clientsWithBSP = activeClients.filter(c => bsps.some(b => b.client_id === c.id));
  const docScore = activeClients.length > 0 ? Math.round((clientsWithBSP.length / activeClients.length) * 10) : 10;
  const docMax = 10;

  const totalScore = complianceScore + screeningScore + rpScore + docScore;
  const totalMax = complianceMax + screeningMax + rpMax + docMax;
  const overallPct = Math.round((totalScore / totalMax) * 100);

  const overallColor = overallPct >= 80 ? 'text-emerald-600' : overallPct >= 60 ? 'text-amber-600' : 'text-red-600';
  const overallLabel = overallPct >= 80 ? 'Audit Ready' : overallPct >= 60 ? 'Attention Required' : 'Action Required';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-teal-600" />
            Audit Readiness Score
          </h2>
          <p className="text-muted-foreground">Rolling compliance health across all domains — as of {format(new Date(), 'd MMM yyyy')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overall Score */}
      <Card className={cn(
        "border-2",
        overallPct >= 80 ? "border-emerald-400 bg-emerald-50" : overallPct >= 60 ? "border-amber-400 bg-amber-50" : "border-red-400 bg-red-50"
      )}>
        <CardContent className="pt-6 pb-5 flex items-center gap-6">
          <div className="text-center">
            <p className={cn("text-6xl font-black", overallColor)}>{overallPct}</p>
            <p className="text-sm font-medium text-muted-foreground">/ 100</p>
          </div>
          <div className="flex-1">
            <p className={cn("text-xl font-bold mb-1", overallColor)}>{overallLabel}</p>
            <Progress value={overallPct} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">Score calculated across compliance, worker screening, restrictive practices, and clinical documentation</p>
          </div>
        </CardContent>
      </Card>

      {/* Domain Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Compliance Items</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreDomain
              label="Compliance Status"
              score={complianceScore}
              max={complianceMax}
              issues={[
                ...complianceCritical.map(c => `CRITICAL: ${c.title}`),
                ...complianceIssues.filter(c => c.priority !== 'critical').map(c => c.title)
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Worker Screening</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreDomain
              label="Screening Compliance"
              score={screeningScore}
              max={screeningMax}
              issues={[
                ...expiredScreenings.map(s => `EXPIRED: ${s.staff_name} — ${s.screening_type?.replace(/_/g, ' ')}`),
                ...expiringScreenings.map(s => `Expiring: ${s.staff_name} — ${s.screening_type?.replace(/_/g, ' ')}`)
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Restrictive Practices</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreDomain
              label="RP Authorisation"
              score={rpScore}
              max={rpMax}
              issues={[
                ...unauthorisedRPs.map(r => `UNAUTHORISED: ${r.client_name} — ${r.practice_type?.replace(/_/g, ' ')}`),
                ...unnotifiedRPs.filter(r => r.authorisation_status === 'authorised').map(r => `NDIS Not Notified: ${r.client_name}`),
                ...expiringRPs.map(r => `Expiring Soon: ${r.client_name}`)
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Clinical Documentation</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreDomain
              label="BSP Coverage"
              score={docScore}
              max={docMax}
              issues={activeClients
                .filter(c => !bsps.some(b => b.client_id === c.id))
                .map(c => `No active BSP: ${c.full_name}`)
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}