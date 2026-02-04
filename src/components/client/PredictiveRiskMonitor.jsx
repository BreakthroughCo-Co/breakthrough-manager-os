import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingDown, Shield } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function PredictiveRiskMonitor({ clientId, clientName }) {
  const [assessment, setAssessment] = useState(null);

  const assessMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('predictClientRiskScore', { client_id: clientId });
      return response.data;
    },
    onSuccess: (data) => {
      setAssessment(data.risk_assessment);
    }
  });

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-600" />
            Predictive Risk Assessment
          </CardTitle>
          <Button 
            size="sm" 
            onClick={() => assessMutation.mutate()}
            disabled={assessMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {assessMutation.isPending ? 'Analyzing...' : 'Assess Risk'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!assessment ? (
          <p className="text-sm text-slate-600">AI-driven predictive risk analysis with intervention strategies</p>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-white rounded">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Risk Score</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-red-700">{assessment.overall_risk_score}/100</span>
                  <Badge className={
                    assessment.overall_risk_score >= 70 ? 'bg-red-600' :
                    assessment.overall_risk_score >= 40 ? 'bg-amber-600' :
                    'bg-green-600'
                  }>
                    {assessment.risk_level}
                  </Badge>
                </div>
              </div>
              <Badge variant="outline">{assessment.confidence_level} confidence</Badge>
              <div className="mt-2 text-xs flex items-center gap-2">
                <TrendingDown className="h-3 w-3" />
                Trajectory: {assessment.risk_trajectory}
              </div>
            </div>

            <Tabs defaultValue="breakdown">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
                <TabsTrigger value="interventions">Interventions</TabsTrigger>
                <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
              </TabsList>

              <TabsContent value="breakdown" className="space-y-2">
                <div className="p-2 bg-white rounded">
                  <p className="text-sm font-medium mb-1">Disengagement Risk</p>
                  <div className="flex items-center justify-between text-xs">
                    <span>{assessment.disengagement_risk?.probability}</span>
                    <Badge variant="outline">{assessment.disengagement_risk?.score}/100</Badge>
                  </div>
                  <ul className="mt-1 text-xs space-y-1 text-slate-700">
                    {assessment.disengagement_risk?.indicators?.slice(0, 3).map((ind, i) => (
                      <li key={i}>• {ind}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-2 bg-white rounded">
                  <p className="text-sm font-medium mb-1">Adverse Outcome Risk</p>
                  <div className="flex items-center justify-between text-xs">
                    <span>{assessment.adverse_outcome_risk?.severity}</span>
                    <Badge className="bg-red-600">{assessment.adverse_outcome_risk?.score}/100</Badge>
                  </div>
                  <ul className="mt-1 text-xs space-y-1 text-slate-700">
                    {assessment.adverse_outcome_risk?.concerns?.slice(0, 3).map((con, i) => (
                      <li key={i}>• {con}</li>
                    ))}
                  </ul>
                </div>

                {assessment.key_risk_indicators?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">Key Indicators</p>
                    {assessment.key_risk_indicators.slice(0, 3).map((kri, idx) => (
                      <div key={idx} className="p-2 bg-amber-50 rounded mb-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{kri.indicator}</span>
                          <Badge variant="outline">{kri.trend}</Badge>
                        </div>
                        <p className="text-slate-600 mt-1">{kri.current_status}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="interventions" className="space-y-2">
                {assessment.intervention_strategies?.map((strategy, idx) => (
                  <div key={idx} className="p-2 bg-white border rounded">
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-medium text-sm">{strategy.strategy}</span>
                      <Badge className={
                        strategy.priority === 'immediate' ? 'bg-red-600' :
                        strategy.priority === 'high' ? 'bg-amber-600' :
                        'bg-blue-600'
                      }>
                        {strategy.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 mb-1">{strategy.expected_impact}</p>
                    <div className="text-xs">
                      <p className="font-medium">Steps:</p>
                      <ol className="ml-4 list-decimal">
                        {strategy.implementation_steps?.slice(0, 3).map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </div>
                    <p className="text-xs text-blue-700 mt-1"><strong>Timeline:</strong> {strategy.timeline}</p>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="monitoring" className="space-y-2">
                <div className="p-3 bg-white rounded">
                  <p className="text-sm font-medium mb-2">Monitoring Protocol</p>
                  <div className="text-xs space-y-2">
                    <p><strong>Frequency:</strong> {assessment.monitoring_recommendations?.frequency}</p>
                    
                    <div>
                      <p className="font-medium">Key Metrics:</p>
                      <ul className="ml-4 list-disc">
                        {assessment.monitoring_recommendations?.key_metrics?.map((metric, i) => (
                          <li key={i}>{metric}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-2 bg-red-50 border border-red-200 rounded">
                      <p className="font-medium">Escalation Triggers:</p>
                      <ul className="ml-4 list-disc">
                        {assessment.monitoring_recommendations?.escalation_triggers?.map((trigger, i) => (
                          <li key={i}>{trigger}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}