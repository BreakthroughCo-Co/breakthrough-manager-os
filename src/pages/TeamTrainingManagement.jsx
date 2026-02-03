import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Users, TrendingUp, AlertTriangle, CheckCircle, Loader2, Target, Award, BookOpen } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PractitionerCoaching from '../components/training/PractitionerCoaching';

export default function TeamTrainingManagement() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const queryClient = useQueryClient();

  const { data: teamNeeds, isLoading: needsLoading } = useQuery({
    queryKey: ['teamTrainingNeeds'],
    queryFn: () => base44.entities.TeamTrainingNeed.filter({ status: 'identified' }),
    initialData: [],
  });

  const { data: practitioners } = useQuery({
    queryKey: ['practitioners'],
    queryFn: () => base44.entities.Practitioner.filter({ status: 'active' }),
    initialData: [],
  });

  const handleAnalyzeTeamNeeds = async () => {
    setIsAnalyzing(true);
    try {
      const result = await base44.functions.invoke('analyzeTeamTrainingNeeds', {
        trigger_type: 'skill_gap_analysis',
      });
      setAnalysisResult(result.data);
      queryClient.invalidateQueries({ queryKey: ['teamTrainingNeeds'] });
    } catch (error) {
      alert('Failed to analyze team needs: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-blue-100 text-blue-800 border-blue-200',
    };
    return colors[priority] || colors.medium;
  };

  const getAffectedPractitioners = (need) => {
    try {
      const ids = JSON.parse(need.affected_practitioners || '[]');
      return practitioners.filter(p => ids.includes(p.id));
    } catch {
      return [];
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Brain className="w-8 h-8 text-indigo-600" />
              Team Training Intelligence
            </h1>
            <p className="text-slate-600 mt-2">
              AI-powered team-wide training needs analysis and adaptive learning recommendations
            </p>
          </div>
          <Button
            onClick={handleAnalyzeTeamNeeds}
            disabled={isAnalyzing}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Analyze Team Needs
              </>
            )}
          </Button>
        </div>

        {/* Analysis Results Alert */}
        {analysisResult && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Analysis complete! Identified {analysisResult.team_training_needs?.length || 0} training needs affecting {analysisResult.analysis_summary?.total_practitioners} practitioners.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="needs" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="needs">Team Needs</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          {/* Team Needs Tab */}
          <TabsContent value="needs" className="space-y-4">
            {needsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : teamNeeds.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-600">No team training needs identified yet.</p>
                  <p className="text-sm text-slate-500 mt-2">Run an analysis to identify gaps.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {teamNeeds.map((need) => {
                  const affectedPractitioners = getAffectedPractitioners(need);
                  return (
                    <Card key={need.id} className="border-l-4" style={{ borderLeftColor: need.priority === 'critical' ? '#ef4444' : need.priority === 'high' ? '#f97316' : '#eab308' }}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <CardTitle className="text-xl">{need.skill_area}</CardTitle>
                              <Badge className={getPriorityColor(need.priority)}>
                                {need.priority}
                              </Badge>
                            </div>
                            <CardDescription className="text-sm">
                              {need.category}
                            </CardDescription>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold text-slate-900">{need.gap_severity}</div>
                            <div className="text-xs text-slate-500">Severity Score</div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Business Impact */}
                        <div>
                          <h4 className="font-semibold text-sm text-slate-700 mb-2">Business Impact</h4>
                          <p className="text-sm text-slate-600">{need.business_impact}</p>
                        </div>

                        {/* AI Rationale */}
                        {need.ai_rationale && (
                          <div>
                            <h4 className="font-semibold text-sm text-slate-700 mb-2">AI Analysis</h4>
                            <p className="text-sm text-slate-600">{need.ai_rationale}</p>
                          </div>
                        )}

                        {/* Affected Practitioners */}
                        <div>
                          <h4 className="font-semibold text-sm text-slate-700 mb-2">
                            Affected Practitioners ({affectedPractitioners.length})
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {affectedPractitioners.slice(0, 5).map(p => (
                              <Badge key={p.id} variant="outline" className="text-xs">
                                {p.full_name}
                              </Badge>
                            ))}
                            {affectedPractitioners.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{affectedPractitioners.length - 5} more
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Timeline */}
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <div>
                            <span className="font-medium">Identified:</span> {need.identified_date}
                          </div>
                          <div>
                            <span className="font-medium">Target:</span> {need.target_completion_date}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            View Details
                          </Button>
                          <Button size="sm" variant="outline">
                            Assign Training
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    Critical Needs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-red-600">
                    {teamNeeds.filter(n => n.priority === 'critical').length}
                  </div>
                  <p className="text-sm text-slate-600 mt-2">Require immediate action</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                    High Priority
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-orange-600">
                    {teamNeeds.filter(n => n.priority === 'high').length}
                  </div>
                  <p className="text-sm text-slate-600 mt-2">Address within 2 weeks</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    Practitioners Affected
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-indigo-600">
                    {practitioners.length}
                  </div>
                  <p className="text-sm text-slate-600 mt-2">Active team members</p>
                </CardContent>
              </Card>
            </div>

            {/* Category Breakdown */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Needs by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(
                    teamNeeds.reduce((acc, need) => {
                      acc[need.category] = (acc[need.category] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{category}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations">
            <PractitionerCoaching practitioners={practitioners} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}