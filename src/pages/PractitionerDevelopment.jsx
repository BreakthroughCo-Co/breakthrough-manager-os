import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, BookOpen, Users } from 'lucide-react';

export default function PractitionerDevelopment() {
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      const result = await base44.functions.invoke('analyzePractitionerDevelopment', {});
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
          Analyzing practitioner development...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Practitioner Professional Development</h1>
          <p className="text-muted-foreground mt-1">Personalized development plans, CPD tracking, skill gap analysis</p>
        </div>
        <Button onClick={handleAnalyze} className="bg-teal-600 hover:bg-teal-700">
          <RefreshCw className="w-4 h-4 mr-2" />
          Analyze
        </Button>
      </div>

      {analysis && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">Practitioners</p>
                <p className="text-3xl font-bold">{analysis.total_practitioners}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">Avg CPD Hours</p>
                <p className="text-3xl font-bold">{(analysis.practitioner_summaries.reduce((sum, p) => sum + p.cpdHours, 0) / analysis.total_practitioners).toFixed(1)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">Critical Skill Gaps</p>
                <p className="text-3xl font-bold">{analysis.development_analysis.skill_gap_summary?.filter(s => s.priority === 'critical').length || 0}</p>
              </CardContent>
            </Card>
          </div>

          {/* Development Plans */}
          {analysis.development_analysis.development_plans?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Individual Development Plans
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analysis.development_analysis.development_plans.slice(0, 8).map((plan, idx) => (
                  <div key={idx} className="p-3 border rounded">
                    <h4 className="font-semibold text-sm mb-2">{plan.practitioner_name}</h4>
                    
                    <div className="mb-2">
                      <p className="text-xs font-medium text-slate-700 mb-1">Current Capability</p>
                      <p className="text-xs text-slate-600">{plan.current_capability}</p>
                    </div>

                    {plan.skill_gaps?.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs font-medium text-slate-700 mb-1">Gaps to Address</p>
                        <div className="flex flex-wrap gap-1">
                          {plan.skill_gaps.slice(0, 2).map((gap, gIdx) => (
                            <Badge key={gIdx} variant="outline" className="text-xs">{gap}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {plan.recommended_training?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-700 mb-1">Recommended Training</p>
                        <ul className="text-xs text-slate-600 list-disc list-inside">
                          {plan.recommended_training.slice(0, 2).map((training, tIdx) => (
                            <li key={tIdx}>{training}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Skill Gap Summary */}
          {analysis.development_analysis.skill_gap_summary?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Critical Skill Gaps (Team-Wide)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {analysis.development_analysis.skill_gap_summary.filter(s => s.priority === 'critical' || s.priority === 'high').map((gap, idx) => (
                  <div key={idx} className="p-3 border rounded">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-sm">{gap.skill_area}</h4>
                      <Badge className={gap.priority === 'critical' ? 'bg-red-600' : 'bg-amber-600'}>
                        {gap.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 mb-1">Affects {gap.affected_practitioners} practitioners</p>
                    <p className="text-xs text-slate-600">Impact: {gap.impact_on_clients}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* CPD Recommendations */}
          {analysis.development_analysis.cpd_recommendations?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>CPD & Training Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {analysis.development_analysis.cpd_recommendations.slice(0, 6).map((rec, idx) => (
                  <div key={idx} className="p-3 border rounded">
                    <h4 className="font-semibold text-sm mb-2">{rec.practitioner_name}</h4>
                    {rec.mandatory_training?.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs font-medium text-red-700 mb-1">Mandatory Training Due:</p>
                        <ul className="text-xs text-red-600 list-disc list-inside">
                          {rec.mandatory_training.slice(0, 1).map((t, tIdx) => (
                            <li key={tIdx}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {rec.elective_training?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-700 mb-1">Recommended:</p>
                        <ul className="text-xs text-slate-600 list-disc list-inside">
                          {rec.elective_training.slice(0, 1).map((t, tIdx) => (
                            <li key={tIdx}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Team Strategy */}
          {analysis.development_analysis.team_strategy && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Team Development Strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-slate-50 rounded">
                  <p className="font-semibold text-sm mb-1">Overall Team Capability</p>
                  <p className="text-sm text-slate-700">{analysis.development_analysis.team_strategy.overall_capability}</p>
                </div>

                {analysis.development_analysis.team_strategy.critical_gaps?.length > 0 && (
                  <div className="p-3 bg-red-50 rounded">
                    <p className="font-semibold text-sm text-red-900 mb-2">Critical Team Gaps</p>
                    <ul className="text-sm text-red-800 space-y-1">
                      {analysis.development_analysis.team_strategy.critical_gaps.slice(0, 3).map((gap, idx) => (
                        <li key={idx}>• {gap}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.development_analysis.team_strategy.knowledge_sharing_ideas?.length > 0 && (
                  <div className="p-3 bg-emerald-50 rounded">
                    <p className="font-semibold text-sm text-emerald-900 mb-2">Knowledge Sharing Ideas</p>
                    <ul className="text-sm text-emerald-800 space-y-1">
                      {analysis.development_analysis.team_strategy.knowledge_sharing_ideas.slice(0, 3).map((idea, idx) => (
                        <li key={idx}>→ {idea}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* CPD Summary by Practitioner */}
          <Card>
            <CardHeader>
              <CardTitle>CPD Hours Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analysis.practitioner_summaries
                  .sort((a, b) => b.cpdHours - a.cpdHours)
                  .slice(0, 10)
                  .map((prac, idx) => (
                    <div key={idx} className="p-2 border rounded flex items-center justify-between text-sm">
                      <span className="font-medium">{prac.practitioner_name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-600">{prac.cpdHours} hours</span>
                        <Badge variant="outline">{prac.training_completed} completed</Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}