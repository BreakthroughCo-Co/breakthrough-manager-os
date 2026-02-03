import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, Target, CheckCircle2, AlertCircle, Plus } from 'lucide-react';

const statusConfig = {
  not_started: { icon: AlertCircle, color: 'text-slate-500 bg-slate-50 border-slate-200', label: 'Not Started' },
  in_progress: { icon: Loader2, color: 'text-blue-600 bg-blue-50 border-blue-200', label: 'In Progress' },
  on_track: { icon: CheckCircle2, color: 'text-green-600 bg-green-50 border-green-200', label: 'On Track' },
  at_risk: { icon: AlertCircle, color: 'text-orange-600 bg-orange-50 border-orange-200', label: 'At Risk' },
  achieved: { icon: CheckCircle2, color: 'text-green-700 bg-green-100 border-green-300', label: 'Achieved' }
};

export default function ClientGoalsSection({ clientId }) {
  const { data: goals, isLoading } = useQuery({
    queryKey: ['clientGoals', clientId],
    queryFn: () => base44.entities.ClientGoal.filter({ client_id: clientId })
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  const activeGoals = goals?.filter(g => !['achieved', 'discontinued'].includes(g.status)) || [];
  const achievedGoals = goals?.filter(g => g.status === 'achieved') || [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Current Goals ({activeGoals.length})
          </CardTitle>
          <Button size="sm" variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Goal
          </Button>
        </CardHeader>

        <CardContent>
          {activeGoals.length > 0 ? (
            <div className="space-y-3">
              {activeGoals.map(goal => {
                const config = statusConfig[goal.status] || statusConfig.not_started;
                const StatusIcon = config.icon;

                return (
                  <div key={goal.id} className={`p-4 border rounded-lg ${config.color}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <StatusIcon className="h-5 w-5" />
                        <span className="font-medium">{goal.goal_description}</span>
                      </div>
                      <Badge variant="outline">{config.label}</Badge>
                    </div>

                    {goal.current_progress !== undefined && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Progress</span>
                          <span>{goal.current_progress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${goal.current_progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {goal.ndis_domain && (
                      <p className="text-xs text-slate-600 mt-2">
                        <strong>Domain:</strong> {goal.ndis_domain}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <Alert>
              <AlertTitle className="text-slate-600">No active goals set</AlertTitle>
            </Alert>
          )}
        </CardContent>
      </Card>

      {achievedGoals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Achieved Goals ({achievedGoals.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {achievedGoals.map(goal => (
                <div key={goal.id} className="p-2 bg-green-50 border border-green-200 rounded text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-green-900">{goal.goal_description}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}