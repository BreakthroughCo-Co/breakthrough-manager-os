import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, CheckCircle, Copy } from 'lucide-react';

export default function SmartGoalBuilder({ clientId, clientName, onGoalCreated }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedGoals, setGeneratedGoals] = useState(null);
  const [practitionerInput, setPractitionerInput] = useState('');
  const [selectedGoals, setSelectedGoals] = useState(new Set());

  const handleGenerateGoals = async () => {
    setIsGenerating(true);
    try {
      const result = await base44.functions.invoke('generateSmartGoals', {
        client_id: clientId,
        practitioner_input: practitionerInput
      });
      setGeneratedGoals(result.data);
      setSelectedGoals(new Set(result.data.goals.map((_, i) => i)));
    } catch (error) {
      alert('Failed to generate goals: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveGoals = async () => {
    // Goals are created automatically by the function
    if (onGoalCreated) {
      onGoalCreated(generatedGoals.goals_generated);
    }
    alert(`${generatedGoals.goals_generated} goals created successfully!`);
    setGeneratedGoals(null);
    setPractitionerInput('');
  };

  return (
    <Card className="border-teal-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-teal-600" />
          AI-Powered SMART Goal Suggester
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="input" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="input">Generate Goals</TabsTrigger>
            <TabsTrigger value="review" disabled={!generatedGoals}>Review Goals</TabsTrigger>
          </TabsList>

          <TabsContent value="input" className="space-y-4">
            <Alert>
              <AlertDescription>
                Provide context about {clientName}'s needs, progress, and aspirations. The AI will generate SMART goals aligned with NDIS outcomes.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <label className="text-sm font-medium">Goals Context</label>
              <Textarea
                placeholder="E.g., 'Client is improving social skills, needs more independence in daily activities, family wants focus on communication. Recent progress in XYZ...'"
                value={practitionerInput}
                onChange={(e) => setPractitionerInput(e.target.value)}
                rows={4}
              />
            </div>

            <Button
              onClick={handleGenerateGoals}
              disabled={isGenerating || !practitionerInput.trim()}
              className="w-full bg-teal-600 hover:bg-teal-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating SMART Goals...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate SMART Goals
                </>
              )}
            </Button>
          </TabsContent>

          {generatedGoals && (
            <TabsContent value="review" className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {generatedGoals.goals_generated} goals generated
              </div>

              <div className="space-y-3">
                {generatedGoals.goals.map((goal, idx) => (
                  <Card key={idx} className="border-l-4 border-l-teal-400">
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold text-teal-900">{goal.goal_description}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{goal.ai_rationale}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="p-2 bg-emerald-50 rounded">
                            <p className="text-xs font-medium text-emerald-900">Specific</p>
                            <p className="text-xs text-emerald-800 mt-1">{goal.specific}</p>
                          </div>
                          <div className="p-2 bg-blue-50 rounded">
                            <p className="text-xs font-medium text-blue-900">Measurable</p>
                            <p className="text-xs text-blue-800 mt-1">{goal.measurable}</p>
                          </div>
                          <div className="p-2 bg-purple-50 rounded">
                            <p className="text-xs font-medium text-purple-900">Achievable</p>
                            <p className="text-xs text-purple-800 mt-1">{goal.achievable}</p>
                          </div>
                          <div className="p-2 bg-amber-50 rounded">
                            <p className="text-xs font-medium text-amber-900">Relevant</p>
                            <p className="text-xs text-amber-800 mt-1">{goal.relevant}</p>
                          </div>
                        </div>

                        <div className="text-sm">
                          <p className="font-medium text-slate-700">Target: {goal.target_outcome}</p>
                          <p className="text-xs text-muted-foreground mt-1">Track: {goal.progress_metric}</p>
                        </div>

                        {goal.interventions.length > 0 && (
                          <div className="text-sm">
                            <p className="font-medium text-slate-700 mb-2">Suggested Interventions:</p>
                            <ul className="list-disc list-inside space-y-1">
                              {goal.interventions.map((intervention, i) => (
                                <li key={i} className="text-xs text-slate-600">{intervention}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Alert>
                <AlertDescription>
                  Goals have been created automatically. You can refine them in the ClientGoal section.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleSaveGoals}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Goals Saved - Continue
              </Button>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}