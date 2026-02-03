import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, TrendingUp, Users, Briefcase } from 'lucide-react';

export default function ResourceAllocationOptimizer() {
  const [forecast, setForecast] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleForecast = async () => {
    setIsLoading(true);
    try {
      const result = await base44.functions.invoke('forecastResourceDemand', {});
      setForecast(result.data);
    } catch (error) {
      alert('Forecast failed: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-teal-600 mr-2" />
          Forecasting resource demand...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Resource Allocation Optimizer</h1>
          <p className="text-muted-foreground mt-1">AI-powered staffing and resource forecasting</p>
        </div>
        <Button onClick={handleForecast} className="bg-teal-600 hover:bg-teal-700">
          <RefreshCw className="w-4 h-4 mr-2" />
          Run Forecast
        </Button>
      </div>

      {forecast && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">Total Clients</p>
                <p className="text-3xl font-bold">{forecast.total_clients}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">Active Practitioners</p>
                <p className="text-3xl font-bold">{forecast.total_practitioners}</p>
              </CardContent>
            </Card>
            <Card className={`${
              parseFloat(forecast.avg_practitioner_utilization) > 85 ? 'border-amber-200 bg-amber-50' : ''
            }`}>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">Avg Utilization</p>
                <p className="text-3xl font-bold">{forecast.avg_practitioner_utilization}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Service Demand Forecast */}
          {forecast.forecast_analysis.demand_forecast?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Service Demand Forecast (12 Months)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {forecast.forecast_analysis.demand_forecast.map((service, idx) => (
                  <div key={idx} className="p-3 border rounded">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{service.service_type}</h4>
                      <Badge variant="outline" className={
                        service.priority === 'critical' ? 'border-red-300 bg-red-50' :
                        service.priority === 'high' ? 'border-amber-300 bg-amber-50' :
                        'border-slate-300'
                      }>
                        {service.priority}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Current</p>
                        <p className="font-semibold">{service.current_clients} clients</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Projected Growth</p>
                        <p className="font-semibold">{service.projected_growth}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 mt-2">Gap: {service.capacity_gap}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Staffing Requirements */}
          {forecast.forecast_analysis.staffing_requirements?.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-900 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Staffing Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {forecast.forecast_analysis.staffing_requirements.map((req, idx) => (
                  <div key={idx} className="p-3 bg-white rounded border border-blue-200">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-blue-900">{req.position}</h4>
                      <Badge className={
                        req.urgency === 'immediate' ? 'bg-red-600' :
                        req.urgency === 'within_3_months' ? 'bg-amber-600' :
                        'bg-blue-600'
                      }>
                        {req.urgency}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-blue-800">
                      <div>Qty: <strong>{req.quantity}</strong></div>
                      <div>Timeline: {req.recruitment_timeline}</div>
                      <div>Cost: {req.estimated_cost}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Reallocation Opportunities */}
          {forecast.forecast_analysis.reallocation_opportunities?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Practitioner Reallocation Opportunities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {forecast.forecast_analysis.reallocation_opportunities.map((opp, idx) => (
                  <div key={idx} className="p-3 border rounded">
                    <p className="font-semibold text-sm mb-1">{opp.practitioner_name}</p>
                    <p className="text-xs text-slate-600 mb-1">Current: {opp.current_load}</p>
                    <p className="text-xs font-medium text-teal-700 mb-1">Action: {opp.recommendation}</p>
                    <p className="text-xs text-slate-600">Why: {opp.rationale}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Program Recommendations */}
          {forecast.forecast_analysis.program_recommendations?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Program Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {forecast.forecast_analysis.program_recommendations.map((prog, idx) => (
                  <div key={idx} className="p-3 border rounded">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold">{prog.program_name}</h4>
                      <Badge variant="outline">{prog.type.toUpperCase()}</Badge>
                    </div>
                    <p className="text-xs text-slate-600 mb-2">{prog.reasoning}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                      <div><strong>Demand:</strong> {prog.estimated_demand}</div>
                      <div><strong>Resources:</strong> {prog.resource_requirement}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Efficiency Improvements */}
          {forecast.forecast_analysis.efficiency_improvements?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Efficiency Improvements (No New Hires)</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {forecast.forecast_analysis.efficiency_improvements.map((improvement, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <span className="text-teal-600 mt-1">→</span>
                      <span>{improvement}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Action Plan */}
          {forecast.forecast_analysis.action_plan?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Implementation Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {forecast.forecast_analysis.action_plan.map((phase, idx) => (
                  <div key={idx} className="p-3 border rounded">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{phase.phase}</h4>
                      <Badge variant="outline">{phase.timeline}</Badge>
                    </div>
                    <ul className="text-sm space-y-1 mb-2">
                      {phase.actions?.slice(0, 3).map((action, aIdx) => (
                        <li key={aIdx} className="text-slate-700">• {action}</li>
                      ))}
                    </ul>
                    <p className="text-xs font-medium text-emerald-700">Expected: {phase.expected_outcome}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {forecast.upcoming_plan_renewals > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <p className="text-sm text-amber-900">
                  <strong>{forecast.upcoming_plan_renewals} client plan renewals</strong> in next 90 days.
                  Recommend proactive outreach and capacity planning to support renewed goals.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}