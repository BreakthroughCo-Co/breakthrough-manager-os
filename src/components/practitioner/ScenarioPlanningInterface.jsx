import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { Zap, RotateCcw, Play } from 'lucide-react';

export default function ScenarioPlanningInterface({ clientId, onScenarioRun }) {
  const [weights, setWeights] = useState({
    skill_match: 25,
    availability: 20,
    motivation_alignment: 25,
    engagement_history: 15,
    match_history: 15
  });

  const [isRunning, setIsRunning] = useState(false);

  const handleWeightChange = (key, value) => {
    const newWeights = { ...weights, [key]: value };
    const total = Object.values(newWeights).reduce((a, b) => a + b, 0);
    
    // Normalize if total exceeds 100
    if (total > 100) {
      const scale = 100 / total;
      Object.keys(newWeights).forEach(k => {
        newWeights[k] = Math.round(newWeights[k] * scale);
      });
    }
    
    setWeights(newWeights);
  };

  const handleReset = () => {
    setWeights({
      skill_match: 25,
      availability: 20,
      motivation_alignment: 25,
      engagement_history: 15,
      match_history: 15
    });
  };

  const handleRunScenario = async () => {
    setIsRunning(true);
    try {
      const result = await base44.functions.invoke('recommendPractitionerMatchesEnhanced', {
        client_id: clientId,
        scenario_weights: {
          skill_match: weights.skill_match / 100,
          availability: weights.availability / 100,
          motivation_alignment: weights.motivation_alignment / 100,
          engagement_history: weights.engagement_history / 100,
          match_history: weights.match_history / 100
        }
      });
      onScenarioRun(result.data);
    } catch (err) {
      console.error('Scenario error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const total = Object.values(weights).reduce((a, b) => a + b, 0);

  const weightDescriptions = {
    skill_match: 'How much to prioritize relevant skills and certifications',
    availability: 'How much to prioritize practitioner capacity and availability',
    motivation_alignment: 'How much to prioritize client motivation alignment',
    engagement_history: 'How much to prioritize practitioner engagement patterns',
    match_history: 'How much to prioritize historical match success rates'
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Scenario Planning: Adjust Matching Weights
        </CardTitle>
        <CardDescription>
          Simulate different matching criteria to see how recommendations change
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Weight Sliders */}
        <div className="space-y-4">
          {Object.entries(weights).map(([key, value]) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-semibold text-slate-900 capitalize">
                    {key.replace(/_/g, ' ')}
                  </label>
                  <p className="text-xs text-slate-600 mt-1">{weightDescriptions[key]}</p>
                </div>
                <Badge variant="outline" className="text-lg px-3">
                  {value}%
                </Badge>
              </div>
              <Slider
                value={[value]}
                onValueChange={(v) => handleWeightChange(key, v[0])}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
          ))}
        </div>

        {/* Total Weight Display */}
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Total Weight Allocation</span>
            <span className={`text-lg font-bold ${total === 100 ? 'text-green-600' : 'text-orange-600'}`}>
              {total}%
            </span>
          </div>
          {total !== 100 && (
            <p className="text-xs text-orange-600 mt-2">
              Weights will be normalized to 100% when scenario runs
            </p>
          )}
        </div>

        {/* Info Alert */}
        <Alert className="border-blue-200 bg-blue-50">
          <AlertDescription className="text-blue-700 text-sm">
            <strong>How this works:</strong> Adjust the sliders to change how the AI weighs different matching factors. For example, increase "Availability" to find practitioners with more capacity, or increase "Motivation Alignment" to prioritize client engagement.
          </AlertDescription>
        </Alert>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={handleRunScenario}
            disabled={isRunning}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            <Play className="h-4 w-4 mr-2" />
            {isRunning ? 'Running scenario...' : 'Run Scenario'}
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            disabled={isRunning}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}