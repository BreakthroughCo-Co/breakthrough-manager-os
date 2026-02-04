import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Target, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ClientOutcomePrediction({ clientId }) {
  const { data: prediction, isLoading } = useQuery({
    queryKey: ['clientOutcomePrediction', clientId],
    queryFn: async () => {
      const response = await base44.functions.invoke('predictClientOutcomes', { client_id: clientId });
      return response.data;
    },
    enabled: !!clientId
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Outcome Prediction</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">Loading prediction model...</p>
        </CardContent>
      </Card>
    );
  }

  if (!prediction?.success) {
    return null;
  }

  const prob = prediction.prediction;
  const successRate = prob.success_probability;

  const getSuccessColor = (rate) => {
    if (rate >= 75) return 'text-green-600';
    if (rate >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  const getSuccessIcon = (rate) => {
    if (rate >= 75) return <TrendingUp className="h-5 w-5 text-green-600" />;
    if (rate >= 50) return <Target className="h-5 w-5 text-amber-600" />;
    return <TrendingDown className="h-5 w-5 text-red-600" />;
  };

  const getConfidenceBadge = (confidence) => {
    if (confidence >= 80) return 'bg-green-100 text-green-800';
    if (confidence >= 60) return 'bg-amber-100 text-amber-800';
    return 'bg-slate-100 text-slate-800';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          {getSuccessIcon(successRate)}
          AI Outcome Prediction
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Success Probability */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Success Probability</span>
            <span className={`text-2xl font-bold ${getSuccessColor(successRate)}`}>
              {successRate}%
            </span>
          </div>
          <Progress value={successRate} className="h-2" />
          <p className="text-xs text-slate-600 mt-2">
            Likelihood of achieving planned goals within current timeframe
          </p>
        </div>

        {/* Model Confidence */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <span className="text-sm">Model Confidence</span>
          <Badge className={getConfidenceBadge(prob.confidence_score)}>
            {prob.confidence_score}% confident
          </Badge>
        </div>

        {/* Key Influencing Factors */}
        {prob.key_factors?.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Key Influencing Factors</h4>
            <div className="space-y-2">
              {prob.key_factors.map((factor, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <div className={`mt-1 h-2 w-2 rounded-full ${
                    factor.impact === 'positive' ? 'bg-green-500' :
                    factor.impact === 'negative' ? 'bg-red-500' :
                    'bg-slate-400'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{factor.factor}</p>
                    <p className="text-xs text-slate-600">{factor.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress 
                        value={Math.abs(factor.influence_weight)} 
                        className="h-1 flex-1"
                      />
                      <span className="text-xs text-slate-500">
                        {Math.abs(factor.influence_weight)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risk Factors */}
        {prob.risk_factors?.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="text-sm font-medium mb-1">Risk Factors Identified:</p>
              <ul className="text-sm space-y-1">
                {prob.risk_factors.map((risk, idx) => (
                  <li key={idx}>• {risk}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Recommendations */}
        {prob.recommendations?.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">AI Recommendations</h4>
            <div className="space-y-1">
              {prob.recommendations.map((rec, idx) => (
                <div key={idx} className="text-sm p-2 bg-blue-50 rounded">
                  {rec}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Predicted Trajectory */}
        {prob.predicted_trajectory && (
          <div className="text-xs text-slate-500 p-2 bg-slate-50 rounded">
            <strong>Trajectory:</strong> {prob.predicted_trajectory}
          </div>
        )}

        <p className="text-xs text-slate-400 pt-2 border-t">
          Prediction generated: {new Date(prediction.analyzed_at).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}