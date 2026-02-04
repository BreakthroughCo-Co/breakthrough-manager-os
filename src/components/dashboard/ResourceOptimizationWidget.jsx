import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, AlertTriangle, Users } from 'lucide-react';

export default function ResourceOptimizationWidget() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['resourceOptimization'],
    queryFn: async () => {
      const response = await base44.functions.invoke('optimizeResourceAllocation');
      return response.data;
    },
    refetchInterval: 3600000 // Refresh hourly
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resource Optimization</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">Analyzing workload balance...</p>
        </CardContent>
      </Card>
    );
  }

  if (!data?.success) return null;

  const analysis = data.analysis;
  const overutilized = analysis.workload_balance?.filter(p => 
    p.status === 'overutilized' || p.utilization > 90
  ).length || 0;

  const underutilized = analysis.workload_balance?.filter(p => 
    p.status === 'underutilized' || p.utilization < 50
  ).length || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5 text-teal-600" />
            Resource Optimization
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-slate-50 rounded">
            <p className="text-2xl font-bold">{analysis.workload_balance?.length || 0}</p>
            <p className="text-xs text-slate-600">Practitioners</p>
          </div>
          <div className="text-center p-2 bg-red-50 rounded">
            <p className="text-2xl font-bold text-red-700">{overutilized}</p>
            <p className="text-xs text-red-700">Overutilized</p>
          </div>
          <div className="text-center p-2 bg-amber-50 rounded">
            <p className="text-2xl font-bold text-amber-700">{underutilized}</p>
            <p className="text-xs text-amber-700">Underutilized</p>
          </div>
        </div>

        {analysis.risk_alerts?.slice(0, 3).map((alert, idx) => (
          <div key={idx} className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">{alert.entity}: {alert.risk_type}</p>
              <p className="text-red-700">{alert.action_required}</p>
            </div>
          </div>
        ))}

        {analysis.reallocation_suggestions?.slice(0, 2).map((suggestion, idx) => (
          <div key={idx} className="p-2 bg-blue-50 rounded text-xs">
            <p className="font-medium">
              Transfer {suggestion.client_count} client(s): {suggestion.from_practitioner} → {suggestion.to_practitioner}
            </p>
            <p className="text-slate-700 mt-1">{suggestion.rationale}</p>
          </div>
        ))}

        {analysis.efficiency_recommendations?.slice(0, 2).map((rec, idx) => (
          <div key={idx} className="flex items-start gap-2 text-xs">
            <TrendingUp className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span>{rec}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}