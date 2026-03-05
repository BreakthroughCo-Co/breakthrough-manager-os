import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { UserPlus, Loader2, Sparkles, ExternalLink, Archive, CheckCircle2, ArrowRight } from 'lucide-react';
import IntakeConversionFunnel from '@/components/intake/IntakeConversionFunnel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

const PIPELINE_STAGES = [
  { key: 'new', label: 'New', color: 'bg-slate-100 border-slate-300' },
  { key: 'pending_review', label: 'Pending Review', color: 'bg-amber-50 border-amber-300' },
  { key: 'reviewed', label: 'Reviewed', color: 'bg-blue-50 border-blue-300' },
  { key: 'contacted', label: 'Contacted', color: 'bg-purple-50 border-purple-300' },
  { key: 'contract_sent', label: 'Contract Sent', color: 'bg-orange-50 border-orange-300' },
  { key: 'converted', label: 'Converted', color: 'bg-emerald-50 border-emerald-300' },
];

const urgencyColors = {
  immediate: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
};

const sourceColors = {
  '17hats_zapier': 'bg-blue-100 text-blue-700',
  manual: 'bg-slate-100 text-slate-600',
  referral: 'bg-purple-100 text-purple-700',
  website: 'bg-teal-100 text-teal-700',
};

export default function IntakePipeline() {
  const queryClient = useQueryClient();

  const { data: intakes = [], isLoading } = useQuery({
    queryKey: ['intake-pipeline'],
    queryFn: () => base44.entities.ClientIntakeRequest.list('-created_date', 200),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.ClientIntakeRequest.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries(['intake-pipeline']),
  });

  const SERVICE_MAP = {
    'Behaviour Support': 'Behaviour Support',
    'LEGO Therapy': 'LEGO Therapy',
    'Capacity Building': 'Capacity Building',
    'Combined': 'Combined',
    'Not Sure': 'Behaviour Support'
  };

  const convertToClient = useMutation({
    mutationFn: async (intake) => {
      const analysis = intake.ai_analysis ? JSON.parse(intake.ai_analysis) : {};
      const today = format(new Date(), 'yyyy-MM-dd');
      const client = await base44.entities.Client.create({
        full_name: intake.participant_name || `${intake.given_name || ''} ${intake.surname || ''}`.trim() || intake.contact_name,
        ndis_number: intake.ndis_number || '',
        primary_contact_name: intake.contact_name,
        primary_contact_email: intake.contact_email,
        primary_contact_phone: intake.contact_phone,
        service_type: SERVICE_MAP[analysis.recommended_service] || SERVICE_MAP[intake.service_interest] || 'Behaviour Support',
        status: 'active',
        plan_start_date: today,
        risk_level: intake.urgency === 'immediate' || intake.urgency === 'high' ? 'high' : 'low',
      });
      // Auto-create onboarding task
      await base44.entities.Task.create({
        title: `Onboard New Client: ${client.full_name}`,
        description: `New client converted from intake on ${today}. Actions: assign practitioner, complete service agreement, enter NDIS plan funding details, schedule initial assessment.\n\nContact: ${intake.contact_email} / ${intake.contact_phone || 'N/A'}\nService: ${client.service_type}\nNDIS: ${client.ndis_number || 'Pending verification'}`,
        category: 'Client Management',
        priority: intake.urgency === 'immediate' ? 'critical' : 'high',
        status: 'pending',
        related_entity_type: 'Client',
        related_entity_id: client.id
      });
      await base44.entities.ClientIntakeRequest.update(intake.id, {
        status: 'converted',
        client_id: client.id,
        conversion_notes: `Converted to Client entity on ${today}`,
      });
      return client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['intake-pipeline']);
      queryClient.invalidateQueries(['clients']);
    },
  });

  const archiveIntake = useMutation({
    mutationFn: (id) => base44.entities.ClientIntakeRequest.update(id, { status: 'archived' }),
    onSuccess: () => queryClient.invalidateQueries(['intake-pipeline']),
  });

  const activeIntakes = intakes.filter(i => i.status !== 'archived' && i.status !== 'declined');
  const archived = intakes.filter(i => i.status === 'archived' || i.status === 'declined');

  const getStageIntakes = (key) => activeIntakes.filter(i => i.status === key);

  const stats = {
    total: activeIntakes.length,
    new: getStageIntakes('new').length,
    zapier: intakes.filter(i => i.source === '17hats_zapier').length,
    converted: intakes.filter(i => i.status === 'converted').length,
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-teal-600" />
            Intake Pipeline
          </h2>
          <p className="text-muted-foreground mt-1">17hats → NDIS client conversion workflow</p>
        </div>
        <Link to={createPageUrl('ClientIntake')}>
          <Button variant="outline" size="sm">
            <ExternalLink className="w-4 h-4 mr-2" />
            Manual Intake Form
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Active', value: stats.total, color: 'text-slate-900' },
          { label: 'New / Unreviewed', value: stats.new, color: 'text-amber-600' },
          { label: 'Via 17hats', value: stats.zapier, color: 'text-blue-600' },
          { label: 'Converted', value: stats.converted, color: 'text-emerald-600' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3">
              <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Kanban Pipeline */}
      <div className="grid grid-cols-6 gap-3 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map(stage => (
          <div key={stage.key} className="min-w-[200px]">
            <div className={cn("rounded-lg border-2 p-3 h-full", stage.color)}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase text-slate-600">{stage.label}</p>
                <Badge variant="outline" className="text-xs">{getStageIntakes(stage.key).length}</Badge>
              </div>
              <div className="space-y-2">
                {getStageIntakes(stage.key).map(intake => {
                  const name = intake.participant_name || `${intake.given_name || ''} ${intake.surname || ''}`.trim() || intake.contact_name;
                  return (
                    <Card key={intake.id} className="shadow-sm">
                      <CardContent className="p-3 space-y-2">
                        <p className="font-medium text-sm truncate">{name}</p>
                        <p className="text-xs text-muted-foreground truncate">{intake.contact_email}</p>
                        <div className="flex flex-wrap gap-1">
                          {intake.urgency && (
                            <Badge className={cn("text-xs", urgencyColors[intake.urgency])}>{intake.urgency}</Badge>
                          )}
                          {intake.source && (
                            <Badge className={cn("text-xs", sourceColors[intake.source] || 'bg-slate-100')}>{intake.source === '17hats_zapier' ? '17hats' : intake.source}</Badge>
                          )}
                        </div>
                        {intake.ndis_number && (
                          <p className="text-xs text-muted-foreground font-mono">NDIS: {intake.ndis_number}</p>
                        )}
                        <div className="flex flex-col gap-1 pt-1">
                          {stage.key !== 'converted' && (
                            <>
                              {/* Advance to next stage */}
                              {PIPELINE_STAGES.findIndex(s => s.key === stage.key) < PIPELINE_STAGES.length - 2 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full text-xs h-7"
                                  onClick={() => {
                                    const nextIdx = PIPELINE_STAGES.findIndex(s => s.key === stage.key) + 1;
                                    updateStatus.mutate({ id: intake.id, status: PIPELINE_STAGES[nextIdx].key });
                                  }}
                                >
                                  <ArrowRight className="w-3 h-3 mr-1" />
                                  {PIPELINE_STAGES[PIPELINE_STAGES.findIndex(s => s.key === stage.key) + 1]?.label}
                                </Button>
                              )}
                              {(stage.key === 'contract_sent' || stage.key === 'reviewed' || stage.key === 'contacted') && (
                                 <Button
                                   size="sm"
                                   className={cn("w-full text-xs h-7", stage.key === 'contract_sent' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-teal-500 hover:bg-teal-600')}
                                   onClick={() => convertToClient.mutate(intake)}
                                   disabled={convertToClient.isPending}
                                 >
                                   <CheckCircle2 className="w-3 h-3 mr-1" />
                                   {stage.key === 'contract_sent' ? 'Convert to Client' : 'Convert (Early)'}
                                 </Button>
                               )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="w-full text-xs h-7 text-slate-500"
                                onClick={() => archiveIntake.mutate(intake.id)}
                              >
                                <Archive className="w-3 h-3 mr-1" />
                                Archive
                              </Button>
                            </>
                          )}
                          {stage.key === 'converted' && intake.client_id && (
                            <Link to={createPageUrl(`ClientDetail?id=${intake.client_id}`)}>
                              <Button size="sm" variant="outline" className="w-full text-xs h-7">
                                View Client
                              </Button>
                            </Link>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {getStageIntakes(stage.key).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Empty</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Conversion Funnel */}
      <IntakeConversionFunnel />

      {/* Archived section */}
      {archived.length > 0 && (
        <div className="border-t pt-4">
          <p className="text-sm text-muted-foreground mb-2">Archived / Declined ({archived.length})</p>
          <div className="flex flex-wrap gap-2">
            {archived.map(i => (
              <Badge key={i.id} variant="outline" className="text-xs">
                {i.participant_name || i.contact_name} — {i.status}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}