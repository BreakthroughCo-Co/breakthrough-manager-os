import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FinancialVarianceWidget() {
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-variance'],
    queryFn: () => base44.entities.Client.filter({ status: 'active' }),
  });

  const { data: billing = [] } = useQuery({
    queryKey: ['billing-variance'],
    queryFn: () => base44.entities.BillingRecord.list(),
  });

  // Calculate billed amount per client from billing records
  const billedByClient = billing.reduce((acc, r) => {
    if (r.client_id && (r.status === 'paid' || r.status === 'submitted')) {
      acc[r.client_id] = (acc[r.client_id] || 0) + (r.total_amount || 0);
    }
    return acc;
  }, {});

  const rows = clients
    .filter(c => c.funding_allocated && c.funding_allocated > 0)
    .map(c => {
      const allocated = c.funding_allocated || 0;
      const utilised = c.funding_utilised || billedByClient[c.id] || 0;
      const variance = utilised - allocated;
      const variancePct = allocated > 0 ? (variance / allocated) * 100 : 0;
      const burnRate = allocated > 0 ? (utilised / allocated) * 100 : 0;

      let status = 'on_track';
      if (burnRate > 95) status = 'over_budget';
      else if (burnRate > 80) status = 'at_risk';
      else if (burnRate < 30) status = 'underspend';

      return { ...c, allocated, utilised, variance, variancePct, burnRate, status };
    })
    .sort((a, b) => {
      // Sort: over_budget first, then at_risk, then underspend, then on_track
      const order = { over_budget: 0, at_risk: 1, underspend: 2, on_track: 3 };
      return (order[a.status] ?? 3) - (order[b.status] ?? 3);
    });

  const statusConfig = {
    over_budget: { label: 'Over Budget', color: 'bg-red-100 text-red-700', icon: TrendingUp },
    at_risk: { label: 'At Risk', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
    underspend: { label: 'Underspend', color: 'bg-blue-100 text-blue-700', icon: TrendingDown },
    on_track: { label: 'On Track', color: 'bg-emerald-100 text-emerald-700', icon: Minus },
  };

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-600" />
            NDIS Plan vs Billed Variance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No clients with funding allocations found. Add funding_allocated to client records.
          </p>
        </CardContent>
      </Card>
    );
  }

  const overBudget = rows.filter(r => r.status === 'over_budget').length;
  const atRisk = rows.filter(r => r.status === 'at_risk').length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-600" />
            NDIS Plan vs Billed Variance
          </CardTitle>
          <div className="flex gap-2">
            {overBudget > 0 && <Badge className="bg-red-100 text-red-700 text-xs">{overBudget} over budget</Badge>}
            {atRisk > 0 && <Badge className="bg-amber-100 text-amber-700 text-xs">{atRisk} at risk</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-xs text-slate-500">
                <th className="text-left px-4 py-2 font-medium">Client</th>
                <th className="text-right px-3 py-2 font-medium">Allocated</th>
                <th className="text-right px-3 py-2 font-medium">Billed</th>
                <th className="text-right px-3 py-2 font-medium">Variance</th>
                <th className="text-right px-3 py-2 font-medium">Burn %</th>
                <th className="text-center px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const cfg = statusConfig[row.status];
                const Icon = cfg.icon;
                return (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-900">{row.full_name}</p>
                      <p className="text-xs text-slate-400">{row.service_type}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-700">
                      ${row.allocated.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-700">
                      ${row.utilised.toLocaleString()}
                    </td>
                    <td className={cn(
                      "px-3 py-2.5 text-right font-medium",
                      row.variance > 0 ? "text-red-600" : row.variance < 0 ? "text-blue-600" : "text-slate-500"
                    )}>
                      {row.variance > 0 ? '+' : ''}{row.variance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-slate-200 rounded-full h-1.5">
                          <div
                            className={cn(
                              "h-1.5 rounded-full",
                              row.burnRate > 95 ? "bg-red-500" :
                              row.burnRate > 80 ? "bg-amber-500" :
                              row.burnRate < 30 ? "bg-blue-400" :
                              "bg-emerald-500"
                            )}
                            style={{ width: `${Math.min(row.burnRate, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-600 w-10 text-right">
                          {row.burnRate.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Badge className={cn("text-xs border-0", cfg.color)}>
                        <Icon className="w-3 h-3 mr-1" />
                        {cfg.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}