import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays, isAfter } from 'date-fns';

const STAGES = [
  { key: 'new', label: 'New Leads' },
  { key: 'pending_review', label: 'Pending Review' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'contract_sent', label: 'Contract Sent' },
  { key: 'converted', label: 'Converted' },
];

export default function IntakeConversionFunnel() {
  const { data: intakes = [] } = useQuery({
    queryKey: ['intake-funnel'],
    queryFn: () => base44.entities.ClientIntakeRequest.list('-created_date', 500),
  });

  const last30 = intakes.filter(i => i.created_date && isAfter(new Date(i.created_date), subDays(new Date(), 30)));
  const last90 = intakes.filter(i => i.created_date && isAfter(new Date(i.created_date), subDays(new Date(), 90)));

  const total = intakes.filter(i => i.status !== 'archived').length;
  const converted = intakes.filter(i => i.status === 'converted').length;
  const declined = intakes.filter(i => i.status === 'declined' || i.status === 'archived').length;
  const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : 0;

  // Count per stage (active pipeline)
  const activeIntakes = intakes.filter(i => i.status !== 'archived' && i.status !== 'declined');
  const stageCounts = STAGES.map(s => ({
    ...s,
    count: s.key === 'converted'
      ? intakes.filter(i => i.status === 'converted').length
      : activeIntakes.filter(i => i.status === s.key).length,
  }));

  // Source breakdown
  const sourceBreakdown = intakes.reduce((acc, i) => {
    const src = i.source || 'manual';
    acc[src] = (acc[src] || 0) + 1;
    return acc;
  }, {});

  const sourceLabels = {
    '17hats_zapier': '17hats',
    manual: 'Manual',
    referral: 'Referral',
    website: 'Website',
  };

  const maxCount = Math.max(...stageCounts.map(s => s.count), 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-600" />
            Intake-to-Revenue Conversion Funnel
          </CardTitle>
          <Badge className="bg-teal-100 text-teal-700 border-0 text-sm font-semibold">
            {conversionRate}% conversion
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total Leads', value: total, color: 'text-slate-700' },
            { label: 'Converted', value: converted, color: 'text-emerald-600' },
            { label: 'Declined / Archived', value: declined, color: 'text-slate-500' },
            { label: 'Last 30 Days', value: last30.length, color: 'text-blue-600' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Funnel chart */}
        <div className="space-y-2">
          {stageCounts.map((stage, idx) => {
            const width = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
            const dropOff = idx > 0 && stageCounts[idx - 1].count > 0
              ? (((stageCounts[idx - 1].count - stage.count) / stageCounts[idx - 1].count) * 100).toFixed(0)
              : null;

            return (
              <div key={stage.key}>
                {dropOff !== null && parseInt(dropOff) > 0 && (
                  <div className="flex items-center gap-1 text-xs text-slate-400 ml-2 my-0.5">
                    <ArrowDown className="w-3 h-3" />
                    <span>{dropOff}% drop-off</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-28 text-right flex-shrink-0">{stage.label}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-6 relative">
                    <div
                      className={cn(
                        "h-6 rounded-full flex items-center justify-end pr-2 transition-all",
                        stage.key === 'converted' ? "bg-emerald-500" :
                        stage.key === 'contract_sent' ? "bg-teal-500" :
                        "bg-teal-300"
                      )}
                      style={{ width: `${Math.max(width, 4)}%` }}
                    >
                      <span className="text-xs text-white font-semibold">{stage.count}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Source breakdown */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Lead Source Breakdown</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(sourceBreakdown).map(([src, count]) => (
              <div key={src} className="flex items-center gap-1.5 bg-slate-50 border rounded px-2 py-1">
                <span className="text-xs font-medium text-slate-700">{sourceLabels[src] || src}</span>
                <Badge variant="secondary" className="text-xs h-4">{count}</Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}