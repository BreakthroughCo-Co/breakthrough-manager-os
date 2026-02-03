import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, TrendingUp, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';

export default function PractitionerMatchingPanel({ recommendations, isLoading }) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  if (!recommendations) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32 text-slate-500">
          No recommendations available
        </CardContent>
      </Card>
    );
  }

  const { top_recommendations = [], key_matching_factors = [], success_metrics = [] } = recommendations;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Recommended Practitioner Matches
        </CardTitle>
        <CardDescription>
          AI-powered recommendations based on client profile, goals, and motivation assessment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Top Recommendations */}
        <div className="space-y-3">
          {top_recommendations.map((rec, idx) => (
            <Card key={idx} className={idx === 0 ? 'border-green-300 bg-green-50' : 'border-slate-200'}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-semibold">
                        {rec.rank}
                      </span>
                      <h3 className="font-semibold text-slate-900">{rec.practitioner_name}</h3>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{rec.alignment_summary}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-600">Match Score</div>
                    <div className="text-2xl font-bold text-blue-600">{rec.match_score}</div>
                    <span className="text-xs text-slate-500">/100</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Caseload Fit */}
                <div className="bg-white rounded p-3">
                  <p className="text-xs font-semibold text-slate-600 mb-1">Caseload Fit</p>
                  <p className="text-sm text-slate-700">{rec.caseload_fit}</p>
                </div>

                {/* Key Strengths */}
                {rec.key_strengths?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      Key Strengths
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {rec.key_strengths.map((strength, sidx) => (
                        <Badge key={sidx} variant="secondary" className="text-xs">
                          {strength}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skill Alignment */}
                {rec.skill_alignment?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                      <Zap className="h-3 w-3 text-blue-600" />
                      Relevant Skills
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {rec.skill_alignment.map((skill, sidx) => (
                        <Badge key={sidx} className="bg-blue-100 text-blue-800 text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risk Factors */}
                {rec.risk_factors?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-orange-600" />
                      Risk Factors
                    </p>
                    <ul className="space-y-1">
                      {rec.risk_factors.map((risk, ridx) => (
                        <li key={ridx} className="text-xs text-slate-600 flex gap-2">
                          <span className="text-orange-600">•</span>
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Mitigation */}
                {rec.mitigation_strategies?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-2">Mitigation Strategies</p>
                    <ul className="space-y-1">
                      {rec.mitigation_strategies.map((strategy, midx) => (
                        <li key={midx} className="text-xs text-slate-700 flex gap-2">
                          <span className="text-green-600">→</span>
                          {strategy}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Onboarding */}
                {rec.onboarding_approach && (
                  <div className="bg-blue-50 rounded p-3 border border-blue-200">
                    <p className="text-xs font-semibold text-blue-900 mb-1">Recommended Onboarding</p>
                    <p className="text-sm text-blue-800">{rec.onboarding_approach}</p>
                  </div>
                )}

                <Button className="w-full mt-2" size="sm">
                  Assign Practitioner
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Key Matching Factors */}
        {key_matching_factors?.length > 0 && (
          <Card className="bg-slate-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Key Matching Factors</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {key_matching_factors.map((factor, idx) => (
                  <li key={idx} className="text-sm text-slate-700 flex gap-2">
                    <span className="text-slate-400">→</span>
                    {factor}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Success Metrics */}
        {success_metrics?.length > 0 && (
          <Card className="bg-slate-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Success Metrics to Monitor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {success_metrics.map((metric, idx) => (
                  <div key={idx} className="bg-white rounded p-3 border border-slate-200">
                    <p className="font-semibold text-sm text-slate-900">{metric.metric}</p>
                    <div className="grid grid-cols-2 gap-2 mt-1 text-xs">
                      <div>
                        <span className="text-slate-600">Period:</span> {metric.measurement_period_days}d
                      </div>
                      <div>
                        <span className="text-slate-600">Target:</span> {metric.target}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}