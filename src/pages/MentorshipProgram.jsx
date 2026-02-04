import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import MentorshipProgramManager from '@/components/mentorship/MentorshipProgramManager';
import { Users, AlertCircle, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function MentorshipProgram() {
  const [aiPairings, setAiPairings] = useState(null);

  const generatePairingsMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generateMentorshipPairings');
      return response.data;
    },
    onSuccess: (data) => {
      setAiPairings(data.mentorship_plan);
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mentorship Program</h1>
          <p className="text-slate-600 mt-2">AI-driven mentorship matching and development tracking</p>
        </div>
        <Button onClick={() => generatePairingsMutation.mutate()} disabled={generatePairingsMutation.isPending}>
          <Sparkles className="h-4 w-4 mr-2" />
          {generatePairingsMutation.isPending ? 'Analyzing...' : 'Generate AI Pairings'}
        </Button>
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <Users className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700">
          AI analyzes practitioner performance, skill gaps, and career aspirations to recommend optimal mentor-mentee pairings with structured development goals.
        </AlertDescription>
      </Alert>

      {aiPairings && (
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardHeader>
            <CardTitle className="text-base">AI-Recommended Pairings</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pairings">
              <TabsList>
                <TabsTrigger value="pairings">Pairings</TabsTrigger>
                <TabsTrigger value="goals">Development Goals</TabsTrigger>
                <TabsTrigger value="framework">Framework</TabsTrigger>
              </TabsList>
              <TabsContent value="pairings" className="space-y-3">
                {aiPairings.recommended_pairings?.map((pairing, idx) => (
                  <Card key={idx}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">{pairing.mentor_name} → {pairing.mentee_name}</p>
                          <Badge variant="outline">Match Score: {pairing.compatibility_score}/10</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 mb-2">{pairing.pairing_rationale}</p>
                      <div className="text-xs">
                        <p className="font-medium">Focus Areas:</p>
                        <div className="flex gap-1 flex-wrap mt-1">
                          {pairing.focus_areas?.map((area, i) => (
                            <Badge key={i} variant="outline">{area}</Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
              <TabsContent value="goals" className="space-y-3">
                {aiPairings.mentee_development_goals?.map((mentee, idx) => (
                  <Card key={idx}>
                    <CardContent className="pt-4">
                      <h3 className="font-semibold mb-2">{mentee.mentee_name}</h3>
                      <div className="text-sm space-y-2">
                        <div>
                          <p className="font-medium">Short-term Goals:</p>
                          <ul className="ml-4 text-slate-700">
                            {mentee.short_term_goals?.map((goal, i) => (
                              <li key={i}>• {goal}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium">Career Milestone:</p>
                          <p className="text-blue-700">{mentee.career_milestone}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
              <TabsContent value="framework">
                {aiPairings.mentorship_framework && (
                  <div className="p-4 bg-white rounded text-sm space-y-2">
                    <p><strong>Frequency:</strong> {aiPairings.mentorship_framework.session_frequency}</p>
                    <p><strong>Duration:</strong> {aiPairings.mentorship_framework.session_duration}</p>
                    <p><strong>Program Length:</strong> {aiPairings.mentorship_framework.program_duration}</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      <MentorshipProgramManager />
    </div>
  );
}