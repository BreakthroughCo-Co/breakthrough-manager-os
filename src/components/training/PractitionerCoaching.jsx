import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Target, Award, BookOpen, TrendingUp, Lightbulb } from 'lucide-react';

export default function PractitionerCoaching({ practitioners = [] }) {
  const [selectedPractitioner, setSelectedPractitioner] = useState('');
  const [coaching, setCoaching] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateCoaching = async () => {
    if (!selectedPractitioner) return;

    setIsGenerating(true);
    try {
      const result = await base44.functions.invoke('generatePractitionerCoaching', {
        practitioner_id: selectedPractitioner
      });
      setCoaching(result.data);
    } catch (error) {
      alert('Failed to generate coaching: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const practitioner = practitioners.find(p => p.id === selectedPractitioner);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Practitioner Coaching</CardTitle>
          <CardDescription>
            AI-powered personalized coaching insights based on training completion and performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Select value={selectedPractitioner} onValueChange={setSelectedPractitioner}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a practitioner..." />
              </SelectTrigger>
              <SelectContent>
                {practitioners.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name} - {p.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleGenerateCoaching}
              disabled={!selectedPractitioner || isGenerating}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Target className="w-4 h-4 mr-2" />
                  Generate Coaching
                </>
              )}
            </Button>
          </div>

          {!coaching && !isGenerating && (
            <div className="text-center py-12 text-slate-600">
              <Award className="w-12 h-12 mx-auto text-indigo-400 mb-4" />
              <p>Select a practitioner and generate personalized coaching insights</p>
              <p className="text-sm mt-2 text-slate-500">
                Based on training completion, ratings, case notes, and performance data
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {coaching && (
        <div className="space-y-4">
          {/* Overall Assessment */}
          <Card className="border-indigo-200">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-indigo-600" />
                    Overall Assessment - {coaching.generated_for}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {coaching.coaching.overall_assessment.summary}
                  </CardDescription>
                </div>
                <Badge className={
                  coaching.coaching.overall_assessment.overall_rating === 'excellent' ? 'bg-green-100 text-green-800' :
                  coaching.coaching.overall_assessment.overall_rating === 'good' ? 'bg-blue-100 text-blue-800' :
                  coaching.coaching.overall_assessment.overall_rating === 'developing' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-orange-100 text-orange-800'
                }>
                  {coaching.coaching.overall_assessment.overall_rating}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-sm text-green-900 mb-2">Strengths</h4>
                  <ul className="space-y-1">
                    {coaching.coaching.overall_assessment.strengths?.map((strength, idx) => (
                      <li key={idx} className="text-sm text-green-800 flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-orange-900 mb-2">Development Areas</h4>
                  <ul className="space-y-1">
                    {coaching.coaching.overall_assessment.development_areas?.map((area, idx) => (
                      <li key={idx} className="text-sm text-orange-800 flex items-start gap-2">
                        <span className="text-orange-600 mt-1">→</span>
                        {area}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Training Effectiveness */}
          {coaching.coaching.training_effectiveness && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                  Training Effectiveness
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm font-medium text-purple-900 mb-1">What's Working Well:</p>
                  <p className="text-sm text-purple-800">{coaching.coaching.training_effectiveness.what_working_well}</p>
                </div>
                {coaching.coaching.training_effectiveness.gaps_identified?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Gaps Identified:</p>
                    <ul className="space-y-1">
                      {coaching.coaching.training_effectiveness.gaps_identified.map((gap, idx) => (
                        <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                          <span className="text-amber-600 mt-1">•</span>
                          {gap}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Personalized Coaching Tips */}
          {coaching.coaching.personalized_coaching_tips?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  Personalized Coaching Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {coaching.coaching.personalized_coaching_tips.map((tip, idx) => (
                  <div key={idx} className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{tip.area}</Badge>
                      <span className="text-xs text-slate-600">{tip.timeline}</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Current:</span> {tip.current_level}
                      </div>
                      <div>
                        <span className="font-medium">Target:</span> {tip.target_level}
                      </div>
                      <div>
                        <span className="font-medium">Actions:</span>
                        <ul className="list-disc list-inside ml-2 mt-1">
                          {tip.coaching_actions?.map((action, i) => (
                            <li key={i}>{action}</li>
                          ))}
                        </ul>
                      </div>
                      {tip.resources?.length > 0 && (
                        <div>
                          <span className="font-medium">Resources:</span>
                          <ul className="list-disc list-inside ml-2 mt-1 text-xs">
                            {tip.resources.map((resource, i) => (
                              <li key={i}>{resource}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recommended Training */}
          {coaching.coaching.recommended_training_modules?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-600" />
                  Recommended Training
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {coaching.coaching.recommended_training_modules.map((module, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                    <Badge variant={
                      module.priority === 'high' ? 'destructive' :
                      module.priority === 'medium' ? 'default' : 'secondary'
                    }>
                      {module.priority}
                    </Badge>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{module.module_type}</p>
                      <p className="text-xs text-slate-600 mt-1">{module.rationale}</p>
                      <p className="text-xs text-blue-700 mt-1">
                        <span className="font-medium">Outcome:</span> {module.expected_outcome}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Goals */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Short-term Goals</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {coaching.coaching.short_term_goals?.map((goal, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600 mt-0.5" />
                      {goal}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Supervision Focus</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {coaching.coaching.supervision_focus_areas?.map((area, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <Target className="w-4 h-4 text-blue-600 mt-0.5" />
                      {area}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Long-term Development */}
          {coaching.coaching.long_term_development_path && (
            <Card className="border-indigo-200 bg-indigo-50">
              <CardHeader>
                <CardTitle className="text-sm text-indigo-900">Long-term Development Path</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-indigo-800">
                  {coaching.coaching.long_term_development_path}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}