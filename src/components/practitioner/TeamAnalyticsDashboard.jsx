import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function TeamAnalyticsDashboard() {
  const [analysis, setAnalysis] = useState(null);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('analyzeTeamPerformance', {
        team_filter: 'all',
        analysis_depth: 'comprehensive'
      });
      return response.data;
    },
    onSuccess: (data) => {
      setAnalysis(data.analysis);
    }
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5 text-teal-600" />
            Team Performance Analytics
          </CardTitle>
          <Button 
            size="sm" 
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            {analyzeMutation.isPending ? 'Analyzing...' : 'Analyze Team'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!analysis ? (
          <p className="text-sm text-slate-600">Generate team-wide performance insights and development recommendations</p>
        ) : (
          <Tabs defaultValue="strengths">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="strengths">Strengths</TabsTrigger>
              <TabsTrigger value="development">Development</TabsTrigger>
              <TabsTrigger value="initiatives">Initiatives</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
            </TabsList>

            <TabsContent value="strengths" className="space-y-2">
              {analysis.team_strengths?.map((strength, idx) => (
                <div key={idx} className="p-3 bg-green-50 rounded">
                  <p className="font-medium text-sm">{strength.strength}</p>
                  <p className="text-xs text-slate-600 mt-1">{strength.evidence}</p>
                  <p className="text-xs text-blue-700 mt-1"><strong>Replicate via:</strong> {strength.replication_strategy}</p>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="development" className="space-y-2">
              {analysis.common_development_areas?.map((area, idx) => (
                <div key={idx} className="p-3 bg-amber-50 rounded">
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-medium text-sm">{area.area}</span>
                    <Badge variant="outline">{area.prevalence}</Badge>
                  </div>
                  <p className="text-xs text-slate-600">{area.impact_on_service}</p>
                  <p className="text-xs text-green-700 mt-1"><strong>Training:</strong> {area.recommended_training}</p>
                </div>
              ))}

              {analysis.systemic_issues?.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    Systemic Issues
                  </p>
                  {analysis.systemic_issues.map((issue, idx) => (
                    <div key={idx} className="p-2 bg-red-50 border border-red-200 rounded mb-2 text-xs">
                      <div className="flex items-start justify-between">
                        <span className="font-medium">{issue.issue}</span>
                        <Badge className="bg-red-600">{issue.severity}</Badge>
                      </div>
                      <p className="text-slate-700 mt-1">Root: {issue.root_cause}</p>
                      <p className="text-blue-700 mt-1"><strong>Fix:</strong> {issue.organizational_fix}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="initiatives" className="space-y-2">
              {analysis.team_development_initiatives?.map((initiative, idx) => (
                <div key={idx} className="p-3 bg-white border rounded">
                  <p className="font-medium text-sm">{initiative.initiative}</p>
                  <div className="text-xs space-y-1 mt-2">
                    <p><strong>Target:</strong> {initiative.target_participants}</p>
                    <p><strong>Outcome:</strong> {initiative.expected_outcome}</p>
                    <p><strong>Timeline:</strong> {initiative.timeline}</p>
                    {initiative.success_metrics?.length > 0 && (
                      <div className="mt-1">
                        <strong>Metrics:</strong>
                        <ul className="ml-4 list-disc">
                          {initiative.success_metrics.map((metric, i) => (
                            <li key={i}>{metric}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="actions" className="space-y-2">
              {analysis.intervention_priorities?.map((priority, idx) => (
                <div key={idx} className="p-2 bg-white border-l-4 border-red-400 rounded">
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-medium text-sm">{priority.action}</span>
                    <Badge className="bg-red-600">{priority.priority}</Badge>
                  </div>
                  <div className="text-xs text-slate-700 space-y-1">
                    <p><strong>Owner:</strong> {priority.responsible_party}</p>
                    <p><strong>Deadline:</strong> {priority.deadline}</p>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}