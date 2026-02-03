import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, TrendingUp, Lightbulb } from 'lucide-react';

export default function ClientOutcomePrediction() {
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      const result = await base44.functions.invoke('predictClientOutcomes', {});
      setAnalysis(result.data);
    } catch (error) {
      alert('Analysis failed: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-teal-600 mr-2" />
          Predicting client outcomes...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Client Outcome Prediction</h1>
          <p className="text-muted-foreground mt-1">Identify at-risk clients and predict long-term outcomes</p>
        </div>
        <Button onClick={handleAnalyze} className="bg-teal-600 hover:bg-teal-700">
          <TrendingUp className="w-4 h-4 mr-2" />
          Run Analysis
        </Button>
      </div>

      {analysis && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">Total Clients Analyzed</p>
                <p className="text-3xl font-bold">{analysis.total_clients_analyzed}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">At-Risk Clients</p>
                <p className="text-3xl font-bold text-red-600">{analysis.predictions.at_risk_clients?.length || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">Early Intervention Needed</p>
                <p className="text-3xl font-bold text-amber-600">{analysis.predictions.early_intervention_opportunities?.length || 0}</p>
              </CardContent>
            </Card>
          </div>

          {/* At-Risk Clients */}
          {analysis.predictions.at_risk_clients?.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  At-Risk Clients (Immediate Action Required)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {analysis.predictions.at_risk_clients.slice(0, 10).map((client, idx) => (
                  <div key={idx} className="p-3 bg-white rounded border border-red-200">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-red-900">{client.client_name}</h4>
                      <Badge className={
                        client.risk_score > 80 ? 'bg-red-600' :
                        client.risk_score > 60 ? 'bg-amber-600' :
                        'bg-orange-600'
                      }>
                        {client.risk_score}/100
                      </Badge>
                    </div>
                    <div className="mb-2">
                      <p className="text-xs font-medium text-red-900 mb-1">Concerns:</p>
                      <ul className="text-xs text-red-800">
                        {client.primary_concerns?.slice(0, 2).map((concern, cIdx) => (
                          <li key={cIdx}>• {concern}</li>
                        ))}
                      </ul>
                    </div>
                    <p className="text-xs text-red-700 font-medium">Action: {client.recommended_action}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Early Intervention */}
          {analysis.predictions.early_intervention_opportunities?.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-amber-900 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  Early Intervention Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {analysis.predictions.early_intervention_opportunities.slice(0, 8).map((opp, idx) => (
                  <div key={idx} className="p-3 bg-white rounded border border-amber-200">
                    <h4 className="font-semibold text-sm text-amber-900">{opp.client_name}</h4>
                    <p className="text-xs text-amber-800 mt-1">{opp.intervention_type}</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Expected: {opp.expected_outcome} ({opp.implementation_timeline})
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* High Achiever Patterns */}
          {analysis.predictions.high_achiever_patterns?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>High Achiever Patterns (Replicate for Others)</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.predictions.high_achiever_patterns.map((pattern, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <span className="text-emerald-600 mt-1">✓</span>
                      <span>{pattern}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Engagement Recovery */}
          {analysis.predictions.engagement_recovery_strategies?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Engagement Recovery Strategies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {analysis.predictions.engagement_recovery_strategies.map((strategy, idx) => (
                  <div key={idx} className="p-3 border rounded">
                    <h4 className="font-semibold text-sm">{strategy.strategy}</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Success Rate: {strategy.success_rate}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}