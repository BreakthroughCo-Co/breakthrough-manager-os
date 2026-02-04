import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, AlertTriangle, TrendingUp } from 'lucide-react';

export default function FundingAnalyticsWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['fundingAnalytics'],
    queryFn: async () => {
      const response = await base44.functions.invoke('analyzeFundingUtilization');
      return response.data;
    },
    refetchInterval: 3600000 // Hourly refresh
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Funding Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">Analyzing portfolio...</p>
        </CardContent>
      </Card>
    );
  }

  if (!data?.success) return null;

  const analysis = data.analysis;
  const criticalAlerts = analysis.budget_alerts?.filter(a => 
    a.severity === 'critical' || a.alert_type === 'exhaustion_risk'
  ).length || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          Funding Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center p-3 bg-green-50 rounded">
            <p className="text-2xl font-bold text-green-700">
              ${(data.summary?.total_allocated / 1000).toFixed(0)}k
            </p>
            <p className="text-xs text-green-700">Total Allocated</p>
          </div>
          <div className="text-center p-3 bg-slate-50 rounded">
            <p className="text-2xl font-bold">
              {analysis.portfolio_health?.total_utilization_rate?.toFixed(0)}%
            </p>
            <p className="text-xs text-slate-600">Utilization</p>
          </div>
        </div>

        {criticalAlerts > 0 && (
          <div className="p-2 bg-red-50 border border-red-200 rounded">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="font-medium text-red-900">
                {criticalAlerts} Critical Budget Alert{criticalAlerts > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {analysis.budget_alerts?.slice(0, 3).map((alert, idx) => (
            <div key={idx} className="p-2 border rounded text-xs">
              <div className="flex items-start justify-between mb-1">
                <p className="font-medium">{alert.client_name}</p>
                <Badge className={
                  alert.severity === 'critical' ? 'bg-red-600' :
                  alert.severity === 'high' ? 'bg-orange-600' :
                  'bg-amber-600'
                }>
                  {alert.alert_type}
                </Badge>
              </div>
              <p className="text-slate-700">{alert.funding_status}</p>
              <p className="text-blue-700 mt-1">{alert.immediate_action}</p>
            </div>
          ))}
        </div>

        {analysis.optimization_strategies?.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold mb-1">Quick Wins:</h4>
            <ul className="text-xs space-y-1">
              {analysis.optimization_strategies.slice(0, 2).map((strat, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <TrendingUp className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{strat.strategy}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}