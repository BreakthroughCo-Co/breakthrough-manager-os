import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';

export default function PractitionerSessionFeedback({ practitionerId }) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  const { data: feedback, refetch } = useQuery({
    queryKey: ['practitionerFeedback', practitionerId],
    enabled: false,
    queryFn: async () => {
      setIsLoading(true);
      try {
        const result = await base44.functions.invoke('generatePractitionerSessionFeedback', {
          practitioner_id: practitionerId,
          period_days: selectedPeriod
        });
        return result.data.feedback;
      } finally {
        setIsLoading(false);
      }
    }
  });

  const handleGenerateFeedback = async () => {
    refetch();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Generating feedback...
        </CardContent>
      </Card>
    );
  }

  if (!feedback) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session Performance Feedback</CardTitle>
          <CardDescription>Personalized insights on delivery, engagement, and support plan adherence</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            {[7, 30, 60].map(days => (
              <Button
                key={days}
                variant={selectedPeriod === days ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod(days)}
              >
                Last {days} days
              </Button>
            ))}
          </div>
          <Button onClick={handleGenerateFeedback} className="w-full">
            Generate Feedback
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall Assessment */}
      <Card className="border-l-4 border-l-blue-600">
        <CardHeader>
          <CardTitle className="text-base">Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-700">{feedback.overall_assessment}</p>
        </CardContent>
      </Card>

      {/* Strengths */}
      {feedback.strengths?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {feedback.strengths.map((strength, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-slate-700">{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Areas for Development */}
      {feedback.areas_for_development?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-600" />
              Areas for Development
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {feedback.areas_for_development.map((area, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="text-amber-600 font-bold">→</span>
                  <span className="text-slate-700">{area}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      <div className="grid grid-cols-2 gap-4">
        {feedback.client_engagement_insights && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold">Client Engagement</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-700">
              {feedback.client_engagement_insights}
            </CardContent>
          </Card>
        )}

        {feedback.documentation_quality && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold">Documentation Quality</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-700">
              {feedback.documentation_quality}
            </CardContent>
          </Card>
        )}

        {feedback.ai_support_integration && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold">AI Support Integration</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-700">
              {feedback.ai_support_integration}
            </CardContent>
          </Card>
        )}

        {feedback.risk_management && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold">Risk Management</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-700">
              {feedback.risk_management}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recommended Focus Areas */}
      {feedback.recommended_focus_areas?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recommended Focus Areas</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">
              {feedback.recommended_focus_areas.map((area, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="font-bold text-blue-600 flex-shrink-0">{idx + 1}.</span>
                  <span className="text-slate-700">{area}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Commendations */}
      {feedback.commendations?.length > 0 && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 text-sm">
            {feedback.commendations.join(' • ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Next Steps */}
      {feedback.next_steps && (
        <Card className="border-l-4 border-l-slate-400">
          <CardHeader>
            <CardTitle className="text-sm">Next Steps</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700">
            {feedback.next_steps}
          </CardContent>
        </Card>
      )}

      <Button onClick={() => refetch()} variant="outline" className="w-full">
        Refresh Feedback
      </Button>
    </div>
  );
}