import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, TrendingUp, Users, AlertCircle } from 'lucide-react';

export default function PractitionerSkillMatrix() {
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: matrix, refetch, isLoading } = useQuery({
    queryKey: ['skillMatrix'],
    enabled: false,
    queryFn: async () => {
      setIsGenerating(true);
      try {
        const result = await base44.functions.invoke('generatePractitionerSkillMatrix', {});
        return result.data;
      } finally {
        setIsGenerating(false);
      }
    }
  });

  if (isLoading || isGenerating) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Analyzing practitioner performance data...
        </CardContent>
      </Card>
    );
  }

  if (!matrix) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Practitioner Skill Matrix</CardTitle>
          <CardDescription>AI-generated assessment of practitioner strengths and development areas</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => refetch()} className="w-full">
            Generate Skill Matrix
          </Button>
        </CardContent>
      </Card>
    );
  }

  const skillMatrix = matrix.skill_matrix;
  const rawMetrics = matrix.raw_metrics;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Individual Profiles</TabsTrigger>
          <TabsTrigger value="mentoring">Peer Mentoring</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {skillMatrix.team_insights && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Team Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2 text-slate-700">
                {typeof skillMatrix.team_insights === 'string' ? (
                  <p>{skillMatrix.team_insights}</p>
                ) : (
                  Object.entries(skillMatrix.team_insights).map(([key, value]) => (
                    <div key={key}>
                      <p className="font-semibold text-slate-900 capitalize">{key.replace(/_/g, ' ')}</p>
                      <p>{typeof value === 'string' ? value : JSON.stringify(value)}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* Risk Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Risk Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {skillMatrix.practitioners?.map(p => {
                const metrics = rawMetrics?.find(m => m.practitioner_id === p.practitioner_id);
                const riskScore = metrics?.development_metrics?.risk_score || 0;
                const riskLevel = riskScore > 10 ? 'high' : riskScore > 5 ? 'medium' : 'low';

                if (p.risk_indicators?.length === 0) return null;

                return (
                  <div key={p.practitioner_id} className="flex items-start justify-between p-2 border rounded hover:bg-slate-50">
                    <div>
                      <p className="text-sm font-semibold">{p.practitioner_name}</p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {p.risk_indicators?.slice(0, 2).map((indicator, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {indicator}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Badge className={
                      riskLevel === 'high' ? 'bg-red-600' :
                      riskLevel === 'medium' ? 'bg-yellow-600' :
                      'bg-green-600'
                    }>
                      {riskLevel}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Individual Profiles */}
        <TabsContent value="details" className="space-y-4 mt-4">
          {skillMatrix.practitioners?.map(practitioner => (
            <Card key={practitioner.practitioner_id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{practitioner.practitioner_name}</CardTitle>
                    <CardDescription>{practitioner.role}</CardDescription>
                  </div>
                  <Badge className="bg-slate-600">{practitioner.current_proficiency}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Performance Metrics */}
                {(() => {
                  const metrics = rawMetrics?.find(m => m.practitioner_id === practitioner.practitioner_id);
                  return metrics ? (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-slate-600">Incidents</p>
                        <p className="font-semibold">{metrics.performance_metrics.incident_count}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Caseload</p>
                        <p className="font-semibold">{metrics.caseload}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Goals Achieved</p>
                        <p className="font-semibold">{metrics.performance_metrics.client_goals_achieved}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Training Completed</p>
                        <p className="font-semibold">{metrics.development_metrics.completed_training_modules}</p>
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Strengths */}
                {practitioner.strengths?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-900 mb-2">Strengths</p>
                    <ul className="text-xs space-y-1">
                      {practitioner.strengths.map((strength, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Development Areas */}
                {practitioner.development_areas?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-900 mb-2">Areas for Development</p>
                    <ul className="text-xs space-y-1">
                      {practitioner.development_areas.map((area, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-blue-600">→</span>
                          <span>{area}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Risk Indicators */}
                {practitioner.risk_indicators?.length > 0 && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-3 w-3" />
                    <AlertDescription className="text-xs">
                      {practitioner.risk_indicators.join(', ')}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Peer Mentoring */}
        <TabsContent value="mentoring" className="space-y-4 mt-4">
          {skillMatrix.peer_mentor_pairings?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Recommended Peer Mentoring Pairings
                </CardTitle>
                <CardDescription>
                  {skillMatrix.peer_mentor_pairings.length} pairing(s) identified
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {skillMatrix.peer_mentor_pairings.map((pairing, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 border rounded hover:bg-slate-50">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{pairing.mentor_name}</span>
                        <span className="text-xs text-slate-500">→ mentors →</span>
                        <span className="text-sm font-semibold">{pairing.mentee_name}</span>
                      </div>
                      <p className="text-xs text-slate-600">Focus: {pairing.focus_area}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Direct Mentor Recommendations */}
          {skillMatrix.practitioners?.filter(p => p.recommended_mentors?.length > 0).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Individual Mentor Suggestions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {skillMatrix.practitioners
                  ?.filter(p => p.recommended_mentors?.length > 0)
                  .map(practitioner => (
                    <div key={practitioner.practitioner_id} className="border rounded p-3">
                      <p className="text-sm font-semibold mb-2">{practitioner.practitioner_name}</p>
                      <p className="text-xs text-slate-600 mb-2">Suggested mentors:</p>
                      <div className="flex flex-wrap gap-1">
                        {practitioner.recommended_mentors?.map((mentor, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {mentor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Button onClick={() => refetch()} variant="outline" className="w-full">
        Regenerate Matrix
      </Button>
    </div>
  );
}