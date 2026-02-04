import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function GoalSuccessAnalysis({ clientId, clientName }) {
  const [analysis, setAnalysis] = useState(null);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('analyzeGoalSuccessFactors', {
        client_id: clientId
      });
      return response.data;
    },
    onSuccess: (data) => {
      setAnalysis(data.analysis);
    }
  });

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Goal Success Prediction
          </CardTitle>
          <Button 
            size="sm" 
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            {analyzeMutation.isPending ? 'Analyzing...' : 'Predict Outcomes'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!analysis ? (
          <p className="text-sm text-slate-600">AI-driven prediction of goal achievement likelihood</p>
        ) : (
          <Tabs defaultValue="predictions">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="predictions">Predictions</TabsTrigger>
              <TabsTrigger value="factors">Factors</TabsTrigger>
              <TabsTrigger value="recommendations">Actions</TabsTrigger>
            </TabsList>

            <TabsContent value="predictions" className="space-y-3">
              <div className="p-3 bg-white rounded mb-3">
                <p className="text-sm font-medium mb-1">Plan Success Forecast</p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-blue-700">
                    {analysis.plan_outcome_forecast?.overall_success_probability}%
                  </span>
                  <Badge variant="outline">{analysis.plan_outcome_forecast?.forecast_confidence} confidence</Badge>
                </div>
              </div>

              {analysis.goal_predictions?.map((pred, idx) => (
                <div key={idx} className="p-3 bg-white rounded">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-sm">{pred.goal}</p>
                    <Badge className={
                      pred.achievement_likelihood >= 75 ? 'bg-green-600' :
                      pred.achievement_likelihood >= 50 ? 'bg-amber-600' :
                      'bg-red-600'
                    }>
                      {pred.achievement_likelihood}% likely
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 mb-2">{pred.likelihood_rating}</p>
                  <div className="text-xs">
                    <p className="font-medium">Key Factors:</p>
                    <ul className="ml-4 text-slate-700">
                      {pred.key_factors?.slice(0, 3).map((factor, i) => (
                        <li key={i}>• {factor}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="factors" className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Success Factors
                </p>
                {analysis.success_factors?.map((factor, idx) => (
                  <div key={idx} className="p-2 bg-green-50 rounded mb-2 text-sm">
                    <div className="flex items-start justify-between">
                      <span className="font-medium">{factor.factor}</span>
                      <Badge variant="outline">{factor.impact_level}</Badge>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{factor.evidence}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  Risk Factors
                </p>
                {analysis.risk_factors?.map((risk, idx) => (
                  <div key={idx} className="p-2 bg-red-50 rounded mb-2 text-sm">
                    <div className="flex items-start justify-between">
                      <span className="font-medium">{risk.factor}</span>
                      <Badge className="bg-red-600">{risk.severity}</Badge>
                    </div>
                    <p className="text-xs text-blue-700 mt-1"><strong>Mitigation:</strong> {risk.mitigation}</p>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-2">
              {analysis.optimization_recommendations?.map((rec, idx) => (
                <div key={idx} className="p-3 bg-white rounded">
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-medium text-sm">{rec.recommendation}</span>
                    <Badge className={
                      rec.priority === 'high' ? 'bg-red-600' :
                      rec.priority === 'medium' ? 'bg-amber-600' :
                      'bg-blue-600'
                    }>
                      {rec.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 mb-2"><strong>Expected Impact:</strong> {rec.expected_impact}</p>
                  <div className="text-xs">
                    <p className="font-medium">Implementation:</p>
                    <ol className="ml-4 list-decimal text-slate-700">
                      {rec.implementation_steps?.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}