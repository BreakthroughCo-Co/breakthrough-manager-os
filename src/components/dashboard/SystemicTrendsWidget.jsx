import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

export default function SystemicTrendsWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['systemicTrends'],
    queryFn: async () => {
      const response = await base44.functions.invoke('analyzeSystemicTrends');
      return response.data;
    },
    refetchInterval: 7200000 // Refresh every 2 hours
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organizational Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">Analyzing systemic trends...</p>
        </CardContent>
      </Card>
    );
  }

  if (!data?.success) return null;

  const analysis = data.analysis;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-teal-600" />
          Organizational Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Critical Interventions */}
        {analysis.critical_interventions?.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Critical Actions Required
            </h4>
            {analysis.critical_interventions.slice(0, 2).map((intervention, idx) => (
              <div key={idx} className="p-2 bg-red-50 border border-red-200 rounded text-xs mb-2">
                <div className="flex items-start justify-between mb-1">
                  <p className="font-medium">{intervention.intervention}</p>
                  <Badge className="bg-red-600">{intervention.urgency}</Badge>
                </div>
                <p className="text-slate-700">{intervention.affected_area}</p>
              </div>
            ))}
          </div>
        )}

        {/* Training Priorities */}
        {analysis.training_priorities?.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Training Priorities</h4>
            <div className="space-y-1">
              {analysis.training_priorities.slice(0, 3).map((priority, idx) => (
                <div key={idx} className="p-2 bg-amber-50 rounded text-xs">
                  <div className="flex items-start justify-between">
                    <p className="font-medium">{priority.training_topic}</p>
                    <Badge variant="outline">{priority.urgency}</Badge>
                  </div>
                  <p className="text-slate-700 mt-1">Target: {priority.target_audience}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Compliance Risk Themes */}
        {analysis.compliance_risk_themes?.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Compliance Focus Areas</h4>
            {analysis.compliance_risk_themes.slice(0, 2).map((theme, idx) => (
              <div key={idx} className="p-2 border rounded text-xs mb-1">
                <p className="font-medium">{theme.theme}</p>
                <p className="text-slate-700">Frequency: {theme.frequency}</p>
                <p className="text-red-700 mt-1">{theme.mitigation}</p>
              </div>
            ))}
          </div>
        )}

        {/* Organizational Strengths */}
        {analysis.organizational_strengths?.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              What's Working Well
            </h4>
            <ul className="text-xs space-y-1">
              {analysis.organizational_strengths.slice(0, 3).map((strength, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}