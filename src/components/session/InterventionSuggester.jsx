import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { base44 } from '@/api/base44Client';
import { AlertCircle, Loader2, Zap } from 'lucide-react';

export default function InterventionSuggester({ sessionId, clientId }) {
  const [behaviorDescription, setBehaviorDescription] = useState('');
  const [context, setContext] = useState('');
  const [suggestions, setSuggestions] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSuggestIntervention = async () => {
    if (!behaviorDescription.trim()) {
      alert('Please describe the behavior');
      return;
    }

    setIsLoading(true);
    try {
      const result = await base44.functions.invoke('suggestInSessionIntervention', {
        session_id: sessionId,
        client_id: clientId,
        behavior_observed: behaviorDescription,
        context
      });
      setSuggestions(result.data.interventions);
      setBehaviorDescription('');
      setContext('');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const priorityColors = {
    critical: 'bg-red-600',
    high: 'bg-orange-600',
    medium: 'bg-yellow-600'
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Intervention Suggestions
        </CardTitle>
        <CardDescription>
          Get intervention options aligned with support plan
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Behavior Input */}
        <div className="space-y-2">
          <label className="text-sm font-semibold">Behavior observed</label>
          <Textarea
            placeholder="e.g., Client is displaying aggressive behavior towards peers, escalating in intensity..."
            value={behaviorDescription}
            onChange={(e) => setBehaviorDescription(e.target.value)}
            rows={2}
            className="text-sm"
          />
        </div>

        {/* Context Input */}
        <div className="space-y-2">
          <label className="text-sm font-semibold">Context (optional)</label>
          <Textarea
            placeholder="e.g., Happening during transition time, following a denied request..."
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={1}
            className="text-sm"
          />
        </div>

        {/* Get Suggestions Button */}
        <Button
          onClick={handleSuggestIntervention}
          disabled={isLoading || !behaviorDescription.trim()}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            'Get Intervention Options'
          )}
        </Button>

        {/* Suggestions Display */}
        {suggestions && (
          <div className="space-y-3 bg-slate-50 rounded-lg p-4">
            {/* Priority & Safety */}
            <div className="flex items-center justify-between">
              <Badge className={priorityColors[suggestions.priority]}>
                Priority: {suggestions.priority}
              </Badge>
              {suggestions.safety_alert && (
                <Alert className="border-red-200 bg-red-50 mb-2">
                  <AlertCircle className="h-3 w-3 text-red-600" />
                  <AlertDescription className="text-red-700 text-xs">
                    {suggestions.safety_alert}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Interventions */}
            {suggestions.interventions && suggestions.interventions.length > 0 && (
              <div className="space-y-3">
                {suggestions.interventions.map((intervention, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded p-3">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-slate-900">{intervention.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {intervention.difficulty_level}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-slate-600 font-semibold">Why now:</p>
                        <p className="text-slate-700">{intervention.why_now}</p>
                      </div>

                      <div>
                        <p className="text-slate-600 font-semibold">How to deliver:</p>
                        <p className="text-slate-700 whitespace-pre-wrap">{intervention.how_to_deliver}</p>
                      </div>

                      <div>
                        <p className="text-slate-600 font-semibold">Expected outcome:</p>
                        <p className="text-slate-700">{intervention.expected_outcome}</p>
                      </div>

                      <Badge variant="secondary" className="text-xs">
                        {intervention.plan_reference}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Motivation Lever */}
            {suggestions.motivation_lever && (
              <div className="bg-amber-50 border border-amber-200 rounded p-3">
                <p className="text-sm text-amber-900">
                  <strong>Use this motivation lever:</strong> {suggestions.motivation_lever}
                </p>
              </div>
            )}

            {/* Quick Alternative */}
            {suggestions.quick_alternative && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-sm text-blue-900">
                  <strong>If first option doesn't work:</strong> {suggestions.quick_alternative}
                </p>
              </div>
            )}

            {/* Plan Alignment */}
            <div className="text-xs text-slate-600 border-t pt-2">
              Plan Aligned: {suggestions.is_plan_aligned ? (
                <Badge className="bg-green-600 ml-2">Yes</Badge>
              ) : (
                <Badge className="bg-yellow-600 ml-2">Review Required</Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}