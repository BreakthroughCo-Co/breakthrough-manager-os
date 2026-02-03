import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { TrendingUp } from 'lucide-react';

export default function OperationalMetricsWidget() {
  const { data: transitions } = useQuery({
    queryKey: ['transitions_count'],
    queryFn: async () => base44.entities.ClientTransition.list()
  });

  const { data: distributionLogs } = useQuery({
    queryKey: ['distribution_count'],
    queryFn: async () => base44.entities.DistributionLog.list()
  });

  const { data: trainingRecs } = useQuery({
    queryKey: ['training_count'],
    queryFn: async () => base44.entities.TrainingRecommendation.list()
  });

  const completedTransitions = transitions?.filter(t => t.status === 'completed').length || 0;
  const successfulDistributions = distributionLogs?.filter(l => l.status === 'sent').length || 0;
  const completedTraining = trainingRecs?.filter(t => t.status === 'completed').length || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Operational Metrics
        </CardTitle>
        <CardDescription>Current period activity</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-900">{completedTransitions}</p>
          <p className="text-xs text-slate-600">Transitions</p>
          <p className="text-xs text-slate-500 mt-1">completed</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-900">{successfulDistributions}</p>
          <p className="text-xs text-slate-600">Reports</p>
          <p className="text-xs text-slate-500 mt-1">distributed</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-900">{completedTraining}</p>
          <p className="text-xs text-slate-600">Training</p>
          <p className="text-xs text-slate-500 mt-1">modules done</p>
        </div>
      </CardContent>
    </Card>
  );
}