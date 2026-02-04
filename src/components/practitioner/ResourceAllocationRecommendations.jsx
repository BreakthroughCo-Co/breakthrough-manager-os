import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, ArrowRightLeft, TrendingUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ResourceAllocationRecommendations() {
  const [recommendations, setRecommendations] = useState(null);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('recommendResourceAllocation', {});
      return response.data;
    },
    onSuccess: (data) => {
      setRecommendations(data.recommendations);
    }
  });

  return (
    <Card className="border-indigo-200 bg-indigo-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            Resource Allocation Intelligence
          </CardTitle>
          <Button 
            size="sm" 
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            {analyzeMutation.isPending ? 'Analyzing...' : 'Optimize Resources'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!recommendations ? (
          <p className="text-sm text-slate-600">AI-driven practitioner-client matching and workload optimization</p>
        ) : (
          <Tabs defaultValue="assignments">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="assignments">Optimal Matches</TabsTrigger>
              <TabsTrigger value="rebalancing">Rebalancing</TabsTrigger>
              <TabsTrigger value="sharing">Team Sharing</TabsTrigger>
            </TabsList>

            <TabsContent value="assignments" className="space-y-2">
              {recommendations.optimal_assignments?.slice(0, 5).map((assign, idx) => (
                <div key={idx} className="p-3 bg-white rounded border">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">{assign.client_name}</p>
                      <p className="text-xs text-slate-600">→ {assign.recommended_practitioner}</p>
                    </div>
                    <Badge className="bg-green-600">{assign.match_score}% match</Badge>
                  </div>
                  <p className="text-xs text-slate-700 mb-2">{assign.rationale}</p>
                  <div className="text-xs">
                    <p className="font-medium">Expected Outcomes:</p>
                    <ul className="ml-4 list-disc">
                      {assign.expected_outcomes?.slice(0, 2).map((outcome, i) => (
                        <li key={i}>{outcome}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="rebalancing" className="space-y-2">
              {recommendations.workload_rebalancing?.map((rebal, idx) => (
                <div key={idx} className="p-3 bg-white rounded border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium">{rebal.from_practitioner}</span>
                    <ArrowRightLeft className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium">{rebal.to_practitioner}</span>
                  </div>
                  <div className="text-xs space-y-1">
                    <p><strong>Transfer:</strong> {rebal.clients_to_transfer?.join(', ')}</p>
                    <p className="text-slate-600">{rebal.impact_assessment}</p>
                    <p className="text-blue-700"><strong>Strategy:</strong> {rebal.transition_strategy}</p>
                  </div>
                </div>
              ))}

              {recommendations.capacity_optimization && (
                <div className="mt-3 space-y-2">
                  {recommendations.capacity_optimization.overloaded_practitioners?.map((over, idx) => (
                    <div key={idx} className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                      <p className="font-medium">{over.practitioner}</p>
                      <p className="text-red-900">Current: {over.current_load}</p>
                      <p className="text-blue-700"><strong>Action:</strong> {over.recommended_reduction}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="sharing" className="space-y-2">
              {recommendations.team_resource_sharing?.map((share, idx) => (
                <div key={idx} className="p-3 bg-white rounded border">
                  <p className="font-medium text-sm mb-2">{share.opportunity}</p>
                  <div className="text-xs space-y-1">
                    <p><strong>Team:</strong> {share.practitioners_involved?.join(', ')}</p>
                    <p className="text-green-700"><strong>Benefit:</strong> {share.benefit}</p>
                    <p className="text-blue-700"><strong>How:</strong> {share.implementation}</p>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}