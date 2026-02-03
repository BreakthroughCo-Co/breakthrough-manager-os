import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, TrendingUp, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react';

export default function InterventionEfficacyDashboard() {
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadAnalysis = async () => {
    setIsLoading(true);
    try {
      const result = await base44.functions.invoke('analyzeInterventionEfficacy', {});
      setAnalysis(result.data);
    } catch (error) {
      alert('Failed to load intervention analysis: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalysis();
  }, []);

  if (isLoading || !analysis) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
          <span className="ml-2">Analyzing intervention efficacy...</span>
        </CardContent>
      </Card>
    );
  }

  const aiInsights = analysis.ai_insights;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Intervention Efficacy Analysis</h2>
        <Button onClick={loadAnalysis} variant="outline" size="sm">
          <Sparkles className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Most Effective */}
      <Card className="border-emerald-200 bg-emerald-50">
        <CardHeader>
          <CardTitle className="text-emerald-900 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Most Effective Interventions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {aiInsights.most_effective.map((strategy, idx) => (
            <div key={idx} className="p-3 bg-white rounded-lg border border-emerald-200">
              <h4 className="font-semibold text-emerald-900">{strategy.strategy}</h4>
              <p className="text-sm text-emerald-800 mt-1"><strong>Why:</strong> {strategy.why_effective}</p>
              <p className="text-sm text-emerald-700 mt-1"><strong>Best for:</strong> {strategy.best_for}</p>
              <div className="mt-2 inline-block px-2 py-1 bg-emerald-200 rounded text-xs font-semibold text-emerald-900">
                {strategy.effectiveness_rating}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Low Effectiveness - Recommendations for Change */}
      {aiInsights.low_effectiveness.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Low Effectiveness Strategies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiInsights.low_effectiveness.map((strategy, idx) => (
              <div key={idx} className="p-3 bg-white rounded-lg border border-amber-200">
                <h4 className="font-semibold text-amber-900">{strategy.strategy}</h4>
                <p className="text-sm text-amber-800 mt-1"><strong>Recommendation:</strong> {strategy.recommendation}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* High-Risk Profiles */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-orange-900">High-Risk Client Profiles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {aiInsights.high_risk_profiles.map((profile, idx) => (
            <div key={idx} className="p-3 bg-white rounded-lg border border-orange-200">
              <h4 className="font-semibold text-orange-900">{profile.profile}</h4>
              <div className="mt-2">
                <p className="text-xs font-medium text-orange-800">Risk Factors:</p>
                <ul className="list-disc list-inside mt-1">
                  {profile.risk_factors.map((factor, i) => (
                    <li key={i} className="text-xs text-orange-700">{factor}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-2">
                <p className="text-xs font-medium text-orange-800">Recommended Interventions:</p>
                <ul className="list-disc list-inside mt-1">
                  {profile.recommended_interventions.map((intervention, i) => (
                    <li key={i} className="text-xs text-orange-700">{intervention}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Clinical Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Clinical Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {aiInsights.clinical_recommendations.map((rec, idx) => (
              <li key={idx} className="flex gap-2 text-sm">
                <span className="text-teal-600 font-bold">{idx + 1}.</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Training Priorities */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">Staff Training Priorities</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {aiInsights.training_priorities.map((priority, idx) => (
              <li key={idx} className="flex gap-2 text-sm">
                <span className="text-blue-600 font-bold">•</span>
                <span className="text-blue-800">{priority}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}