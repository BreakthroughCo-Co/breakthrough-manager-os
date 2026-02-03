import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function ClientGoalProgressAnalysis({ clientId }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: analysis, refetch } = useQuery({
    queryKey: ['goalProgress', clientId],
    enabled: false,
    queryFn: async () => {
      setIsAnalyzing(true);
      try {
        const result = await base44.functions.invoke('analyzeClientGoalProgress', {
          client_id: clientId
        });
        return result.data;
      } finally {
        setIsAnalyzing(false);
      }
    }
  });

  const statusColors = {
    on_track: 'bg-green-100 text-green-800',
    at_risk: 'bg-yellow-100 text-yellow-800',
    stagnating: 'bg-orange-100 text-orange-800',
    regressing: 'bg-red-100 text-red-800'
  };

  const statusIcons = {
    on_track: <CheckCircle2 className="h-4 w-4 text-green-600" />,
    at_risk: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
    stagnating: <AlertTriangle className="h-4 w-4 text-orange-600" />,
    regressing: <AlertTriangle className="h-4 w-4 text-red-600" />
  };

  if (isAnalyzing) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Analyzing goal progress...
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Goal Progress Analysis</CardTitle>
          <CardDescription>Analyze progress and identify plan modifications</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => refetch()} className="w-full">
            Analyze Goals
          </Button>
        </CardContent>
      </Card>
    );
  }

  const goalsNeedingReview = analysis.goal_analyses.filter(g => g.flag_for_review);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-slate-900">{analysis.total_goals}</p>
            <p className="text-xs text-slate-600">Total Goals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-green-600">{analysis.total_goals - analysis.goals_flagged_for_review}</p>
            <p className="text-xs text-slate-600">On Track</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-red-600">{analysis.goals_flagged_for_review}</p>
            <p className="text-xs text-slate-600">Need Review</p>
          </CardContent>
        </Card>
      </div>

      {/* Alert if review task created */}
      {analysis.review_task_created && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700">
            Review task created. {analysis.stagnating_goals} goal(s) showing stagnation or regression.
          </AlertDescription>
        </Alert>
      )}

      {/* Goals by Status */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({analysis.goal_analyses.length})</TabsTrigger>
          <TabsTrigger value="ontrack">On Track</TabsTrigger>
          <TabsTrigger value="atrisk">At Risk</TabsTrigger>
          <TabsTrigger value="flag">Flagged ({goalsNeedingReview.length})</TabsTrigger>
        </TabsList>

        {['all', 'ontrack', 'atrisk', 'flag'].map(tab => {
          const filtered = tab === 'all' ? analysis.goal_analyses :
                         tab === 'ontrack' ? analysis.goal_analyses.filter(g => g.progress_status === 'on_track') :
                         tab === 'atrisk' ? analysis.goal_analyses.filter(g => g.progress_status === 'at_risk') :
                         goalsNeedingReview;

          return (
            <TabsContent key={tab} value={tab} className="space-y-3 mt-4">
              {filtered.map(goal => (
                <Card key={goal.goal_id}>
                  <CardContent className="pt-6 space-y-3">
                    {/* Goal Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{goal.goal_description}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={statusColors[goal.progress_status]}>
                            {goal.progress_status.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {goal.urgency}
                          </Badge>
                        </div>
                      </div>
                      {statusIcons[goal.progress_status]}
                    </div>

                    {/* Progress Summary */}
                    <div className="bg-slate-50 rounded p-2 text-xs text-slate-700">
                      {goal.progress_summary}
                    </div>

                    {/* Key Observations */}
                    {goal.key_observations?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-900 mb-1">Key Observations</p>
                        <ul className="text-xs space-y-1">
                          {goal.key_observations.map((obs, idx) => (
                            <li key={idx} className="text-slate-700 flex gap-2">
                              <span className="text-slate-600">•</span>
                              <span>{obs}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Intervention Effectiveness */}
                    {goal.intervention_effectiveness && (
                      <div className="bg-blue-50 rounded p-2 border border-blue-200">
                        <p className="text-xs font-semibold text-blue-900 mb-1">Intervention Assessment</p>
                        <p className="text-xs text-blue-800">{goal.intervention_effectiveness}</p>
                      </div>
                    )}

                    {/* BSP Modifications */}
                    {goal.bsp_modification_suggestions?.length > 0 && (
                      <div className="bg-purple-50 rounded p-2 border border-purple-200">
                        <p className="text-xs font-semibold text-purple-900 mb-1">Suggested Plan Modifications</p>
                        <ul className="text-xs space-y-1">
                          {goal.bsp_modification_suggestions.map((suggestion, idx) => (
                            <li key={idx} className="text-purple-800 flex gap-2">
                              <span className="text-purple-600">→</span>
                              <span>{suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Alternative Approaches */}
                    {goal.alternative_approaches?.length > 0 && (
                      <details className="text-xs">
                        <summary className="cursor-pointer font-semibold text-slate-700 mb-2">
                          Alternative Approaches ({goal.alternative_approaches.length})
                        </summary>
                        <ul className="space-y-1 ml-4">
                          {goal.alternative_approaches.map((alt, idx) => (
                            <li key={idx} className="text-slate-600">• {alt}</li>
                          ))}
                        </ul>
                      </details>
                    )}

                    {/* Recommended Action */}
                    {goal.recommended_action && (
                      <div className="border-l-4 border-l-amber-500 bg-amber-50 p-2">
                        <p className="text-xs font-semibold text-amber-900">Next Action</p>
                        <p className="text-xs text-amber-800">{goal.recommended_action}</p>
                      </div>
                    )}

                    {/* Review Frequency */}
                    {goal.review_frequency_suggestion && (
                      <div className="text-xs text-slate-600 italic">
                        Next review: {goal.review_frequency_suggestion}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          );
        })}
      </Tabs>

      <Button onClick={() => refetch()} variant="outline" className="w-full">
        Refresh Analysis
      </Button>
    </div>
  );
}