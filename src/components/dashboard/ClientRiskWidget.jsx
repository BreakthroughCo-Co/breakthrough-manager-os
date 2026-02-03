import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertCircle, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';

export default function ClientRiskWidget({ clientId }) {
  const { data: riskProfile, isLoading, refetch } = useQuery({
    queryKey: ['clientRisk', clientId],
    queryFn: async () => {
      const profiles = await base44.entities.ClientRiskProfile.filter({ client_id: clientId });
      return profiles?.[0];
    }
  });

  const riskColors = {
    critical: 'bg-red-100 border-red-300 text-red-900',
    high: 'bg-orange-100 border-orange-300 text-orange-900',
    medium: 'bg-yellow-100 border-yellow-300 text-yellow-900',
    low: 'bg-green-100 border-green-300 text-green-900'
  };

  const riskBadgeColors = {
    critical: 'bg-red-600',
    high: 'bg-orange-600',
    medium: 'bg-yellow-600',
    low: 'bg-green-600'
  };

  if (isLoading) return <Card><CardContent className="py-4">Loading risk profile...</CardContent></Card>;

  if (!riskProfile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Risk Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-600">No risk analysis available</p>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => refetch()}>
            Analyze Risk
          </Button>
        </CardContent>
      </Card>
    );
  }

  const trendIcon = {
    improving: <TrendingDown className="h-4 w-4 text-green-600" />,
    stable: <Minus className="h-4 w-4 text-slate-600" />,
    declining: <TrendingUp className="h-4 w-4 text-red-600" />
  };

  return (
    <Card className={`border ${riskColors[riskProfile.overall_risk_level]}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">Client Risk Profile</CardTitle>
            <CardDescription className="text-xs">
              Last analyzed: {riskProfile.analysis_date ? new Date(riskProfile.analysis_date).toLocaleDateString() : 'N/A'}
            </CardDescription>
          </div>
          <Button size="sm" variant="ghost" onClick={() => refetch()}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Overall Risk */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Overall Risk</span>
          <div className="flex items-center gap-2">
            <Badge className={riskBadgeColors[riskProfile.overall_risk_level]}>
              {riskProfile.overall_risk_level.toUpperCase()}
            </Badge>
            <span className="text-sm font-bold">{riskProfile.overall_risk_score}/100</span>
          </div>
        </div>

        {/* Trend */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600">Trend</span>
          <div className="flex items-center gap-1">
            {trendIcon[riskProfile.trend_direction]}
            <span className="capitalize">{riskProfile.trend_direction}</span>
          </div>
        </div>

        {/* Risk Breakdown */}
        <div className="grid grid-cols-2 gap-2 text-xs border-t pt-2">
          <div>
            <p className="text-slate-600 mb-1">Disengagement</p>
            <div className="bg-white rounded h-6 flex items-center justify-center font-semibold">
              {riskProfile.disengagement_risk}%
            </div>
          </div>
          <div>
            <p className="text-slate-600 mb-1">Crisis Risk</p>
            <div className="bg-white rounded h-6 flex items-center justify-center font-semibold">
              {riskProfile.crisis_risk}%
            </div>
          </div>
          <div>
            <p className="text-slate-600 mb-1">Compliance</p>
            <div className="bg-white rounded h-6 flex items-center justify-center font-semibold">
              {riskProfile.compliance_risk}%
            </div>
          </div>
          <div>
            <p className="text-slate-600 mb-1">Plan Adherence</p>
            <div className="bg-white rounded h-6 flex items-center justify-center font-semibold">
              {riskProfile.plan_adherence_risk}%
            </div>
          </div>
        </div>

        {/* Key Factors */}
        {(riskProfile.disengagement_indicators?.length > 0 || riskProfile.crisis_indicators?.length > 0) && (
          <Alert className="border-amber-200 bg-amber-50 mt-2">
            <AlertCircle className="h-3 w-3 text-amber-600" />
            <AlertDescription className="text-xs text-amber-700">
              {riskProfile.disengagement_risk > 60 && <div>• High disengagement risk identified</div>}
              {riskProfile.crisis_risk > 40 && <div>• Crisis risk factors present</div>}
              {riskProfile.compliance_risk > 50 && <div>• Compliance attention needed</div>}
            </AlertDescription>
          </Alert>
        )}

        {/* Recommended Actions */}
        {riskProfile.recommended_actions?.length > 0 && (
          <div className="bg-white/50 rounded p-2 mt-2">
            <p className="text-xs font-semibold mb-1">Recommended Actions</p>
            <ul className="text-xs space-y-1">
              {riskProfile.recommended_actions.slice(0, 3).map((action, idx) => (
                <li key={idx} className="text-slate-700">• {action}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}