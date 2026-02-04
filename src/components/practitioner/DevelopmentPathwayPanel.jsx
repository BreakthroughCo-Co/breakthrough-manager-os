import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Target, TrendingUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DevelopmentPathwayPanel({ practitionerId, practitionerName }) {
  const [pathway, setPathway] = useState(null);

  const pathwayMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generateDevelopmentPathway', {
        practitioner_id: practitionerId
      });
      return response.data;
    },
    onSuccess: (data) => {
      setPathway(data.development_pathway);
    }
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Development Pathway</CardTitle>
          <Button 
            size="sm" 
            onClick={() => pathwayMutation.mutate()}
            disabled={pathwayMutation.isPending}
          >
            <GraduationCap className="h-4 w-4 mr-2" />
            {pathwayMutation.isPending ? 'Analyzing...' : 'Generate Pathway'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!pathway ? (
          <p className="text-sm text-slate-600">Generate personalized development pathway based on performance insights</p>
        ) : (
          <Tabs defaultValue="gaps">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="gaps">Skill Gaps</TabsTrigger>
              <TabsTrigger value="training">Courses</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="gaps" className="space-y-2">
              {pathway.skill_gap_analysis?.map((gap, idx) => (
                <div key={idx} className="p-3 border rounded">
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-medium text-sm">{gap.skill_area}</span>
                    <Badge className={
                      gap.gap_severity === 'high' ? 'bg-red-600' :
                      gap.gap_severity === 'medium' ? 'bg-amber-600' :
                      'bg-blue-600'
                    }>
                      {gap.gap_severity}
                    </Badge>
                  </div>
                  <div className="text-xs space-y-1">
                    <p><strong>Current:</strong> {gap.current_level}</p>
                    <p><strong>Target:</strong> {gap.target_level}</p>
                    <p className="text-slate-600">{gap.impact_on_performance}</p>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="training" className="space-y-2">
              {pathway.recommended_courses?.map((course, idx) => (
                <div key={idx} className="p-3 border rounded">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="font-medium text-sm">{course.course_name}</p>
                      <p className="text-xs text-slate-600">{course.provider}</p>
                    </div>
                    <Badge variant="outline">{course.relevance_score}/10</Badge>
                  </div>
                  <div className="flex gap-4 text-xs text-slate-700 mt-2">
                    <span><strong>Type:</strong> {course.course_type}</span>
                    <span><strong>Duration:</strong> {course.estimated_duration}</span>
                  </div>
                  {course.cost_estimate && (
                    <p className="text-xs text-green-700 mt-1">{course.cost_estimate}</p>
                  )}
                </div>
              ))}
            </TabsContent>

            <TabsContent value="timeline" className="space-y-3">
              {pathway.timeline && (
                <>
                  <div className="p-3 bg-red-50 rounded">
                    <p className="text-xs font-medium mb-1 flex items-center gap-2">
                      <Target className="h-3 w-3" />
                      Immediate Actions
                    </p>
                    <ul className="text-xs space-y-1">
                      {pathway.timeline.immediate_actions?.map((action, i) => (
                        <li key={i}>• {action}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3 bg-amber-50 rounded">
                    <p className="text-xs font-medium mb-1">3-Month Goals</p>
                    <ul className="text-xs space-y-1">
                      {pathway.timeline.three_month_goals?.map((goal, i) => (
                        <li key={i}>• {goal}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3 bg-green-50 rounded">
                    <p className="text-xs font-medium mb-1">12-Month Goals</p>
                    <ul className="text-xs space-y-1">
                      {pathway.timeline.twelve_month_goals?.map((goal, i) => (
                        <li key={i}>• {goal}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}