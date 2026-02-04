import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Award, AlertTriangle, BookOpen, Target } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function PerformanceInsightsPanel({ practitionerId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['practitionerPerformance', practitionerId],
    queryFn: async () => {
      const response = await base44.functions.invoke('analyzePractitionerPerformance', {
        practitioner_id: practitionerId
      });
      return response.data;
    },
    enabled: !!practitionerId
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">Analyzing performance data...</p>
        </CardContent>
      </Card>
    );
  }

  if (!data?.success) return null;

  const insights = data.performance_insights;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-teal-600" />
          Performance Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg">
          <div>
            <p className="text-sm text-slate-600">Overall Performance</p>
            <p className="text-2xl font-bold">{insights.overall_rating}/100</p>
          </div>
          <Progress value={insights.overall_rating} className="w-32" />
        </div>

        <div className="text-sm text-slate-700 p-2 bg-slate-50 rounded">
          {insights.performance_summary}
        </div>

        <Tabs defaultValue="strengths">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="strengths">Strengths</TabsTrigger>
            <TabsTrigger value="development">Development</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="career">Career</TabsTrigger>
          </TabsList>

          <TabsContent value="strengths" className="space-y-2">
            {insights.key_strengths?.map((strength, idx) => (
              <div key={idx} className="p-2 bg-green-50 border border-green-200 rounded text-xs">
                <div className="flex items-start gap-2">
                  <Award className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-900">{strength.strength}</p>
                    <p className="text-green-700 mt-1">Evidence: {strength.evidence}</p>
                    <p className="text-green-800 mt-1">Impact: {strength.impact}</p>
                  </div>
                </div>
              </div>
            ))}

            {insights.recognition_opportunities?.length > 0 && (
              <div className="mt-3 p-2 bg-amber-50 rounded">
                <p className="text-xs font-medium mb-1">Recognition Opportunities:</p>
                <ul className="text-xs space-y-1">
                  {insights.recognition_opportunities.map((rec, idx) => (
                    <li key={idx}>• {rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>

          <TabsContent value="development" className="space-y-2">
            {insights.development_areas?.map((area, idx) => (
              <div key={idx} className="p-2 border rounded text-xs">
                <div className="flex items-start justify-between mb-1">
                  <p className="font-medium">{area.area}</p>
                  <Badge className={
                    area.priority === 'high' ? 'bg-red-600' :
                    area.priority === 'medium' ? 'bg-amber-600' :
                    'bg-slate-600'
                  }>
                    {area.priority}
                  </Badge>
                </div>
                <p className="text-slate-700">Gap: {area.current_gap}</p>
                <p className="text-blue-700 mt-1">Action: {area.recommended_action}</p>
              </div>
            ))}

            {insights.risk_factors?.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium">Performance Risk Factors:</p>
                {insights.risk_factors.map((risk, idx) => (
                  <div key={idx} className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-red-900">{risk.risk}</p>
                        <p className="text-red-700 mt-1">Mitigation: {risk.mitigation}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="resources" className="space-y-2">
            {insights.professional_development?.map((resource, idx) => (
              <div key={idx} className="p-2 bg-blue-50 rounded text-xs">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    <p className="font-medium">{resource.resource_name}</p>
                  </div>
                  <Badge variant="outline">{resource.urgency}</Badge>
                </div>
                <p className="text-slate-700">{resource.resource_type}</p>
                <p className="text-blue-700 mt-1">{resource.rationale}</p>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="career" className="space-y-3">
            {insights.career_progression && (
              <div className="p-3 bg-teal-50 border border-teal-200 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-teal-600" />
                  <p className="font-medium">Career Progression Assessment</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-xs text-slate-600">Readiness Level</p>
                    <p className="font-medium">{insights.career_progression.readiness_level}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Recommended Next Step</p>
                    <p>{insights.career_progression.recommended_next_step}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Timeline</p>
                    <p>{insights.career_progression.timeline}</p>
                  </div>
                  {insights.career_progression.prerequisites?.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Prerequisites:</p>
                      <ul className="text-xs space-y-0.5">
                        {insights.career_progression.prerequisites.map((prereq, idx) => (
                          <li key={idx}>• {prereq}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}