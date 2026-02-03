import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertCircle, Calendar, Mail, Zap } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';

export default function OperationalAlertsWidget() {
  const { data: transitions } = useQuery({
    queryKey: ['transitions_upcoming'],
    queryFn: async () => {
      const data = await base44.entities.ClientTransition.list();
      return data || [];
    }
  });

  const { data: distributionLogs } = useQuery({
    queryKey: ['distribution_failures'],
    queryFn: async () => {
      const data = await base44.entities.DistributionLog.list();
      return data || [];
    }
  });

  const { data: trainingRecs } = useQuery({
    queryKey: ['training_pending'],
    queryFn: async () => {
      const data = await base44.entities.TrainingRecommendation.list();
      return data || [];
    }
  });

  // Upcoming transitions (7 days)
  const upcomingTransitions = transitions?.filter(t => {
    const daysUntil = differenceInDays(new Date(t.scheduled_date), new Date());
    return daysUntil <= 7 && daysUntil > 0 && t.status !== 'completed';
  }) || [];

  // Failed distributions
  const failedDistributions = distributionLogs?.filter(l => l.status === 'failed' || l.status === 'partial') || [];

  // Critical training (no completion date set)
  const criticalTraining = trainingRecs?.filter(t => t.priority === 'critical' && t.status === 'recommended') || [];

  const alertCount = upcomingTransitions.length + failedDistributions.length + criticalTraining.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Operational Alerts
            </CardTitle>
            <CardDescription>Critical management actions</CardDescription>
          </div>
          {alertCount > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {alertCount}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Upcoming Transitions */}
        {upcomingTransitions.length > 0 && (
          <Alert className="border-orange-200 bg-orange-50 py-2">
            <Calendar className="h-3 w-3 text-orange-600" />
            <AlertDescription className="text-xs text-orange-800">
              <span className="font-semibold">{upcomingTransitions.length}</span> transition(s) scheduled within 7 days
              {upcomingTransitions.map(t => (
                <div key={t.id} className="text-xs mt-1">
                  {t.client_name} → {format(new Date(t.scheduled_date), 'MMM d')}
                </div>
              ))}
            </AlertDescription>
          </Alert>
        )}

        {/* Failed Distributions */}
        {failedDistributions.length > 0 && (
          <Alert className="border-red-200 bg-red-50 py-2">
            <Mail className="h-3 w-3 text-red-600" />
            <AlertDescription className="text-xs text-red-800">
              <span className="font-semibold">{failedDistributions.length}</span> report distribution(s) failed
              {failedDistributions.slice(0, 2).map(d => (
                <div key={d.id} className="text-xs mt-1">
                  {d.report_type.replace(/_/g, ' ')} • {d.recipient_count} recipients
                </div>
              ))}
            </AlertDescription>
          </Alert>
        )}

        {/* Critical Training */}
        {criticalTraining.length > 0 && (
          <Alert className="border-red-200 bg-red-50 py-2">
            <AlertCircle className="h-3 w-3 text-red-600" />
            <AlertDescription className="text-xs text-red-800">
              <span className="font-semibold">{criticalTraining.length}</span> critical training module(s) pending
              {criticalTraining.slice(0, 2).map(t => (
                <div key={t.id} className="text-xs mt-1">
                  {t.practitioner_name} • {t.training_module_name}
                </div>
              ))}
            </AlertDescription>
          </Alert>
        )}

        {alertCount === 0 && (
          <p className="text-xs text-slate-500 text-center py-2">No critical alerts</p>
        )}
      </CardContent>
    </Card>
  );
}