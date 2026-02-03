import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function ClientTransitionManager() {
  const [selectedTransition, setSelectedTransition] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const queryClient = useQueryClient();

  const { data: transitions, refetch: refetchTransitions } = useQuery({
    queryKey: ['clientTransitions'],
    queryFn: async () => {
      const data = await base44.entities.ClientTransition.list();
      return data?.sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date)) || [];
    }
  });

  const { data: clients } = useQuery({
    queryKey: ['clients_transitions'],
    queryFn: async () => {
      const data = await base44.entities.Client.list();
      return data?.filter(c => c.status === 'active') || [];
    }
  });

  const { data: practitioners } = useQuery({
    queryKey: ['practitioners_transitions'],
    queryFn: async () => {
      const data = await base44.entities.Practitioner.list();
      return data || [];
    }
  });

  const createTransitionMutation = useMutation({
    mutationFn: async (data) => {
      const result = await base44.functions.invoke('generateClientHandoverSummary', {
        client_id: data.client_id,
        from_practitioner_id: data.from_practitioner_id,
        to_practitioner_id: data.to_practitioner_id
      });

      const transition = await base44.entities.ClientTransition.create({
        client_id: data.client_id,
        client_name: data.client_name,
        from_practitioner_id: data.from_practitioner_id,
        from_practitioner_name: data.from_practitioner_name,
        to_practitioner_id: data.to_practitioner_id,
        to_practitioner_name: data.to_practitioner_name,
        transition_type: data.transition_type,
        reason: data.reason,
        scheduled_date: data.scheduled_date,
        handover_summary: JSON.stringify(result.data.handover_summary),
        status: 'planned'
      });

      return transition;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientTransitions'] });
      refetchTransitions();
      setIsGenerating(false);
    }
  });

  const statusColors = {
    planned: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    paused: 'bg-slate-100 text-slate-800'
  };

  const statusIcons = {
    planned: <Calendar className="h-4 w-4" />,
    in_progress: <Loader2 className="h-4 w-4 animate-spin" />,
    completed: <CheckCircle2 className="h-4 w-4 text-green-600" />,
    paused: <AlertCircle className="h-4 w-4" />
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Create Transition</TabsTrigger>
          <TabsTrigger value="review">Review Handovers</TabsTrigger>
        </TabsList>

        {/* Create Transition */}
        <TabsContent value="create" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Initiate Client Transition</CardTitle>
              <CardDescription>Generate handover summary and transition plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold">Client</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-semibold">Transition Type</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="practitioner_change">Practitioner Change</SelectItem>
                      <SelectItem value="service_change">Service Change</SelectItem>
                      <SelectItem value="graduation">Graduation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold">From Practitioner</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Current practitioner" />
                    </SelectTrigger>
                    <SelectContent>
                      {practitioners?.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-semibold">To Practitioner</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="New practitioner" />
                    </SelectTrigger>
                    <SelectContent>
                      {practitioners?.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold">Scheduled Date</label>
                <Input type="date" />
              </div>

              <div>
                <label className="text-sm font-semibold">Reason (optional)</label>
                <Input placeholder="e.g., Practitioner leave, Client request" />
              </div>

              <Button disabled={isGenerating} className="w-full">
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Handover...
                  </>
                ) : (
                  'Generate Handover Summary'
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Review Handovers */}
        <TabsContent value="review" className="space-y-4 mt-4">
          {transitions && transitions.length > 0 ? (
            <div className="space-y-3">
              {transitions.map(t => (
                <Card key={t.id} className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedTransition(t)}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{t.client_name}</h4>
                        <p className="text-xs text-slate-600 mt-1">
                          {t.from_practitioner_name} → {t.to_practitioner_name}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {format(new Date(t.scheduled_date), 'PPP')}
                        </p>
                      </div>
                      <Badge className={statusColors[t.status]}>
                        {t.status}
                      </Badge>
                    </div>

                    {selectedTransition?.id === t.id && t.handover_summary && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        {(() => {
                          try {
                            const summary = JSON.parse(t.handover_summary);
                            return (
                              <>
                                <div>
                                  <p className="text-xs font-semibold text-slate-900 mb-1">Executive Summary</p>
                                  <p className="text-xs text-slate-700">{summary.executive_summary}</p>
                                </div>

                                {summary.client_strengths?.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold text-slate-900 mb-1">Strengths</p>
                                    <ul className="text-xs space-y-1">
                                      {summary.client_strengths.slice(0, 3).map((s, idx) => (
                                        <li key={idx} className="text-slate-700">• {s}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {summary.transition_recommendations?.length > 0 && (
                                  <div className="bg-blue-50 p-2 rounded">
                                    <p className="text-xs font-semibold text-blue-900 mb-1">Transition Plan</p>
                                    <ul className="text-xs space-y-1">
                                      {summary.transition_recommendations.slice(0, 3).map((r, idx) => (
                                        <li key={idx} className="text-blue-800">→ {r}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </>
                            );
                          } catch (e) {
                            return <p className="text-xs text-slate-600">Handover summary</p>;
                          }
                        })()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12 text-slate-500">
                No transitions scheduled
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}