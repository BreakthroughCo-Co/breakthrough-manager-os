import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';

export default function ClientInterventionInsights({ clientId, clientName }) {
  const [insights, setInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateInsights = async () => {
    setIsLoading(true);
    try {
      const result = await base44.functions.invoke('getClientInterventionInsights', {
        client_id: clientId
      });
      setInsights(result.data);
    } catch (error) {
      alert('Failed to generate insights: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-teal-600 mr-2" />
          <span>Analyzing interventions for this client...</span>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600" />
            AI-Powered Intervention Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Get personalized intervention recommendations based on {clientName}'s profile and what works for similar clients.
          </p>
          <Button onClick={handleGenerateInsights} className="bg-teal-600 hover:bg-teal-700">
            <Sparkles className="w-4 h-4 mr-2" />
            Analyze Best Interventions
          </Button>
        </CardContent>
      </Card>
    );
  }

  const data = insights.insights;

  return (
    <div className="space-y-4">
      {/* Best Interventions */}
      <Card className="border-emerald-200">
        <CardHeader>
          <CardTitle className="text-emerald-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Recommended Interventions
          </CardTitle>
          <p className="text-xs text-emerald-700 mt-2">Based on {insights.similar_client_count} similar clients</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.best_interventions?.map((intervention, idx) => (
            <div key={idx} className="p-3 bg-emerald-50 rounded border border-emerald-200">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-emerald-900 text-sm">{intervention.intervention}</h4>
                <Badge className="bg-emerald-600">{intervention.rank}st Choice</Badge>
              </div>
              <p className="text-xs text-emerald-800 mb-2">{intervention.rationale}</p>
              <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                <div>
                  <p className="text-emerald-700 font-medium">Expected Effectiveness</p>
                  <p className="text-emerald-600">{intervention.expected_effectiveness}</p>
                </div>
                <div>
                  <p className="text-emerald-700 font-medium">Success Rate (Similar)</p>
                  <p className="text-emerald-600">{intervention.success_rate_similar_clients}</p>
                </div>
              </div>
              <p className="text-xs text-emerald-700 bg-white p-2 rounded">
                <strong>Implementation:</strong> {intervention.implementation_notes}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Progress Assessment */}
      <Card>
        <CardHeader>
          <CardTitle>Progress Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-blue-50 rounded">
            <p className="font-medium text-sm text-blue-900">Current Trajectory</p>
            <p className="text-sm text-blue-800 mt-1">{data.progress_assessment?.current_trajectory}</p>
          </div>

          {data.progress_assessment?.protective_factors?.length > 0 && (
            <div className="p-3 bg-emerald-50 rounded">
              <p className="font-medium text-sm text-emerald-900 mb-2">Protective Factors</p>
              <ul className="space-y-1">
                {data.progress_assessment.protective_factors.map((factor, idx) => (
                  <li key={idx} className="text-sm text-emerald-800 flex items-center gap-2">
                    <span>✓</span> {factor}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.progress_assessment?.risk_factors?.length > 0 && (
            <div className="p-3 bg-amber-50 rounded">
              <p className="font-medium text-sm text-amber-900 mb-2">Risk Factors</p>
              <ul className="space-y-1">
                {data.progress_assessment.risk_factors.map((factor, idx) => (
                  <li key={idx} className="text-sm text-amber-800 flex items-center gap-2">
                    <span>!</span> {factor}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tailored Strategy */}
      <Card>
        <CardHeader>
          <CardTitle>Personalized Intervention Strategy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium mb-2">Strategy Overview</p>
            <p className="text-sm text-slate-700">{data.tailored_strategy?.strategy_summary}</p>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Recommended Sequence</p>
            <ol className="space-y-1">
              {data.tailored_strategy?.intervention_sequence?.map((step, idx) => (
                <li key={idx} className="text-sm text-slate-700 ml-4 list-decimal">
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-2 bg-slate-50 rounded">
              <p className="font-medium text-slate-700">Intensity & Frequency</p>
              <p className="text-slate-600 text-xs mt-1">{data.tailored_strategy?.intensity_frequency}</p>
            </div>
            <div className="p-2 bg-slate-50 rounded">
              <p className="font-medium text-slate-700">Timeline to Change</p>
              <p className="text-slate-600 text-xs mt-1">{data.monitoring_framework?.expected_timeline}</p>
            </div>
          </div>

          {data.tailored_strategy?.adaptations?.length > 0 && (
            <div className="mt-3 p-2 bg-purple-50 rounded">
              <p className="font-medium text-sm text-purple-900 mb-2">Client-Specific Adaptations</p>
              <ul className="space-y-1">
                {data.tailored_strategy.adaptations.map((adaptation, idx) => (
                  <li key={idx} className="text-xs text-purple-800 flex items-center gap-2">
                    <span>→</span> {adaptation}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monitoring Framework */}
      <Card>
        <CardHeader>
          <CardTitle>How to Monitor Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium mb-2">Key Indicators to Track</p>
            <ul className="space-y-1">
              {data.monitoring_framework?.key_indicators?.map((indicator, idx) => (
                <li key={idx} className="text-sm text-slate-700">• {indicator}</li>
              ))}
            </ul>
          </div>

          <div className="p-3 bg-slate-50 rounded">
            <p className="font-medium text-sm mb-2">Measurement Approach</p>
            <p className="text-sm text-slate-700">{data.monitoring_framework?.measurement_method}</p>
          </div>

          {data.monitoring_framework?.adjustment_triggers?.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>When to Adjust:</strong> Consider changing approaches if you observe:
                <ul className="mt-2 list-disc list-inside space-y-1">
                  {data.monitoring_framework.adjustment_triggers.map((trigger, idx) => (
                    <li key={idx} className="text-sm">{trigger}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Interventions to Deprioritize */}
      {data.interventions_to_deprioritize?.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="text-amber-900">Interventions to Deprioritize</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.interventions_to_deprioritize.map((intervention, idx) => (
              <div key={idx} className="p-2 bg-amber-50 rounded border border-amber-200">
                <p className="font-medium text-sm text-amber-900">{intervention.intervention}</p>
                <p className="text-xs text-amber-800 mt-1">{intervention.why_ineffective}</p>
                {intervention.exceptions && (
                  <p className="text-xs text-amber-700 mt-1">
                    <strong>Exceptions:</strong> {intervention.exceptions}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}