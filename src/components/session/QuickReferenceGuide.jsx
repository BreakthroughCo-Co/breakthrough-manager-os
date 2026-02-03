import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BookOpen, Loader2 } from 'lucide-react';

export default function QuickReferenceGuide({ clientId }) {
  // Fetch FBA
  const { data: fbas, isLoading: fbaLoading } = useQuery({
    queryKey: ['fba', clientId],
    queryFn: async () => {
      const data = await base44.entities.FunctionalBehaviourAssessment.filter({ client_id: clientId });
      return data?.sort((a, b) => new Date(b.assessment_date) - new Date(a.assessment_date)) || [];
    }
  });

  // Fetch Motivation Assessment
  const { data: motivations, isLoading: motivationLoading } = useQuery({
    queryKey: ['motivation', clientId],
    queryFn: async () => {
      const data = await base44.entities.MotivationAssessmentScale.filter({ client_id: clientId });
      return data?.sort((a, b) => new Date(b.assessment_date) - new Date(a.assessment_date)) || [];
    }
  });

  // Fetch BSP
  const { data: bsps, isLoading: bspLoading } = useQuery({
    queryKey: ['bsp', clientId],
    queryFn: async () => {
      const data = await base44.entities.BehaviourSupportPlan.filter({ client_id: clientId });
      return data?.filter(b => b.is_latest_version && b.status === 'active') || [];
    }
  });

  const latestFBA = fbas?.[0];
  const latestMotivation = motivations?.[0];
  const activeBSP = bsps?.[0];

  const isLoading = fbaLoading || motivationLoading || bspLoading;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading reference materials...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Quick Reference Guide
        </CardTitle>
        <CardDescription>
          Client profile summary for quick in-session reference
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="fba" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="fba">FBA</TabsTrigger>
            <TabsTrigger value="motivation">Motivation</TabsTrigger>
            <TabsTrigger value="plan">Plan</TabsTrigger>
          </TabsList>

          {/* FBA Tab */}
          <TabsContent value="fba" className="space-y-3 mt-4">
            {latestFBA ? (
              <>
                <div className="bg-slate-50 rounded p-3">
                  <p className="text-xs text-slate-600 font-semibold mb-1">PRIMARY FUNCTION</p>
                  <Badge className="mb-2 capitalize">{latestFBA.hypothesised_function.replace(/_/g, ' ')}</Badge>
                  <p className="text-sm font-semibold text-slate-900">{latestFBA.function_evidence}</p>
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-slate-600 font-semibold mb-1">COMMON ANTECEDENTS (Triggers)</p>
                    <p className="text-sm text-slate-700">{latestFBA.antecedents}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-600 font-semibold mb-1">TYPICAL CONSEQUENCES</p>
                    <p className="text-sm text-slate-700">{latestFBA.consequences}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-600 font-semibold mb-1">REPLACEMENT BEHAVIOURS</p>
                    <p className="text-sm text-slate-700">{latestFBA.replacement_behaviours}</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">No FBA available</p>
            )}
          </TabsContent>

          {/* Motivation Tab */}
          <TabsContent value="motivation" className="space-y-3 mt-4">
            {latestMotivation ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-blue-50 rounded p-3">
                    <p className="text-xs text-blue-600 font-semibold">Sensory</p>
                    <p className="text-2xl font-bold text-blue-900">{latestMotivation.sensory_needs_score}</p>
                  </div>
                  <div className="bg-orange-50 rounded p-3">
                    <p className="text-xs text-orange-600 font-semibold">Escape</p>
                    <p className="text-2xl font-bold text-orange-900">{latestMotivation.escape_avoidance_score}</p>
                  </div>
                  <div className="bg-purple-50 rounded p-3">
                    <p className="text-xs text-purple-600 font-semibold">Attention</p>
                    <p className="text-2xl font-bold text-purple-900">{latestMotivation.attention_score}</p>
                  </div>
                  <div className="bg-green-50 rounded p-3">
                    <p className="text-xs text-green-600 font-semibold">Tangibles</p>
                    <p className="text-2xl font-bold text-green-900">{latestMotivation.tangibles_score}</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded p-3">
                  <p className="text-xs text-slate-600 font-semibold mb-1">PRIMARY MOTIVATION</p>
                  <Badge className="capitalize">{latestMotivation.primary_motivation.replace(/_/g, ' ')}</Badge>
                </div>

                {latestMotivation.intervention_recommendations && (
                  <div>
                    <p className="text-xs text-slate-600 font-semibold mb-1">RECOMMENDED INTERVENTIONS</p>
                    <p className="text-sm text-slate-700">{latestMotivation.intervention_recommendations}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-500">No motivation assessment available</p>
            )}
          </TabsContent>

          {/* Plan Tab */}
          <TabsContent value="plan" className="space-y-3 mt-4">
            {activeBSP ? (
              <>
                <div>
                  <p className="text-xs text-slate-600 font-semibold mb-1">ENVIRONMENTAL STRATEGIES</p>
                  <p className="text-sm text-slate-700">{activeBSP.environmental_strategies}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-600 font-semibold mb-1">SKILL BUILDING STRATEGIES</p>
                  <p className="text-sm text-slate-700">{activeBSP.skill_building_strategies}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-600 font-semibold mb-1">REACTIVE STRATEGIES</p>
                  <p className="text-sm text-slate-700">{activeBSP.reactive_strategies}</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                  <p className="text-xs text-blue-600 font-semibold mb-1">MONITORING METHOD</p>
                  <p className="text-blue-900">{activeBSP.monitoring_evaluation}</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">No active plan available</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}