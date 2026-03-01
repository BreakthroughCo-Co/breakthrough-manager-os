import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { differenceInDays, format } from 'date-fns';
import { Shield, AlertTriangle, CheckCircle, Clock, TrendingUp, Users, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

function scoreColor(s) {
  if (s >= 80) return 'text-emerald-600';
  if (s >= 60) return 'text-amber-600';
  return 'text-red-600';
}

export default function UnifiedComplianceHub() {
  const { data: complianceItems = [] } = useQuery({ queryKey: ['complianceItems'], queryFn: () => base44.entities.ComplianceItem.list() });
  const { data: scanResults = [] } = useQuery({ queryKey: ['complianceScans'], queryFn: () => base44.entities.ComplianceScanResult.list('-scan_date', 5) });
  const { data: credentials = [] } = useQuery({ queryKey: ['practitionerCredentials'], queryFn: () => base44.entities.PractitionerCredential.list() });
  const { data: trainingRecords = [] } = useQuery({ queryKey: ['trainingRecords'], queryFn: () => base44.entities.TrainingRecord.list() });

  const auditScore = useMemo(() => {
    const latestScan = scanResults[0];
    const scanScore = latestScan?.audit_readiness_score ?? 100;

    const totalItems = complianceItems.length || 1;
    const compliantItems = complianceItems.filter(i => i.status === 'compliant').length;
    const itemScore = Math.round((compliantItems / totalItems) * 100);

    const totalCreds = credentials.length || 1;
    const activeCreds = credentials.filter(c => c.status === 'active').length;
    const credScore = Math.round((activeCreds / totalCreds) * 100);

    const totalTraining = trainingRecords.filter(t => t.is_mandatory).length || 1;
    const currentTraining = trainingRecords.filter(t => t.is_mandatory && t.status === 'current').length;
    const trainingScore = Math.round((currentTraining / totalTraining) * 100);

    return Math.round((scanScore * 0.4) + (itemScore * 0.2) + (credScore * 0.2) + (trainingScore * 0.2));
  }, [scanResults, complianceItems, credentials, trainingRecords]);

  const criticalAlerts = useMemo(() => {
    const alerts = [];
    complianceItems.filter(i => i.status === 'non_compliant' || i.status === 'attention_needed').forEach(i => {
      alerts.push({ type: 'compliance', severity: i.status === 'non_compliant' ? 'critical' : 'high', label: i.title, detail: i.category });
    });
    credentials.filter(c => c.status === 'expired' || c.status === 'expiring_soon').forEach(c => {
      const days = c.expiry_date ? differenceInDays(new Date(c.expiry_date), new Date()) : -1;
      alerts.push({ type: 'credential', severity: days < 0 ? 'critical' : 'high', label: c.credential_name || c.credential_type, detail: c.practitioner_name });
    });
    trainingRecords.filter(t => t.is_mandatory && (t.status === 'expired' || t.status === 'not_completed')).forEach(t => {
      alerts.push({ type: 'training', severity: t.status === 'expired' ? 'critical' : 'high', label: t.module_name, detail: t.practitioner_name });
    });
    return alerts.sort((a, b) => (a.severity === 'critical' ? -1 : 1));
  }, [complianceItems, credentials, trainingRecords]);

  const latestScan = scanResults[0];

  const severityBadge = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-amber-100 text-amber-800',
  };

  const typeIcon = {
    compliance: <Shield className="w-3 h-3" />,
    credential: <Users className="w-3 h-3" />,
    training: <FileText className="w-3 h-3" />,
  };

  return (
    <div className="space-y-4">
      {/* Composite Audit Readiness Score */}
      <Card className="border-l-4 border-l-teal-500">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-6">
            <div className="text-center min-w-[80px]">
              <p className={cn('text-4xl font-black', scoreColor(auditScore))}>{auditScore}</p>
              <p className="text-xs text-slate-500 mt-0.5">Audit Readiness</p>
              <Progress value={auditScore} className="mt-1 h-1.5" />
            </div>
            <div className="grid grid-cols-4 gap-4 flex-1 text-center text-xs">
              <div>
                <p className="text-slate-400 uppercase tracking-wide mb-1">Non-Compliant</p>
                <p className="text-xl font-bold text-red-600">{complianceItems.filter(i => i.status === 'non_compliant').length}</p>
              </div>
              <div>
                <p className="text-slate-400 uppercase tracking-wide mb-1">Cred. Alerts</p>
                <p className="text-xl font-bold text-amber-600">{credentials.filter(c => c.status !== 'active').length}</p>
              </div>
              <div>
                <p className="text-slate-400 uppercase tracking-wide mb-1">Training Gaps</p>
                <p className="text-xl font-bold text-orange-600">{trainingRecords.filter(t => t.is_mandatory && t.status !== 'current').length}</p>
              </div>
              <div>
                <p className="text-slate-400 uppercase tracking-wide mb-1">Last Scan Score</p>
                <p className={cn('text-xl font-bold', scoreColor(latestScan?.audit_readiness_score ?? 0))}>{latestScan?.audit_readiness_score ?? '—'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Alerts Feed */}
      {criticalAlerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Active Compliance Alerts ({criticalAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {criticalAlerts.slice(0, 8).map((alert, i) => (
              <div key={i} className="flex items-center gap-3 p-2 border rounded-lg">
                <Badge className={cn('text-xs', severityBadge[alert.severity])}>{alert.severity.toUpperCase()}</Badge>
                <span className="text-slate-400">{typeIcon[alert.type]}</span>
                <span className="text-sm font-medium flex-1">{alert.label}</span>
                <span className="text-xs text-slate-400">{alert.detail}</span>
              </div>
            ))}
            {criticalAlerts.length > 8 && (
              <p className="text-xs text-slate-400 text-center">+{criticalAlerts.length - 8} more alerts</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Last Scan Summary */}
      {latestScan && (
        <Card className="bg-slate-50">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <TrendingUp className="w-3 h-3" />
              <span>Last AI scan: {latestScan.scan_date ? format(new Date(latestScan.scan_date), 'dd MMM yyyy HH:mm') : '—'}</span>
              <span>·</span>
              <span>{latestScan.issues_found ?? 0} issues · Score {latestScan.audit_readiness_score}/100</span>
              <Badge className={cn('text-xs', latestScan.risk_level === 'critical' || latestScan.risk_level === 'high' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700')}>
                {latestScan.risk_level?.toUpperCase()} RISK
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}