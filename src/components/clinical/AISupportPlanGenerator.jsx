import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AISupportPlanGenerator({ clientId }) {
  const [plan, setPlan] = useState(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generateAISupportPlan', { client_id: clientId });
      return response.data;
    },
    onSuccess: (data) => {
      setPlan(data.support_plan);
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-5 w-5 text-teal-600" />
          AI Support Plan Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!plan ? (
          <div className="text-center py-6">
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? 'Analyzing Data...' : 'Generate Evidence-Based Plan'}
            </Button>
            <p className="text-xs text-slate-500 mt-2">
              AI analyzes risk profile, outcomes, incidents, and historical patterns
            </p>
          </div>
        ) : (
          <Tabs defaultValue="goals">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="goals">Goals</TabsTrigger>
              <TabsTrigger value="interventions">Interventions</TabsTrigger>
              <TabsTrigger value="risks">Risk Mgmt</TabsTrigger>
              <TabsTrigger value="review">Review</TabsTrigger>
            </TabsList>

            <TabsContent value="goals" className="space-y-3">
              {plan.recommended_goals?.map((goal, idx) => (
                <div key={idx} className="p-3 border rounded space-y-2">
                  <div className="flex items-start justify-between">
                    <p className="font-medium text-sm">{goal.goal_description}</p>
                    <Badge className={
                      goal.priority === 'high' ? 'bg-red-100 text-red-800' :
                      goal.priority === 'medium' ? 'bg-amber-100 text-amber-800' :
                      'bg-slate-100 text-slate-800'
                    }>
                      {goal.priority}
                    </Badge>
                  </div>
                  <div className="text-xs space-y-1">
                    <p><strong>NDIS Domain:</strong> {goal.ndis_domain}</p>
                    <p><strong>Baseline:</strong> {goal.baseline}</p>
                    <p><strong>Target:</strong> {goal.target_outcome}</p>
                    <p><strong>Timeframe:</strong> {goal.time_bound}</p>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="interventions" className="space-y-3">
              {plan.intervention_strategies?.map((intervention, idx) => (
                <div key={idx} className="p-3 bg-blue-50 rounded space-y-2">
                  <p className="font-medium text-sm">{intervention.intervention}</p>
                  <p className="text-xs text-slate-700">{intervention.implementation_approach}</p>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline">{intervention.frequency}</Badge>
                    <span className="text-green-700">{intervention.expected_outcome}</span>
                  </div>
                  <p className="text-xs text-slate-600 italic">
                    Evidence: {intervention.evidence_base}
                  </p>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="risks" className="space-y-3">
              {plan.risk_mitigation?.map((risk, idx) => (
                <div key={idx} className="p-3 border border-red-200 bg-red-50 rounded space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm text-red-900">{risk.risk}</p>
                      <p className="text-xs text-red-700 mt-1">{risk.mitigation_strategy}</p>
                      {risk.monitoring_indicators?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium">Monitor for:</p>
                          <ul className="text-xs space-y-0.5 mt-1">
                            {risk.monitoring_indicators.map((indicator, i) => (
                              <li key={i}>• {indicator}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="review" className="space-y-3">
              <div className="p-3 bg-slate-50 rounded">
                <p className="text-sm font-medium">Review Schedule</p>
                <p className="text-xs mt-1">Frequency: {plan.review_schedule?.frequency}</p>
                {plan.review_schedule?.key_review_dates?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium">Key Review Dates:</p>
                    <ul className="text-xs space-y-0.5 mt-1">
                      {plan.review_schedule.key_review_dates.map((date, i) => (
                        <li key={i}>• {date}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {plan.success_criteria?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Success Criteria</p>
                  {plan.success_criteria.map((criteria, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm mb-1">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                      <span>{criteria}</span>
                    </div>
                  ))}
                </div>
              )}

              {plan.recommended_service_intensity && (
                <div className="p-3 bg-blue-50 rounded">
                  <p className="text-xs font-medium">Recommended Service Intensity</p>
                  <p className="text-sm mt-1">{plan.recommended_service_intensity}</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}