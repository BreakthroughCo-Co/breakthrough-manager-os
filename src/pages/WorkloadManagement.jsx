import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';

export default function WorkloadManagement() {
  const [workloadData, setWorkloadData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleOptimize = async () => {
    setIsLoading(true);
    try {
      const result = await base44.functions.invoke('optimizeCaseloads', {});
      setWorkloadData(result.data);
    } catch (error) {
      alert('Failed to run optimization: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workload Management & Optimization</h1>
          <p className="text-muted-foreground mt-1">AI-recommended caseload distribution for optimal balance</p>
        </div>
        <Button 
          onClick={handleOptimize}
          disabled={isLoading}
          size="lg"
          className="bg-teal-600 hover:bg-teal-700"
        >
          {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Run Optimization
        </Button>
      </div>

      {isLoading && (
        <Card>
          <CardContent className="pt-6 flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-teal-600 mr-2" />
            Analyzing workloads...
          </CardContent>
        </Card>
      )}

      {workloadData && (
        <div className="space-y-6">
          {/* Health Status */}
          <Card className={`border-l-4 ${
            workloadData.optimization_analysis.overall_health === 'healthy' ? 'border-l-emerald-500' :
            workloadData.optimization_analysis.overall_health === 'stressed' ? 'border-l-amber-500' :
            'border-l-red-500'
          }`}>
            <CardHeader>
              <CardTitle>Overall Workload Health: {workloadData.optimization_analysis.overall_health.toUpperCase()}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{workloadData.optimization_analysis.health_summary}</p>
            </CardContent>
          </Card>

          {/* Capacity Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Capacity Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Total Capacity</span>
                    <span className="text-sm">{workloadData.total_assigned} / {workloadData.total_capacity} clients</span>
                  </div>
                  <Progress 
                    value={(workloadData.total_assigned / workloadData.total_capacity) * 100}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {((workloadData.total_assigned / workloadData.total_capacity) * 100).toFixed(1)}% utilized
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Overloaded Practitioners */}
          {workloadData.optimization_analysis.overloaded_practitioners?.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Overloaded Practitioners (Intervention Needed)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {workloadData.optimization_analysis.overloaded_practitioners?.map((p, idx) => (
                  <div key={idx} className="p-3 bg-white rounded border border-red-200">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-slate-600 mt-1">Current Load: {p.current_load}</p>
                    <p className="text-sm text-red-700 mt-1"><strong>Risk:</strong> {p.risk_level} burnout</p>
                    <p className="text-sm text-red-700"><strong>Recommendation:</strong> {p.recommended_relief}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Available Capacity */}
          {workloadData.optimization_analysis.available_capacity?.length > 0 && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardHeader>
                <CardTitle className="text-emerald-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Available Capacity (Ready for Expansion)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {workloadData.optimization_analysis.available_capacity?.map((p, idx) => (
                  <div key={idx} className="p-3 bg-white rounded border border-emerald-200">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-emerald-700 mt-1">
                      Available Slots: <strong>{p.available_slots}</strong> clients
                    </p>
                    <p className="text-sm text-slate-600">
                      Recommended Client Type: {p.recommended_client_type}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Rebalancing Opportunities */}
          {workloadData.optimization_analysis.rebalancing_opportunities?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Rebalancing Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {workloadData.optimization_analysis.rebalancing_opportunities?.map((opp, idx) => (
                  <div key={idx} className="p-2 bg-blue-50 rounded border border-blue-200 text-sm">
                    {opp}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Sustainability Assessment */}
          <Card>
            <CardHeader>
              <CardTitle>Sustainability Assessment</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p>{workloadData.optimization_analysis.sustainability_assessment}</p>
            </CardContent>
          </Card>

          {/* Action Items */}
          {workloadData.optimization_analysis.action_items?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Action Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {workloadData.optimization_analysis.action_items?.map((action, idx) => (
                  <div key={idx} className="p-3 border rounded">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium">{action.action}</p>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        action.urgency === 'immediate' ? 'bg-red-100 text-red-700' :
                        action.urgency === '1-month' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {action.urgency}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{action.rationale}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Practitioner Details */}
          <Card>
            <CardHeader>
              <CardTitle>Practitioner Workload Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {workloadData.utilization_summary?.map((p, idx) => (
                  <div key={idx} className="p-3 border rounded">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{p.practitioner_name}</p>
                      <span className="text-sm text-slate-600">{p.current_caseload}/{p.capacity}</span>
                    </div>
                    <Progress 
                      value={(p.current_caseload / p.capacity) * 100}
                      className="h-1.5"
                    />
                    <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Hours Ratio</p>
                        <p className="font-medium">{p.utilization_ratio}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">High-Risk</p>
                        <p className="font-medium">{p.high_risk_clients}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Incidents</p>
                        <p className="font-medium">{p.incidents_30d}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}