import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { differenceInDays } from 'date-fns';
import { TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function FundingBurnRateWidget() {
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-burn'],
    queryFn: () => base44.entities.Client.filter({ status: 'active' }),
  });

  const today = new Date();

  const atRisk = clients
    .filter(c => c.plan_end_date && c.funding_allocated && c.funding_utilised)
    .map(c => {
      const planEnd = new Date(c.plan_end_date);
      const planStart = c.plan_start_date ? new Date(c.plan_start_date) : new Date(today.getFullYear(), 0, 1);
      const totalDays = Math.max(1, differenceInDays(planEnd, planStart));
      const daysElapsed = Math.max(0, differenceInDays(today, planStart));
      const daysRemaining = Math.max(0, differenceInDays(planEnd, today));
      const utilPct = Math.round((c.funding_utilised / c.funding_allocated) * 100);
      const expectedPct = Math.round((daysElapsed / totalDays) * 100);
      const dailySpend = daysElapsed > 0 ? c.funding_utilised / daysElapsed : 0;
      const projectedTotal = dailySpend * totalDays;
      const projectedOverrun = projectedTotal - c.funding_allocated;
      const remaining = c.funding_allocated - c.funding_utilised;
      const daysOfFundingLeft = dailySpend > 0 ? Math.round(remaining / dailySpend) : 9999;

      let risk = null;
      if (projectedOverrun > 0) risk = 'overrun';
      else if (utilPct < expectedPct - 20 && daysRemaining < 90) risk = 'underspend';
      else if (daysOfFundingLeft < 30 && daysRemaining > 14) risk = 'running_low';

      return { ...c, utilPct, expectedPct, projectedOverrun, daysRemaining, daysOfFundingLeft, risk };
    })
    .filter(c => c.risk !== null)
    .sort((a, b) => {
      const order = { overrun: 0, running_low: 1, underspend: 2 };
      return (order[a.risk] ?? 3) - (order[b.risk] ?? 3);
    });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            Funding Burn Rate Alerts
          </CardTitle>
          <Link to={createPageUrl('PlanUtilisation')}>
            <span className="text-xs text-teal-600 hover:underline cursor-pointer">View all →</span>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {atRisk.length === 0 ? (
          <div className="flex items-center gap-2 text-emerald-600 text-sm">
            <CheckCircle className="w-4 h-4" />
            All plans tracking within expected range
          </div>
        ) : (
          atRisk.slice(0, 5).map(c => (
            <div key={c.id} className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              c.risk === 'overrun' ? "bg-red-50 border-red-200" :
              c.risk === 'running_low' ? "bg-amber-50 border-amber-200" :
              "bg-blue-50 border-blue-200"
            )}>
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium">{c.full_name}</p>
                <Badge className={cn("text-xs",
                  c.risk === 'overrun' ? "bg-red-100 text-red-700" :
                  c.risk === 'running_low' ? "bg-amber-100 text-amber-700" :
                  "bg-blue-100 text-blue-700"
                )}>
                  {c.risk === 'overrun' ? `+$${c.projectedOverrun.toFixed(0)} overrun` :
                   c.risk === 'running_low' ? `${c.daysOfFundingLeft}d funds left` :
                   `Underspend risk`}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={c.utilPct} className="h-1.5 flex-1" />
                <span className="text-xs text-muted-foreground whitespace-nowrap">{c.utilPct}% used</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{c.daysRemaining}d remaining on plan</p>
            </div>
          ))
        )}
        {atRisk.length > 5 && (
          <p className="text-xs text-muted-foreground text-right">+{atRisk.length - 5} more</p>
        )}
      </CardContent>
    </Card>
  );
}