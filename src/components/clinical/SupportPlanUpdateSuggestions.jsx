import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Target, TrendingUp, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SupportPlanUpdateSuggestions({ clientId }) {
  const [suggestions, setSuggestions] = useState(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('suggestSupportPlanUpdates', { client_id: clientId });
      return response.data;
    },
    onSuccess: (data) => {
      setSuggestions(data.update_suggestions);
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-5 w-5 text-amber-600" />
          AI Support Plan Update Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!suggestions ? (
          <div className="text-center py-6">
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? 'Analyzing Progress...' : 'Generate Update Suggestions'}
            </Button>
            <p className="text-xs text-slate-500 mt-2">
              AI analyzes case notes and feedback to suggest plan adjustments
            </p>
          </div>
        ) : (
          <Tabs defaultValue="goals">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="goals">Goals</TabsTrigger>
              <TabsTrigger value="interventions">Interventions</TabsTrigger>
              <TabsTrigger value="milestones">Milestones</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
            </TabsList>

            <TabsContent value="goals" className="space-y-3">
              {suggestions.goal_adjustments?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Recommended Goal Adjustments</h4>
                  {suggestions.goal_adjustments.map((adj, idx) => (
                    <div key={idx} className="p-2 border rounded text-xs mb-2">
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-medium">{adj.current_goal}</p>
                        <Badge className={
                          adj.priority === 'high' ? 'bg-red-600' :
                          adj.priority === 'medium' ? 'bg-amber-600' :
                          'bg-slate-600'
                        }>
                          {adj.priority}
                        </Badge>
                      </div>
                      <p className="text-blue-700 mt-1"><strong>Change:</strong> {adj.recommended_change}</p>
                      <p className="text-slate-700 mt-1"><strong>Rationale:</strong> {adj.rationale}</p>
                      <p className="text-green-700 mt-1"><strong>Evidence:</strong> {adj.evidence_source}</p>
                    </div>
                  ))}
                </div>
              )}

              {suggestions.new_goals?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Proposed New Goals</h4>
                  {suggestions.new_goals.map((goal, idx) => (
                    <div key={idx} className="p-2 bg-green-50 border border-green-200 rounded text-xs mb-2">
                      <div className="flex items-start gap-2">
                        <Target className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-green-900">{goal.proposed_goal}</p>
                          <p className="text-slate-700 mt-1">Domain: {goal.ndis_domain}</p>
                          <p className="text-green-700 mt-1">{goal.rationale}</p>
                          <p className="text-slate-700 mt-1">Timeframe: {goal.timeframe}</p>
                          {goal.success_criteria?.length > 0 && (
                            <div className="mt-1">
                              <p className="font-medium">Success Criteria:</p>
                              <ul className="ml-4 space-y-0.5">
                                {goal.success_criteria.map((crit, i) => (
                                  <li key={i}>• {crit}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="interventions" className="space-y-2">
              {suggestions.intervention_changes?.map((change, idx) => (
                <div key={idx} className="p-2 bg-blue-50 rounded text-xs">
                  <p className="font-medium">{change.current_intervention}</p>
                  <p className="text-blue-700 mt-1"><strong>Modification:</strong> {change.recommended_modification}</p>
                  <p className="text-slate-700 mt-1"><strong>Evidence:</strong> {change.effectiveness_evidence}</p>
                  <p className="text-green-700 mt-1"><strong>Expected Impact:</strong> {change.expected_impact}</p>
                </div>
              ))}

              {suggestions.support_intensity && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded mt-3">
                  <p className="text-sm font-medium mb-2">Service Intensity Recommendation</p>
                  <div className="text-xs space-y-1">
                    <p><strong>Current:</strong> {suggestions.support_intensity.current_frequency}</p>
                    <p><strong>Recommended:</strong> {suggestions.support_intensity.recommended_frequency}</p>
                    <p className="text-slate-700 mt-1">{suggestions.support_intensity.rationale}</p>
                    <p className="text-blue-700 mt-1">{suggestions.support_intensity.implementation_approach}</p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="milestones" className="space-y-2">
              {suggestions.milestone_updates?.map((update, idx) => (
                <div key={idx} className="p-2 border rounded text-xs">
                  <p className="font-medium">{update.goal_area}</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-red-700"><strong>Current:</strong> {update.current_milestone}</p>
                    <p className="text-green-700"><strong>Revised:</strong> {update.revised_milestone}</p>
                    <p className="text-slate-700"><strong>Reason:</strong> {update.adjustment_reason}</p>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="actions" className="space-y-3">
              {suggestions.risk_mitigation_updates?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Risk Management Updates</h4>
                  {suggestions.risk_mitigation_updates.map((risk, idx) => (
                    <div key={idx} className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-red-900">{risk.risk_area}</p>
                          <p className="text-slate-700 mt-1">Current: {risk.current_strategy}</p>
                          <p className="text-blue-700 mt-1">Update: {risk.recommended_update}</p>
                          <Badge className="mt-1" variant={risk.urgency === 'high' ? 'destructive' : 'outline'}>
                            {risk.urgency}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {suggestions.practitioner_actions?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Practitioner Action Items</h4>
                  <ul className="space-y-1 text-xs">
                    {suggestions.practitioner_actions.map((action, idx) => (
                      <li key={idx} className="flex items-start gap-2 p-2 bg-slate-50 rounded">
                        <TrendingUp className="h-3 w-3 text-teal-600 mt-0.5 flex-shrink-0" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {suggestions.review_recommendations && (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded">
                  <p className="text-sm font-medium mb-2">Review Schedule</p>
                  <div className="text-xs space-y-1">
                    <p><strong>Next Review:</strong> {suggestions.review_recommendations.next_review_date}</p>
                    {suggestions.review_recommendations.review_focus_areas?.length > 0 && (
                      <div>
                        <p className="font-medium mt-2">Focus Areas:</p>
                        <ul className="ml-4 space-y-0.5">
                          {suggestions.review_recommendations.review_focus_areas.map((area, i) => (
                            <li key={i}>• {area}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}