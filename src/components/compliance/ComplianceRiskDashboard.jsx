import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, TrendingUp, Shield, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ComplianceRiskDashboard() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const { data: riskForecasts = [] } = useQuery({
    queryKey: ['complianceRiskForecasts'],
    queryFn: () => base44.entities.ComplianceRiskForecast.filter({ status: 'forecasted' }, '-forecast_date', 50),
  });

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await base44.functions.invoke('analyzeCompliancePatterns', {});
      setAnalysis(result.data);
      toast.success('Analysis complete');
    } catch (error) {
      toast.error('Analysis failed: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const impactColors = {
    low: 'bg-blue-100 text-blue-800 border-blue-300',
    medium: 'bg-amber-100 text-amber-800 border-amber-300',
    high: 'bg-orange-100 text-orange-800 border-orange-300',
    critical: 'bg-red-100 text-red-800 border-red-300'
  };

  const highRisks = riskForecasts.filter(r => r.impact === 'high' || r.impact === 'critical');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Compliance Risk Dashboard</h3>
          <p className="text-muted-foreground">AI-powered risk forecasting and pattern analysis</p>
        </div>
        <Button onClick={handleRunAnalysis} disabled={isAnalyzing}>
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <TrendingUp className="w-4 h-4 mr-2" />
              Run Analysis
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{highRisks.length}</p>
                <p className="text-xs text-muted-foreground">High/Critical Risks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{riskForecasts.length}</p>
                <p className="text-xs text-muted-foreground">Total Forecasts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {analysis?.metrics?.total_compliance_items || 0}
                </p>
                <p className="text-xs text-muted-foreground">Items Monitored</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {analysis && (
        <div className="space-y-4">
          {analysis.analysis.identified_patterns && analysis.analysis.identified_patterns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  Identified Patterns
                </CardTitle>
                <CardDescription>Recurring compliance issues detected</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {analysis.analysis.identified_patterns.map((pattern, idx) => (
                  <div key={idx} className="border-l-4 border-purple-400 pl-4 py-2">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-sm">{pattern.pattern}</h4>
                      <Badge variant={pattern.severity === 'high' ? 'destructive' : 'default'}>
                        {pattern.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Frequency: {pattern.frequency}
                    </p>
                    {pattern.affected_areas && (
                      <div className="flex flex-wrap gap-1">
                        {pattern.affected_areas.map((area, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{area}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {analysis.analysis.policy_gaps && analysis.analysis.policy_gaps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  Policy Gaps Identified
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analysis.analysis.policy_gaps.map((gap, idx) => (
                  <div key={idx} className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-sm text-orange-900">{gap.policy_area}</h4>
                      <Badge className={
                        gap.priority === 'critical' ? 'bg-red-600' :
                        gap.priority === 'high' ? 'bg-orange-600' : 'bg-yellow-600'
                      }>
                        {gap.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-orange-800 mb-2">{gap.gap_description}</p>
                    <div className="text-xs text-orange-700">
                      <span className="font-medium">Impact:</span> {gap.impact}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {analysis.analysis.immediate_actions && analysis.analysis.immediate_actions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Immediate Actions Required
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {analysis.analysis.immediate_actions.map((action, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 border rounded">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={action.urgency === 'urgent' ? 'destructive' : 'default'}>
                          {action.urgency}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Due: {action.deadline}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{action.action}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Responsible: {action.responsible_role}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Risk Forecasts</CardTitle>
          <CardDescription>Predicted compliance risks requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {riskForecasts.slice(0, 10).map((forecast) => {
              let factors = [];
              try {
                factors = JSON.parse(forecast.contributing_factors || '[]');
              } catch (e) {}

              return (
                <div key={forecast.id} className={`border rounded-lg p-4 ${impactColors[forecast.impact]}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{forecast.risk_area}</h4>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {forecast.risk_category}
                      </Badge>
                    </div>
                    <Badge className={
                      forecast.impact === 'critical' ? 'bg-red-600' :
                      forecast.impact === 'high' ? 'bg-orange-600' :
                      forecast.impact === 'medium' ? 'bg-amber-600' : 'bg-blue-600'
                    }>
                      {forecast.impact}
                    </Badge>
                  </div>

                  <div className="space-y-2 mt-3">
                    <div>
                      <p className="text-xs font-medium mb-1">Probability</p>
                      <div className="flex items-center gap-2">
                        <Progress value={forecast.probability} className="flex-1" />
                        <span className="text-xs font-medium">{forecast.probability}%</span>
                      </div>
                    </div>

                    {factors.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1">Contributing Factors:</p>
                        <ul className="text-xs space-y-0.5">
                          {factors.slice(0, 3).map((factor, i) => (
                            <li key={i}>• {factor}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs pt-2 border-t">
                      <span>Timeframe: {forecast.time_to_materialize?.replace(/_/g, ' ')}</span>
                      <span>Confidence: {forecast.confidence_score}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {riskForecasts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No risk forecasts available. Run an analysis to generate predictions.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}