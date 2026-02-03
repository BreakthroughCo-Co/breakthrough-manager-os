import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ScenarioPlanningInterface from '@/components/practitioner/ScenarioPlanningInterface';
import PractitionerMatchFeedbackPanel from '@/components/practitioner/PractitionerMatchFeedbackPanel';
import PractitionerMatchingPanel from '@/components/client/PractitionerMatchingPanel';
import { Users, Settings, TrendingUp, Loader2, AlertCircle } from 'lucide-react';

export default function PractitionerMatching() {
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);

  // Fetch all clients
  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const data = await base44.entities.Client.list();
      return data?.filter(c => c.status === 'active') || [];
    }
  });

  // Generate recommendations for selected client
  const handleGenerateRecommendations = async () => {
    if (!selectedClientId) return;
    
    setIsLoading(true);
    try {
      const result = await base44.functions.invoke('recommendPractitionerMatchesEnhanced', {
        client_id: selectedClientId
      });
      setRecommendations(result.data);
      setSelectedRecommendation(null);
    } catch (err) {
      console.error('Error generating recommendations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedClient = clients?.find(c => c.id === selectedClientId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Practitioner Matching</h1>
        <p className="text-slate-600 mt-2">AI-powered recommendations with scenario planning and feedback</p>
      </div>

      <Tabs defaultValue="matching" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="matching" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Matching
          </TabsTrigger>
          <TabsTrigger value="feedback" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Match Feedback
          </TabsTrigger>
        </TabsList>

        {/* Matching Tab */}
        <TabsContent value="matching" className="space-y-4 mt-4">
          {/* Client Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Client</CardTitle>
              <CardDescription>Choose a client to generate practitioner recommendations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Client</label>
                <Select value={selectedClientId || ''} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name} ({client.ndis_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleGenerateRecommendations}
                disabled={!selectedClientId || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating recommendations...
                  </>
                ) : (
                  'Generate Recommendations'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Recommendations Display */}
          {recommendations && (
            <>
              {/* Scenario Planning */}
              <ScenarioPlanningInterface
                clientId={selectedClientId}
                onScenarioRun={setRecommendations}
              />

              {/* Matching Recommendations */}
              <PractitionerMatchingPanel
                recommendations={recommendations.recommendations}
                isLoading={false}
              />
            </>
          )}

          {isLoading && (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-3" />
                <span>Analyzing client profile and practitioner data...</span>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="space-y-4 mt-4">
          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700">
              Rate completed practitioner matches to improve future recommendations. Your feedback helps the AI learn which matches work best.
            </AlertDescription>
          </Alert>

          {recommendations?.recommendations?.top_recommendations && (
            <div className="space-y-4">
              {recommendations.recommendations.top_recommendations.map((rec) => (
                <PractitionerMatchFeedbackPanel
                  key={rec.practitioner_id}
                  clientId={selectedClientId}
                  clientName={selectedClient?.full_name}
                  practitionerId={rec.practitioner_id}
                  practitionerName={rec.practitioner_name}
                  matchScore={rec.match_score}
                  recommendationRank={rec.rank}
                  onFeedbackSubmitted={(feedback) => {
                    console.log('Feedback submitted:', feedback);
                  }}
                />
              ))}
            </div>
          )}

          {!recommendations && (
            <Card>
              <CardContent className="flex items-center justify-center py-12 text-slate-500">
                <AlertCircle className="h-8 w-8 mr-3 opacity-50" />
                <span>Select a client and generate recommendations first</span>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}