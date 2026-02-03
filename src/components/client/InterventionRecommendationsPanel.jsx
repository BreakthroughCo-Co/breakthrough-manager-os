import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, AlertTriangle, Target, Users, BarChart3, Clock } from 'lucide-react';

export default function InterventionRecommendationsPanel({ client, interventions, isLoading }) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  if (!interventions) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32 text-slate-500">
          No intervention recommendations available.
        </CardContent>
      </Card>
    );
  }

  const { intervention_recommendations: rec } = interventions;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Personalized Intervention Plan for {client.client_name}
        </CardTitle>
        <CardDescription>
          Risk Score: {client.disengagement_risk_score}/100 | {client.at_risk_goals || 0} goals at risk
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="immediate" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="immediate">Immediate</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="practitioner">Practitioner</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          </TabsList>

          {/* Immediate Strategies */}
          <TabsContent value="immediate" className="space-y-4 mt-4">
            {rec?.immediate_strategies?.map((strategy, idx) => (
              <Card key={idx} className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs text-white font-semibold">
                      {idx + 1}
                    </span>
                    {strategy.strategy_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-slate-700">{strategy.description}</p>

                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-2">Implementation Steps:</p>
                    <ul className="space-y-1">
                      {strategy.implementation_steps?.map((step, sidx) => (
                        <li key={sidx} className="text-sm text-slate-600 flex gap-2">
                          <span className="text-blue-600">•</span>
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-white rounded p-2">
                      <p className="text-xs text-slate-600">Expected Impact</p>
                      <p className="text-sm font-semibold">{strategy.expected_impact}</p>
                    </div>
                    <div className="bg-white rounded p-2">
                      <p className="text-xs text-slate-600">Timeline</p>
                      <p className="text-sm font-semibold">{strategy.timeline_weeks} weeks</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Goal Adjustments */}
          <TabsContent value="goals" className="space-y-4 mt-4">
            {rec?.goal_adjustments?.map((goal, idx) => (
              <Card key={idx} className="bg-amber-50 border-amber-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{goal.goal_description}</CardTitle>
                  <CardDescription className="flex gap-2 mt-2">
                    <Badge variant="outline">{goal.ndis_domain}</Badge>
                    <Badge variant="outline">{goal.current_status}</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-white rounded p-3">
                    <p className="text-xs font-semibold text-slate-600 mb-1">Recommended Adjustment</p>
                    <p className="text-sm text-slate-700">{goal.recommended_adjustment}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded p-2">
                      <p className="text-xs text-slate-600">New Timeline</p>
                      <p className="text-sm font-semibold">{goal.new_timeline_months} months</p>
                    </div>
                  </div>

                  {goal.suggested_interventions?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-2">Suggested Interventions:</p>
                      <div className="flex flex-wrap gap-2">
                        {goal.suggested_interventions.map((intervention, iidx) => (
                          <Badge key={iidx} variant="secondary" className="text-xs">
                            {intervention}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Engagement Re-entry */}
          <TabsContent value="engagement" className="space-y-4 mt-4">
            {rec?.engagement_reentry_plan && (
              <div className="space-y-3">
                <Alert className="bg-green-50 border-green-200">
                  <AlertTriangle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    <strong>Preferred Contact:</strong> {rec.engagement_reentry_plan.preferred_contact_method}
                    <br />
                    <strong>Frequency:</strong> Every {rec.engagement_reentry_plan.contact_frequency_days} days
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Trust Rebuilding Steps
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {rec.engagement_reentry_plan.trust_rebuilding_steps?.map((step, idx) => (
                        <li key={idx} className="text-sm text-slate-700 flex gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                          {step}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      First Month Milestones
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {rec.engagement_reentry_plan.first_month_milestones?.map((milestone, idx) => (
                        <li key={idx} className="text-sm text-slate-700 flex gap-2">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600">
                            {idx + 1}
                          </span>
                          {milestone}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Practitioner Recommendations */}
          <TabsContent value="practitioner" className="space-y-4 mt-4">
            {rec?.practitioner_recommendations && (
              <div className="space-y-3">
                {rec.practitioner_recommendations.consider_practitioner_change && (
                  <Alert className="bg-orange-50 border-orange-200">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-700">
                      <strong>Practitioner Change Recommended:</strong> {rec.practitioner_recommendations.change_rationale}
                    </AlertDescription>
                  </Alert>
                )}

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Skills to Develop
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {rec.practitioner_recommendations.skills_to_develop?.map((skill, idx) => (
                        <Badge key={idx} className="bg-blue-100 text-blue-800">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Coaching Focus Areas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {rec.practitioner_recommendations.coaching_focus_areas?.map((area, idx) => (
                        <li key={idx} className="text-sm text-slate-700 flex gap-2">
                          <span className="text-blue-600">→</span>
                          {area}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Monitoring Plan */}
          <TabsContent value="monitoring" className="space-y-4 mt-4">
            {rec?.monitoring_plan && (
              <div className="space-y-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Weekly Metrics to Track
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {rec.monitoring_plan.weekly_metrics?.map((metric, idx) => (
                        <li key={idx} className="text-sm text-slate-700 flex gap-2">
                          <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          {metric}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Escalation Triggers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {rec.monitoring_plan.escalation_triggers?.map((trigger, idx) => (
                        <li key={idx} className="text-sm text-red-700 flex gap-2">
                          <span className="inline-block h-2 w-2 rounded-full bg-red-600 flex-shrink-0 mt-1.5"></span>
                          {trigger}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-600 mb-1">Reassessment Timeline</p>
                  <p className="text-sm font-semibold text-slate-900">
                    In {rec.monitoring_plan.reassessment_date_days} days
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}