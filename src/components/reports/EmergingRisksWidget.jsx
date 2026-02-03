import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, Shield } from 'lucide-react';

export default function EmergingRisksWidget({ risks = [] }) {
  const getRiskColor = (probability, impact) => {
    if ((probability === 'high' && impact === 'high') || probability === 'critical') {
      return 'destructive';
    }
    if (probability === 'high' || impact === 'high') {
      return 'default';
    }
    return 'secondary';
  };

  const getRiskIcon = (category) => {
    switch (category) {
      case 'incident':
        return AlertTriangle;
      case 'compliance':
        return Shield;
      case 'operational':
        return TrendingUp;
      default:
        return AlertTriangle;
    }
  };

  if (risks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Emerging Risks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No emerging risks identified
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          Emerging Risks ({risks.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {risks.map((risk, idx) => {
          const Icon = getRiskIcon(risk.category);
          return (
            <div key={idx} className="border-l-4 border-l-amber-400 pl-4 py-2 bg-amber-50 rounded-r">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-2">
                  <Icon className="w-4 h-4 text-amber-700 mt-1" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-amber-900">{risk.risk_name}</h4>
                    <div className="flex gap-2 mt-1">
                      <Badge variant={getRiskColor(risk.probability, risk.impact)} className="text-xs">
                        {risk.probability} probability
                      </Badge>
                      <Badge variant={getRiskColor(risk.impact, risk.probability)} className="text-xs">
                        {risk.impact} impact
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {risk.category}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {risk.indicators && risk.indicators.length > 0 && (
                <div className="text-xs text-amber-800 mb-2">
                  <span className="font-medium">Indicators:</span>
                  <ul className="list-disc list-inside mt-1 ml-2">
                    {risk.indicators.slice(0, 3).map((indicator, i) => (
                      <li key={i}>{indicator}</li>
                    ))}
                  </ul>
                </div>
              )}

              {risk.recommended_actions && risk.recommended_actions.length > 0 && (
                <div className="text-xs text-amber-900">
                  <span className="font-medium">Actions:</span>
                  <ul className="list-disc list-inside mt-1 ml-2">
                    {risk.recommended_actions.slice(0, 2).map((action, i) => (
                      <li key={i}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}