import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { Loader2, AlertCircle, Zap, BookOpen } from 'lucide-react';

export default function SessionSupportPanel({ sessionId, clientId }) {
  const [currentBehavior, setCurrentBehavior] = useState('');
  const [guidance, setGuidance] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('guidance');

  const handleGetGuidance = async () => {
    if (!currentBehavior.trim()) {
      alert('Please describe what you observe');
      return;
    }

    setIsLoading(true);
    try {
      const result = await base44.functions.invoke('getSessionSupportGuidance', {
        session_id: sessionId,
        client_id: clientId,
        current_observation: currentBehavior,
        guidance_type: 'behavior_support'
      });
      setGuidance(result.data.guidance);
      setCurrentBehavior('');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <Zap className="h-5 w-5" />
          Real-Time Support
        </CardTitle>
        <CardDescription className="text-blue-700">
          Get immediate guidance based on client's support plan
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-900">What are you observing right now?</label>
          <Textarea
            placeholder="e.g., Client is showing signs of frustration, fidgeting, avoiding eye contact..."
            value={currentBehavior}
            onChange={(e) => setCurrentBehavior(e.target.value)}
            rows={2}
            className="text-sm"
          />
        </div>

        {/* Get Guidance Button */}
        <Button
          onClick={handleGetGuidance}
          disabled={isLoading || !currentBehavior.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Get Real-Time Guidance
            </>
          )}
        </Button>

        {/* Guidance Display */}
        {guidance && (
          <div className="space-y-3 bg-white rounded-lg p-4 border border-blue-200">
            {/* Situation Analysis */}
            <div>
              <h4 className="font-semibold text-slate-900 text-sm mb-1">Situation Analysis</h4>
              <p className="text-sm text-slate-700">{guidance.situation_analysis}</p>
            </div>

            {/* Risk Flag */}
            {guidance.risk_flagged && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700 text-sm">
                  <strong>Risk Flagged:</strong> {guidance.risk_mitigation}
                </AlertDescription>
              </Alert>
            )}

            {/* Immediate Recommendations */}
            {guidance.immediate_recommendations && guidance.immediate_recommendations.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-900 text-sm mb-2">Immediate Recommendations</h4>
                <div className="space-y-2">
                  {guidance.immediate_recommendations.map((rec, idx) => (
                    <div key={idx} className="bg-blue-50 rounded p-2 border-l-4 border-blue-600">
                      <p className="font-semibold text-sm text-slate-900">{rec.action}</p>
                      <p className="text-xs text-slate-700 mt-1">{rec.rationale}</p>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {rec.plan_reference}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Motivation Considerations */}
            {guidance.motivation_considerations && (
              <div className="bg-amber-50 border border-amber-200 rounded p-2">
                <p className="text-xs text-amber-700">
                  <strong>Motivation Lever:</strong> {guidance.motivation_considerations}
                </p>
              </div>
            )}

            {/* Next Steps */}
            {guidance.next_observation_focus && (
              <div className="text-xs text-slate-700 italic border-t pt-2">
                <strong>Next to observe:</strong> {guidance.next_observation_focus}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}