import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertTriangle, Calendar } from 'lucide-react';

export default function WorkloadForecastPanel({ practitionerId, practitionerName }) {
  const [forecast, setForecast] = useState(null);

  const forecastMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('forecastPractitionerWorkload', {
        practitioner_id: practitionerId,
        forecast_weeks: 4
      });
      return response.data;
    },
    onSuccess: (data) => {
      setForecast(data.forecast);
    }
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Workload Forecast</CardTitle>
          <Button 
            size="sm" 
            onClick={() => forecastMutation.mutate()}
            disabled={forecastMutation.isPending}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            {forecastMutation.isPending ? 'Analyzing...' : 'Generate Forecast'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!forecast ? (
          <p className="text-sm text-slate-600">Generate forecast to predict workload capacity</p>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Current Utilization</span>
                <Badge className={
                  forecast.capacity_analysis.current_utilization_percentage > 90 ? 'bg-red-600' :
                  forecast.capacity_analysis.current_utilization_percentage > 75 ? 'bg-amber-600' :
                  'bg-green-600'
                }>
                  {forecast.capacity_analysis.current_utilization_percentage?.toFixed(0)}%
                </Badge>
              </div>
              <p className="text-xs text-slate-700">{forecast.capacity_analysis.capacity_status}</p>
            </div>

            {forecast.bottleneck_alerts?.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Capacity Alerts</p>
                {forecast.bottleneck_alerts.slice(0, 3).map((alert, idx) => (
                  <div key={idx} className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-3 w-3 text-red-600" />
                      <span className="font-medium">Week {alert.week_affected}</span>
                      <Badge variant="outline" className="text-xs">{alert.severity}</Badge>
                    </div>
                    <p className="text-red-900">{alert.impact}</p>
                    <p className="text-blue-700 mt-1"><strong>Action:</strong> {alert.recommended_action}</p>
                  </div>
                ))}
              </div>
            )}

            <div>
              <p className="text-sm font-medium mb-2">4-Week Outlook</p>
              <div className="space-y-1">
                {forecast.weekly_predictions?.map((week, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded text-xs">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      <span>Week {week.week_number}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{week.predicted_workload_hours}hrs</span>
                      <Badge className={
                        week.risk_level === 'high' ? 'bg-red-600' :
                        week.risk_level === 'medium' ? 'bg-amber-600' :
                        'bg-green-600'
                      }>
                        {week.utilization_level}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {forecast.efficiency_opportunities?.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Efficiency Opportunities</p>
                <ul className="space-y-1 text-xs">
                  {forecast.efficiency_opportunities.slice(0, 3).map((opp, idx) => (
                    <li key={idx} className="p-2 bg-blue-50 rounded">
                      <p className="font-medium">{opp.opportunity}</p>
                      <p className="text-blue-700">Saves: {opp.estimated_time_saving}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}