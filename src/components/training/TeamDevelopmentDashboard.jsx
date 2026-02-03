import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, TrendingUp, AlertCircle } from 'lucide-react';

export default function TeamDevelopmentDashboard() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: analysis, refetch } = useQuery({
    queryKey: ['teamDevelopment'],
    enabled: false,
    queryFn: async () => {
      setIsAnalyzing(true);
      try {
        const result = await base44.functions.invoke('analyzeTeamDevelopmentNeeds', {
          days_lookback: 90
        });
        return result.data;
      } finally {
        setIsAnalyzing(false);
      }
    }
  });

  const { data: trainingRecs } = useQuery({
    queryKey: ['trainingRecommendations'],
    queryFn: async () => {
      const data = await base44.entities.TrainingRecommendation.list();
      return data || [];
    }
  });

  if (isAnalyzing) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Analyzing team development needs...
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team Development Analysis</CardTitle>
          <CardDescription>Identify skill gaps and training needs</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => refetch()} className="w-full">
            Analyze Team Needs
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Key Findings */}
      {analysis.key_findings?.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            <p className="font-semibold text-amber-900 mb-2">Key Findings</p>
            <ul className="text-xs space-y-1 text-amber-800">
              {analysis.key_findings.slice(0, 3).map((finding, idx) => (
                <li key={idx}>• {finding}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Team Readiness */}
      {analysis.estimated_team_readiness && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Team Readiness
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-xs font-semibold text-slate-900">Current</p>
              <p className="text-sm text-slate-700">{analysis.estimated_team_readiness.current_readiness}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-900">3-Month Outlook</p>
              <p className="text-sm text-slate-700">{analysis.estimated_team_readiness['3_month_outlook']}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skill Gaps by Category */}
      {analysis.skill_gaps_by_category && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Identified Skill Gaps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(analysis.skill_gaps_by_category).map(([category, gaps]) => (
              gaps?.length > 0 && (
                <div key={category}>
                  <p className="text-xs font-semibold text-slate-900 capitalize mb-2">{category}</p>
                  <div className="flex flex-wrap gap-2">
                    {gaps.map((gap, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {gap}
                      </Badge>
                    ))}
                  </div>
                </div>
              )
            ))}
          </CardContent>
        </Card>
      )}

      {/* Team-Wide Training Recommendations */}
      {analysis.team_wide_training_recommendations?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recommended Team Training</CardTitle>
            <CardDescription>
              {analysis.team_wide_training_recommendations.length} training initiative(s) recommended
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysis.team_wide_training_recommendations.map((training, idx) => (
              <div key={idx} className="border rounded p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <h4 className="text-sm font-semibold">{training.training_topic}</h4>
                  <Badge className={
                    training.priority === 'critical' ? 'bg-red-600' :
                    training.priority === 'high' ? 'bg-orange-600' :
                    'bg-blue-600'
                  }>
                    {training.priority}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600">
                  Format: {training.suggested_format} • Duration: {training.duration_hours}h
                </p>
                <p className="text-xs text-slate-700">{training.expected_outcome}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* High Performers as Peer Leaders */}
      {analysis.high_performer_peer_leaders?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Peer Learning Opportunities</CardTitle>
            <CardDescription>Leverage team expertise for development</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {analysis.high_performer_peer_leaders.map((leader, idx) => (
              <div key={idx} className="flex items-start gap-3 p-2 bg-slate-50 rounded">
                <div className="flex-1">
                  <p className="text-sm font-semibold">{leader.name}</p>
                  <p className="text-xs text-slate-600">Strength: {leader.strength_area}</p>
                  <p className="text-xs text-slate-600 mt-1">Could mentor: {leader.could_mentor}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Training Recommendations */}
      {trainingRecs && trainingRecs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Training Assignments</CardTitle>
            <CardDescription>
              {trainingRecs.filter(t => t.status === 'recommended').length} pending
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-48 overflow-y-auto">
            {trainingRecs.slice(0, 5).map(rec => (
              <div key={rec.id} className="text-xs flex items-center justify-between p-2 border rounded">
                <div>
                  <p className="font-semibold text-slate-900">{rec.practitioner_name}</p>
                  <p className="text-slate-600">{rec.training_module_name}</p>
                </div>
                <Badge variant={rec.status === 'recommended' ? 'default' : 'outline'} className="text-xs">
                  {rec.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Button onClick={() => refetch()} variant="outline" className="w-full">
        Refresh Analysis
      </Button>
    </div>
  );
}