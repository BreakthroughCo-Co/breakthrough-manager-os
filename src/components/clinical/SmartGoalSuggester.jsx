import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Target, CheckCircle } from 'lucide-react';

export default function SmartGoalSuggester({ clientId, clientName, trigger }) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusArea, setFocusArea] = useState('');
  const [suggestions, setSuggestions] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await base44.functions.invoke('suggestSmartGoals', {
        client_id: clientId,
        focus_area: focusArea || undefined,
      });
      setSuggestions(result.data.suggested_goals);
    } catch (error) {
      alert('Failed to generate goals: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyGoal = (goal) => {
    const goalText = `GOAL: ${goal.goal_statement}\n\nMEASUREMENT: ${goal.measurement_criteria}\n\nTIMEFRAME: ${goal.timeframe}\n\nRATIONALE: ${goal.rationale}\n\nSTRATEGIES:\n${goal.suggested_strategies.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
    navigator.clipboard.writeText(goalText);
    alert('Goal copied to clipboard');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>SMART Goal Suggester - {clientName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <Target className="w-4 h-4" />
            <AlertDescription>
              AI will analyze the client's BSP and progress notes to suggest SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound).
            </AlertDescription>
          </Alert>

          <div>
            <Label>Focus Area (Optional)</Label>
            <Input
              value={focusArea}
              onChange={(e) => setFocusArea(e.target.value)}
              placeholder="e.g., Communication skills, emotional regulation, social interaction"
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Target className="w-4 h-4 mr-2" />
            )}
            {isGenerating ? 'Generating SMART Goals...' : 'Generate SMART Goals'}
          </Button>

          {suggestions && (
            <div className="space-y-4">
              {suggestions.overall_framework && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">Overall Framework</h4>
                  <p className="text-sm text-blue-800">{suggestions.overall_framework}</p>
                </div>
              )}

              {suggestions.priority_recommendation && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm text-amber-900">
                    <strong>Priority Recommendation:</strong> {suggestions.priority_recommendation}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Suggested Goals ({suggestions.goals?.length || 0})
                </h4>
                {suggestions.goals?.map((goal, idx) => (
                  <Card key={idx}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">Goal {idx + 1}</CardTitle>
                        <Button size="sm" variant="outline" onClick={() => handleCopyGoal(goal)}>
                          Copy
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Badge className="mb-2">Goal Statement</Badge>
                        <p className="text-sm font-medium">{goal.goal_statement}</p>
                      </div>
                      <div>
                        <Badge variant="outline" className="mb-2">Measurement Criteria</Badge>
                        <p className="text-sm text-muted-foreground">{goal.measurement_criteria}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Badge variant="outline" className="mb-1">Timeframe</Badge>
                          <p className="text-sm">{goal.timeframe}</p>
                        </div>
                        <div>
                          <Badge variant="outline" className="mb-1">Rationale</Badge>
                          <p className="text-sm text-muted-foreground">{goal.rationale}</p>
                        </div>
                      </div>
                      <div>
                        <Badge variant="secondary" className="mb-2">Suggested Strategies</Badge>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {goal.suggested_strategies?.map((strategy, sidx) => (
                            <li key={sidx}>{strategy}</li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}