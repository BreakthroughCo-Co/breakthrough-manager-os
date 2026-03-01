import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, differenceInWeeks } from 'date-fns';
import { TrendingDown, TrendingUp, Minus, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const riskConfig = {
  on_track: { color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', badge: 'bg-emerald-100 text-emerald-800', icon: TrendingUp },
  under_utilised: { color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-800', icon: Minus },
  over_utilised: { color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-800', icon: TrendingDown },
  critical: { color: 'text-red-600', bg: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-800', icon: AlertTriangle },
};

export default function FundingForecastPanel({ clientId, client }) {
  const [generating, setGenerating] = useState(false);
  const [queryClient] = useState(() => {
    const { QueryClient } = require('@tanstack/react-query');
    return new QueryClient();
  });

  const { data: reports = [], refetch } = useQuery({
    queryKey: ['fundingReport', clientId],
    queryFn: () => base44.entities.FundingUtilisationReport.filter({ client_id: clientId }, '-report_date', 1),
    enabled: !!clientId
  });

  const report = reports[0];
  const rc = riskConfig[report?.risk_level] || riskConfig.on_track;
  const Icon = rc.icon;

  const utilisationPct = report?.utilisation_percentage ?? (
    client?.funding_allocated > 0
      ? Math.round(((client.funding_utilised || 0) / client.funding_allocated) * 100)
      : 0
  );

  const handleGenerate = async () => {
    setGenerating(true);
    await base44.functions.invoke('generateFundingUtilisationReport', { client_id: clientId });
    refetch();
    setGenerating(false);
  };

  if (!client?.funding_allocated) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-teal-600" />Funding Utilisation Forecast</span>
          <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating} className="h-7 text-xs">
            {generating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
            {generating ? 'Generating...' : 'Refresh AI Report'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>${(client.funding_utilised || 0).toLocaleString('en-AU')} utilised</span>
              <span>${client.funding_allocated.toLocaleString('en-AU')} allocated</span>
            </div>
            <Progress value={Math.min(utilisationPct, 100)} className={cn('h-2', utilisationPct > 90 ? '[&>div]:bg-red-500' : utilisationPct > 70 ? '[&>div]:bg-amber-500' : '[&>div]:bg-teal-500')} />
            <p className="text-xs text-slate-400 mt-0.5">{utilisationPct}% utilised</p>
          </div>
          <Icon className={cn('w-6 h-6', rc.color)} />
        </div>

        {report ? (
          <div className={cn('rounded-lg border p-3 space-y-2', rc.bg)}>
            <div className="flex items-center gap-2">
              <Badge className={cn('text-xs', rc.badge)}>{report.risk_level?.replace(/_/g, ' ').toUpperCase()}</Badge>
              <span className="text-xs text-slate-500">as at {format(new Date(report.report_date), 'dd MMM yyyy')}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div>
                <p className="text-slate-400">Weekly Burn</p>
                <p className="font-bold">${(report.burn_rate_weekly || 0).toLocaleString('en-AU', { minimumFractionDigits: 0 })}</p>
              </div>
              <div>
                <p className="text-slate-400">Remaining</p>
                <p className="font-bold">${(report.remaining_funding || 0).toLocaleString('en-AU', { minimumFractionDigits: 0 })}</p>
              </div>
              <div>
                <p className="text-slate-400">Projected Balance</p>
                <p className={cn('font-bold', (report.projected_end_balance || 0) < 0 ? 'text-red-600' : 'text-emerald-600')}>
                  ${(report.projected_end_balance || 0).toLocaleString('en-AU', { minimumFractionDigits: 0 })}
                </p>
              </div>
            </div>
            {report.estimated_depletion_date && (
              <p className="text-xs text-slate-600">
                <span className="font-medium">Est. depletion:</span> {format(new Date(report.estimated_depletion_date), 'dd MMM yyyy')}
                {client.plan_end_date && (
                  <span className={cn('ml-1', new Date(report.estimated_depletion_date) < new Date(client.plan_end_date) ? 'text-red-600 font-semibold' : 'text-emerald-600')}>
                    {new Date(report.estimated_depletion_date) < new Date(client.plan_end_date) ? '⚠ before plan end' : '✓ after plan end'}
                  </span>
                )}
              </p>
            )}
            {report.ai_insights && (
              <p className="text-xs text-slate-600 border-t border-slate-200 pt-2">{report.ai_insights}</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-400">No forecast generated yet. Click "Refresh AI Report" to analyse funding trajectory.</p>
        )}
      </CardContent>
    </Card>
  );
}