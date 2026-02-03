import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Calendar } from 'lucide-react';

export default function NDISPlanManagement() {
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      const result = await base44.functions.invoke('analyzePlanRenewals', {});
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
          Analyzing plan renewals...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">NDIS Plan Management</h1>
          <p className="text-muted-foreground mt-1">Analyze renewals, forecast budget adjustments, manage plan reviews</p>
        </div>
        <Button onClick={handleAnalyze} className="bg-teal-600 hover:bg-teal-700">
          <RefreshCw className="w-4 h-4 mr-2" />
          Analyze Renewals
        </Button>
      </div>

      {analysis && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">Upcoming Renewals (90d)</p>
                <p className="text-3xl font-bold">{analysis.upcoming_renewals_count}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">Avg Utilization Rate</p>
                <p className="text-3xl font-bold">
                  {(analysis.renewal_summaries.reduce((sum, r) => sum + parseFloat(r.utilization_percentage), 0) / analysis.renewal_summaries.length).toFixed(0)}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">Avg Goals Achieved</p>
                <p className="text-3xl font-bold text-emerald-600">
                  {(analysis.renewal_summaries.reduce((sum, r) => sum + r.achieved_goals, 0) / analysis.renewal_summaries.length).toFixed(1)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Renewal Candidates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Plan Renewal Candidates (Next 90 Days)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {analysis.renewal_summaries.map((renewal, idx) => (
                <div key={idx} className="p-3 border rounded">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-sm">{renewal.client_name}</h4>
                    <Badge variant="outline">{renewal.months_remaining}m remaining</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 mb-2">
                    <div>Current: ${(renewal.current_funding / 1000).toFixed(0)}k</div>
                    <div>Utilized: {renewal.utilization_percentage}%</div>
                    <div>Goals: {renewal.achieved_goals}/{renewal.total_goals}</div>
                  </div>
                  <p className="text-xs text-slate-600">
                    Renewal: {new Date(renewal.current_plan_end).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Budget Adjustment Recommendations */}
          {analysis.analysis.renewal_candidates?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Budget Adjustment Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {analysis.analysis.renewal_candidates.slice(0, 5).map((candidate, idx) => (
                  <div key={idx} className="p-3 border rounded">
                    <h4 className="font-semibold text-sm mb-2">{candidate.client_name}</h4>
                    <p className="text-xs text-slate-700 mb-1">
                      <strong>Current:</strong> {candidate.current_funding}
                    </p>
                    <p className="text-xs text-slate-700 mb-1">
                      <strong>Recommendation:</strong> {candidate.budget_adjustment_recommendation}
                    </p>
                    <p className="text-xs text-slate-600">
                      New estimate: {candidate.new_budget_estimate}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Goal Adjustment Suggestions */}
          {analysis.analysis.renewal_candidates?.length > 0 && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardHeader>
                <CardTitle className="text-emerald-900">Goal Adjustments for Plan Renewals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {analysis.analysis.renewal_candidates.slice(0, 3).map((candidate, idx) => (
                  <div key={idx} className="p-3 bg-white rounded border border-emerald-200">
                    <h4 className="font-semibold text-emerald-900 text-sm mb-2">{candidate.client_name}</h4>
                    <p className="text-xs text-emerald-800 mb-2">
                      Service Intensity: {candidate.service_intensity_recommendation}
                    </p>
                    {candidate.goal_adjustments?.length > 0 && (
                      <ul className="text-xs text-emerald-800 list-disc list-inside">
                        {candidate.goal_adjustments.slice(0, 2).map((adj, aIdx) => (
                          <li key={aIdx}>{adj}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Plan Review Communication Templates */}
          {analysis.analysis.plan_review_templates?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Plan Review Communication Templates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analysis.analysis.plan_review_templates.slice(0, 3).map((template, idx) => (
                  <div key={idx} className="p-3 border rounded bg-slate-50">
                    <h4 className="font-semibold text-sm mb-2">{template.client_name}</h4>
                    <div className="text-xs text-slate-700 space-y-2 mb-2">
                      <div>
                        <p className="font-medium">Progress Summary:</p>
                        <p>{template.progress_summary?.substring(0, 100)}...</p>
                      </div>
                      {template.achievements?.length > 0 && (
                        <div>
                          <p className="font-medium">Key Achievements:</p>
                          <ul className="list-disc list-inside">
                            {template.achievements.slice(0, 2).map((ach, aIdx) => (
                              <li key={aIdx}>{ach}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <Button variant="outline" size="sm">Copy Template</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Renewal Timeline */}
          {analysis.analysis.renewal_timeline?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Plan Renewal Timeline & Milestones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {analysis.analysis.renewal_timeline.map((milestone, idx) => (
                  <div key={idx} className="p-3 border rounded">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-semibold text-sm">{milestone.weeks_before_expiry} weeks before expiry</h4>
                    </div>
                    <p className="text-sm text-slate-700 mb-1">{milestone.action}</p>
                    <p className="text-xs text-slate-600">Responsible: {milestone.responsible_person}</p>
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