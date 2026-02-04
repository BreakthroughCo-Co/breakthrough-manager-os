import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function EngagementMonitorWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['clientEngagement'],
    queryFn: async () => {
      const response = await base44.functions.invoke('analyzeClientEngagement');
      return response.data;
    },
    refetchInterval: 1800000 // Refresh every 30 minutes
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Engagement Monitor</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">Analyzing engagement patterns...</p>
        </CardContent>
      </Card>
    );
  }

  if (!data?.success) return null;

  const analysis = data.analysis;
  const highRisk = analysis.disengagement_risks?.filter(r => 
    r.risk_level === 'critical' || r.risk_level === 'high'
  ).length || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-red-600" />
          Engagement Monitor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center p-3 bg-red-50 rounded">
            <p className="text-2xl font-bold text-red-700">{highRisk}</p>
            <p className="text-xs text-red-700">High Disengagement Risk</p>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded">
            <p className="text-2xl font-bold text-amber-700">
              {analysis.outreach_priorities?.length || 0}
            </p>
            <p className="text-xs text-amber-700">Require Outreach</p>
          </div>
        </div>

        <div className="space-y-2">
          {analysis.disengagement_risks?.slice(0, 5).map((risk, idx) => (
            <div key={idx} className="p-2 border rounded text-xs">
              <div className="flex items-start justify-between mb-1">
                <p className="font-medium">{risk.client_name}</p>
                <Badge className={
                  risk.risk_level === 'critical' ? 'bg-red-600' :
                  risk.risk_level === 'high' ? 'bg-orange-600' :
                  'bg-amber-600'
                }>
                  {risk.risk_level}
                </Badge>
              </div>
              <p className="text-slate-700">Risk Score: {risk.risk_score}/100</p>
              <p className="text-slate-700 mt-1">{risk.recommended_action}</p>
            </div>
          ))}
        </div>

        {analysis.systemic_patterns?.length > 0 && (
          <div className="p-2 bg-blue-50 rounded">
            <p className="text-xs font-medium mb-1">Systemic Patterns Detected:</p>
            <ul className="text-xs space-y-0.5">
              {analysis.systemic_patterns.slice(0, 3).map((pattern, idx) => (
                <li key={idx}>• {pattern}</li>
              ))}
            </ul>
          </div>
        )}

        <Link to={createPageUrl('ClientOutreach')}>
          <Button variant="outline" size="sm" className="w-full">
            View Full Outreach Plan
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}