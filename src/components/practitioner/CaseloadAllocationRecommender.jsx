import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, CheckCircle, TrendingUp, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CaseloadAllocationRecommender() {
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const queryClient = useQueryClient();

  const { data: recommendations, isLoading, error } = useQuery({
    queryKey: ['caseloadRecommendations'],
    queryFn: () => base44.functions.invoke('recommendCaseloadAllocation', {}),
    select: (response) => response.data
  });

  const assignMutation = useMutation({
    mutationFn: ({ clientId, practitionerId }) =>
      base44.entities.Client.update(clientId, { assigned_practitioner_id: practitionerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caseloadRecommendations'] });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Failed to load recommendations</AlertTitle>
      </Alert>
    );
  }

  if (!recommendations) return null;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">At Capacity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {recommendations.summary?.practitioners_at_capacity || 0}
            </p>
            <p className="text-xs text-slate-600 mt-1">Require immediate relief</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Compliance Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">
              {recommendations.summary?.practitioners_compliance_risk || 0}
            </p>
            <p className="text-xs text-slate-600 mt-1">Expiring creds/training</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Unassigned Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              {recommendations.summary?.clients_needing_assignment || 0}
            </p>
            <p className="text-xs text-slate-600 mt-1">Awaiting allocation</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">At-Risk Unassigned</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">
              {recommendations.summary?.unassigned_at_risk_clients || 0}
            </p>
            <p className="text-xs text-slate-600 mt-1">Priority allocation</p>
          </CardContent>
        </Card>
      </div>

      {/* Flagged Practitioners */}
      {recommendations.flagged_practitioners?.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Practitioners Requiring Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.flagged_practitioners.map((p) => (
                <div
                  key={p.practitioner_id}
                  className={cn(
                    'p-3 rounded-lg border',
                    p.severity === 'critical'
                      ? 'bg-red-100 border-red-300'
                      : 'bg-amber-100 border-amber-300'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <ul className="text-xs text-slate-700 mt-1 space-y-0.5">
                        {p.issues.map((issue, i) => (
                          <li key={i}>• {issue}</li>
                        ))}
                      </ul>
                    </div>
                    <Badge
                      className={
                        p.severity === 'critical'
                          ? 'bg-red-600'
                          : p.severity === 'high'
                          ? 'bg-amber-600'
                          : 'bg-orange-600'
                      }
                    >
                      {p.severity.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Allocation Recommendations */}
      {recommendations.allocation_recommendations?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-teal-600" />
              Client Allocation Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recommendations.allocation_recommendations.map((rec) => (
              <div key={rec.client_id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{rec.client_name}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline">{rec.service_type}</Badge>
                      <Badge
                        className={
                          rec.risk_level === 'high'
                            ? 'bg-red-100 text-red-800'
                            : rec.risk_level === 'medium'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-green-100 text-green-800'
                        }
                      >
                        {rec.risk_level?.toUpperCase()} Risk
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600">
                    Current: {rec.current_assignment || 'Unassigned'}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700">Recommended Practitioners:</p>
                  {rec.recommended_practitioners.map((prac, idx) => (
                    <div key={prac.practitioner_id} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{idx + 1}. {prac.name}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs text-slate-600">
                            Capacity: {prac.capacity_available} slots
                          </span>
                          <span className="text-xs text-slate-600">
                            Match: {prac.specialisation_match}
                          </span>
                          <span className="text-xs text-slate-600">
                            Efficiency: {Math.round(prac.efficiency_score * 100)}%
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-700"
                        onClick={() => {
                          assignMutation.mutate({
                            clientId: rec.client_id,
                            practitionerId: prac.practitioner_id
                          });
                          setSelectedRecommendation(null);
                        }}
                        disabled={assignMutation.isPending}
                      >
                        {assignMutation.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle className="h-3 w-3" />
                        )}
                        Assign
                      </Button>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-slate-600 italic">{rec.rationale}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Rebalance Suggestions */}
      {recommendations.rebalance_suggestions?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-600" />
              Caseload Rebalancing Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.rebalance_suggestions.map((sug) => (
                <div
                  key={sug.practitioner_id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-amber-50"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{sug.name}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Current: {sug.current_caseload}/{sug.capacity} ({sug.utilisation_percent}%)
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="bg-amber-100 text-amber-800">
                      Offload {sug.recommended_offload} clients
                    </Badge>
                    <p className="text-xs text-slate-600 mt-2">
                      Billable Eff: {sug.billable_efficiency}%
                    </p>
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