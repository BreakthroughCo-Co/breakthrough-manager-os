import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertCircle, CheckCircle2, Loader2, TrendingDown } from 'lucide-react';

export default function EnhancedClientTransitionPanel({ transitionId }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);

  const queryClient = useQueryClient();

  const { data: transition } = useQuery({
    queryKey: ['transition', transitionId],
    queryFn: async () => {
      const result = await base44.entities.ClientTransition.filter({ id: transitionId });
      return result?.[0];
    }
  });

  const { data: riskReassessment, refetch: refetchRisk } = useQuery({
    queryKey: ['riskReassessment', transitionId],
    enabled: false,
    queryFn: async () => {
      if (!transition) return null;
      setIsAnalyzing(true);
      try {
        const result = await base44.functions.invoke('reassessClientRiskOnTransition', {
          client_id: transition.client_id,
          transition_id: transitionId
        });
        return result.data;
      } finally {
        setIsAnalyzing(false);
      }
    }
  });

  const { data: generatedTasks, refetch: refetchTasks } = useQuery({
    queryKey: ['transitionTasks', transitionId],
    enabled: false,
    queryFn: async () => {
      if (!transition) return null;
      setIsGeneratingTasks(true);
      try {
        const result = await base44.functions.invoke('generateTransitionTasks', {
          transition_id: transitionId,
          new_practitioner_id: transition.to_practitioner_id
        });
        return result.data;
      } finally {
        setIsGeneratingTasks(false);
      }
    }
  });

  if (!transition) {
    return <div className="text-xs text-slate-500">Loading transition details...</div>;
  }

  return (
    <Tabs defaultValue="risk" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
        <TabsTrigger value="tasks">Handover Tasks</TabsTrigger>
        <TabsTrigger value="audit">Audit Trail</TabsTrigger>
      </TabsList>

      {/* Risk Reassessment */}
      <TabsContent value="risk" className="space-y-4 mt-4">
        {!riskReassessment ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Client Risk Reassessment</CardTitle>
              <CardDescription>Analyze risk profile during transition</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => refetchRisk()}
                disabled={isAnalyzing}
                className="w-full"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Run Risk Reassessment'
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className={
              riskReassessment.risk_reassessment.updated_risk_level === 'critical' ? 'border-red-200' :
              riskReassessment.risk_reassessment.updated_risk_level === 'high' ? 'border-orange-200' : 'border-slate-200'
            }>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm">Updated Risk Profile</CardTitle>
                    <CardDescription>{transition.client_name}</CardDescription>
                  </div>
                  <Badge className={
                    riskReassessment.risk_reassessment.updated_risk_level === 'critical' ? 'bg-red-600' :
                    riskReassessment.risk_reassessment.updated_risk_level === 'high' ? 'bg-orange-600' :
                    riskReassessment.risk_reassessment.updated_risk_level === 'medium' ? 'bg-yellow-600' :
                    'bg-green-600'
                  }>
                    {riskReassessment.risk_reassessment.updated_risk_level}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-slate-50 rounded">
                    <p className="text-slate-600">Risk Score</p>
                    <p className="font-semibold text-lg">{riskReassessment.risk_reassessment.risk_score}</p>
                  </div>
                  <div className="p-2 bg-slate-50 rounded">
                    <p className="text-slate-600">Transition Readiness</p>
                    <p className="font-semibold">{riskReassessment.risk_reassessment.transition_readiness}</p>
                  </div>
                </div>

                {riskReassessment.risk_reassessment.continuity_of_care_risks?.length > 0 && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-3 w-3" />
                    <AlertDescription className="text-xs">
                      <p className="font-semibold mb-1">Continuity of Care Risks:</p>
                      <ul className="space-y-1">
                        {riskReassessment.risk_reassessment.continuity_of_care_risks.map((risk, idx) => (
                          <li key={idx} className="text-xs">• {risk}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {riskReassessment.risk_reassessment.risk_mitigation_actions?.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 p-2 rounded">
                    <p className="text-xs font-semibold text-blue-900 mb-1">Recommended Mitigation Actions:</p>
                    <ul className="text-xs space-y-1 text-blue-800">
                      {riskReassessment.risk_reassessment.risk_mitigation_actions.slice(0, 3).map((action, idx) => (
                        <li key={idx}>→ {action}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="text-xs text-slate-500 border-t pt-2">
                  Monitoring Frequency: <span className="font-semibold">{riskReassessment.risk_reassessment.monitoring_frequency_post_transition}</span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </TabsContent>

      {/* Handover Tasks */}
      <TabsContent value="tasks" className="space-y-4 mt-4">
        {!generatedTasks ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Generate Handover Tasks</CardTitle>
              <CardDescription>Auto-generate tasks for new practitioner</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => refetchTasks()}
                disabled={isGeneratingTasks}
                className="w-full"
              >
                {isGeneratingTasks ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Tasks'
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-xs text-blue-800">
                    <p className="font-semibold">{generatedTasks.tasks_created} tasks created</p>
                    <p>{generatedTasks.total_estimated_hours.toFixed(1)} hours total workload</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 border rounded">
                  <p className="font-semibold text-red-600">{generatedTasks.task_summary.immediate}</p>
                  <p className="text-slate-600">Immediate</p>
                </div>
                <div className="p-2 border rounded">
                  <p className="font-semibold text-orange-600">{generatedTasks.task_summary.week_1}</p>
                  <p className="text-slate-600">Week 1</p>
                </div>
                <div className="p-2 border rounded">
                  <p className="font-semibold text-blue-600">{generatedTasks.task_summary.week_2_4}</p>
                  <p className="text-slate-600">Weeks 2-4</p>
                </div>
              </div>
            </div>

            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-slate-600 mb-2">Tasks have been assigned to {transition.to_practitioner_name} and will appear in their task queue.</p>
              </CardContent>
            </Card>
          </>
        )}
      </TabsContent>

      {/* Audit Trail */}
      <TabsContent value="audit" className="space-y-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Transition Audit Log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs space-y-2 border-l-2 border-slate-300 pl-3">
              <div>
                <p className="font-semibold text-slate-900">Transition Created</p>
                <p className="text-slate-600">{new Date(transition.created_date).toLocaleString()}</p>
              </div>
              {transition.handover_completed_date && (
                <div>
                  <p className="font-semibold text-slate-900 text-green-600">Handover Approved</p>
                  <p className="text-slate-600">{new Date(transition.handover_completed_date).toLocaleString()}</p>
                  {transition.notes && <p className="text-slate-600 italic mt-1">"{transition.notes}"</p>}
                </div>
              )}
              {riskReassessment && (
                <div>
                  <p className="font-semibold text-slate-900">Risk Reassessment Completed</p>
                  <p className="text-slate-600">{riskReassessment.timestamp}</p>
                </div>
              )}
              {generatedTasks && (
                <div>
                  <p className="font-semibold text-slate-900">Handover Tasks Generated</p>
                  <p className="text-slate-600">{generatedTasks.timestamp}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}