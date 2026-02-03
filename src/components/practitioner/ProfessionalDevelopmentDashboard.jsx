import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BookOpen, TrendingUp, Target, Loader2, AlertCircle } from 'lucide-react';

export default function ProfessionalDevelopmentDashboard({ practitionerId }) {
  const [analysisRunning, setAnalysisRunning] = useState(false);

  const { data: practitioner } = useQuery({
    queryKey: ['practitioner', practitionerId],
    queryFn: async () => {
      const practitioners = await base44.entities.Practitioner.list();
      return practitioners?.find(p => p.id === practitionerId);
    }
  });

  const { data: careerPath } = useQuery({
    queryKey: ['careerPath', practitionerId],
    queryFn: async () => {
      const paths = await base44.entities.CareerPathway.list();
      return paths?.find(p => p.practitioner_id === practitionerId);
    }
  });

  const { data: trainingRecommendations } = useQuery({
    queryKey: ['trainingRecommendations', practitionerId],
    queryFn: async () => {
      const recommendations = await base44.entities.TrainingRecommendation.list();
      return recommendations?.filter(t => t.practitioner_id === practitionerId) || [];
    }
  });

  const handleRunAnalysis = async () => {
    setAnalysisRunning(true);
    try {
      const result = await base44.functions.invoke('analyzePractitionerDevelopmentEnhanced', {});
      // Re-fetch data
      setTimeout(() => setAnalysisRunning(false), 1000);
    } catch (err) {
      console.error('Analysis error:', err);
      setAnalysisRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Professional Development</h2>
          <p className="text-slate-600 text-sm mt-1">{practitioner?.full_name}</p>
        </div>
        <Button
          onClick={handleRunAnalysis}
          disabled={analysisRunning}
          variant="outline"
        >
          {analysisRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            'Run Development Analysis'
          )}
        </Button>
      </div>

      {/* Career Pathway */}
      {careerPath && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Career Pathway
            </CardTitle>
            <CardDescription>
              Recommended progression and development timeline
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {/* Current Role */}
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-600 mb-1">Current Role</p>
                <p className="font-semibold text-slate-900">{careerPath.current_role}</p>
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center">
                <div className="text-2xl text-slate-400">→</div>
              </div>

              {/* Recommended Next Role */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs text-blue-600 mb-1">Recommended Next Role</p>
                <p className="font-semibold text-blue-900">{careerPath.recommended_next_role}</p>
              </div>
            </div>

            {/* Readiness Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Readiness for Progression</span>
                <span className="text-sm font-bold text-blue-600">{careerPath.progression_readiness}%</span>
              </div>
              <Progress value={careerPath.progression_readiness} className="h-2" />
            </div>

            {/* Timeline */}
            <div className="bg-blue-50 rounded p-3 text-sm">
              <p className="text-blue-900">
                <strong>Estimated Timeline:</strong> {careerPath.estimated_timeline_months} months
              </p>
            </div>

            {/* Key Competencies */}
            {careerPath.key_competencies_to_develop && careerPath.key_competencies_to_develop.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Key Competencies to Develop</p>
                <div className="flex flex-wrap gap-2">
                  {careerPath.key_competencies_to_develop.map((comp, idx) => (
                    <Badge key={idx} variant="secondary">{comp}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths & Development Needs */}
            <div className="grid grid-cols-2 gap-4">
              {careerPath.strengths && careerPath.strengths.length > 0 && (
                <div className="bg-green-50 rounded p-3">
                  <p className="text-xs text-green-600 font-semibold mb-2">Strengths</p>
                  <ul className="text-xs space-y-1 text-green-800">
                    {careerPath.strengths.map((s, idx) => (
                      <li key={idx}>• {s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {careerPath.development_needs && careerPath.development_needs.length > 0 && (
                <div className="bg-orange-50 rounded p-3">
                  <p className="text-xs text-orange-600 font-semibold mb-2">Development Needs</p>
                  <ul className="text-xs space-y-1 text-orange-800">
                    {careerPath.development_needs.map((d, idx) => (
                      <li key={idx}>• {d}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Training Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Training Recommendations
          </CardTitle>
          <CardDescription>
            Recommended professional development modules
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trainingRecommendations && trainingRecommendations.length > 0 ? (
            <div className="space-y-3">
              {trainingRecommendations.map((training) => (
                <div key={training.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-900">{training.training_module_name}</h4>
                      <p className="text-xs text-slate-600 mt-1">{training.skill_gap}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={
                        training.priority === 'critical' ? 'bg-red-600' :
                        training.priority === 'high' ? 'bg-orange-600' :
                        training.priority === 'medium' ? 'bg-yellow-600' :
                        'bg-blue-600'
                      }>
                        {training.priority}
                      </Badge>
                      {training.status !== 'recommended' && (
                        <p className="text-xs text-slate-600 mt-1 capitalize">{training.status}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-slate-50 rounded p-2">
                      <span className="text-slate-600">Hours</span>
                      <p className="font-semibold">{training.estimated_hours}h</p>
                    </div>
                    <div className="bg-slate-50 rounded p-2">
                      <span className="text-slate-600">Category</span>
                      <p className="font-semibold">{training.training_category}</p>
                    </div>
                    {training.cpd_hours_granted && (
                      <div className="bg-green-50 rounded p-2">
                        <span className="text-green-600">CPD</span>
                        <p className="font-semibold text-green-700">{training.cpd_hours_granted}h</p>
                      </div>
                    )}
                  </div>

                  {training.recommendation_reason && (
                    <p className="text-sm text-slate-700 italic">{training.recommendation_reason}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No training recommendations yet. Run analysis to generate recommendations.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}