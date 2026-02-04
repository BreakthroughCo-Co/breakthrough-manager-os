import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Route, Target, MapPin } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DynamicClientPathway({ clientId, clientName }) {
  const [pathway, setPathway] = useState(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generateClientPathway', { client_id: clientId });
      return response.data;
    },
    onSuccess: (data) => {
      setPathway(data.pathway);
    }
  });

  return (
    <Card className="bg-gradient-to-r from-green-50 to-teal-50 border-green-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Route className="h-5 w-5 text-green-600" />
            Dynamic Intervention Pathway
          </CardTitle>
          <Button 
            size="sm" 
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            <Target className="h-4 w-4 mr-2" />
            {generateMutation.isPending ? 'Building...' : 'Generate Pathway'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!pathway ? (
          <p className="text-sm text-slate-600">Evidence-based intervention sequences tailored to client goals</p>
        ) : (
          <Tabs defaultValue="pathways">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="pathways">Goal Pathways</TabsTrigger>
              <TabsTrigger value="adaptive">Adaptive Logic</TabsTrigger>
              <TabsTrigger value="checkpoints">Checkpoints</TabsTrigger>
            </TabsList>

            <TabsContent value="pathways" className="space-y-3">
              {pathway.goal_pathways?.map((gp, idx) => (
                <div key={idx} className="p-3 bg-white rounded border">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-sm">{gp.goal}</p>
                    <Badge variant="outline">{gp.confidence_level} confidence</Badge>
                  </div>
                  <p className="text-xs text-slate-600 mb-2">Timeline: {gp.estimated_completion}</p>
                  
                  <div className="space-y-2">
                    {gp.pathway_phases?.map((phase, pIdx) => (
                      <div key={pIdx} className="p-2 bg-slate-50 rounded text-xs">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="h-3 w-3 text-blue-600" />
                          <span className="font-medium">{phase.phase_name}</span>
                          <Badge className="bg-blue-600">{phase.duration_weeks}w</Badge>
                        </div>
                        <div className="ml-5">
                          <p className="font-medium">Interventions:</p>
                          <ul className="list-disc ml-4">
                            {phase.interventions?.slice(0, 3).map((int, i) => (
                              <li key={i}>{int}</li>
                            ))}
                          </ul>
                          <p className="font-medium mt-1">Success Criteria:</p>
                          <ul className="list-disc ml-4">
                            {phase.success_criteria?.slice(0, 2).map((crit, i) => (
                              <li key={i}>{crit}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="adaptive" className="space-y-2">
              {pathway.adaptive_strategies?.map((strat, idx) => (
                <div key={idx} className="p-2 bg-white rounded text-xs">
                  <p className="font-medium">Scenario: {strat.scenario}</p>
                  <p className="text-amber-700 mt-1"><strong>Trigger:</strong> {strat.trigger}</p>
                  <p className="text-blue-700"><strong>Response:</strong> {strat.response_action}</p>
                  {strat.alternative_interventions?.length > 0 && (
                    <div className="mt-1">
                      <p className="font-medium">Alternative Interventions:</p>
                      <ul className="ml-4 list-disc">
                        {strat.alternative_interventions.slice(0, 3).map((alt, i) => (
                          <li key={i}>{alt}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </TabsContent>

            <TabsContent value="checkpoints" className="space-y-2">
              {pathway.milestone_checkpoints?.map((check, idx) => (
                <div key={idx} className="p-2 bg-white rounded text-xs">
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-medium">{check.checkpoint_name}</span>
                    <Badge variant="outline">{check.timeframe}</Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Evaluation:</p>
                    <ul className="ml-4 list-disc">
                      {check.evaluation_criteria?.map((crit, i) => (
                        <li key={i}>{crit}</li>
                      ))}
                    </ul>
                    <p className="font-medium">Decision Options:</p>
                    <ul className="ml-4 list-disc text-green-700">
                      {check.decision_options?.map((opt, i) => (
                        <li key={i}>{opt}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}

              {pathway.recommended_frequency && (
                <div className="p-3 bg-blue-50 rounded text-xs mt-3">
                  <p className="font-medium mb-1">Recommended Frequency</p>
                  <p><strong>Sessions:</strong> {pathway.recommended_frequency.session_frequency}</p>
                  <p><strong>Reviews:</strong> {pathway.recommended_frequency.review_cadence}</p>
                  <p><strong>Pathway Update:</strong> {pathway.recommended_frequency.pathway_reassessment}</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}