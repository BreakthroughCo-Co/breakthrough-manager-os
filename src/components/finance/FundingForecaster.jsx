import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingDown, DollarSign, Calendar, AlertTriangle, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';

/**
 * Plan Utilization Forecasting
 * Predicts funding exhaustion dates and alerts proactively
 */
export default function FundingForecaster({ clientId }) {
  const [forecast, setForecast] = useState(null);

  const { data: client } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => base44.entities.Client.filter({ id: clientId }).then(r => r[0]),
    enabled: !!clientId,
  });

  const { data: billing = [] } = useQuery({
    queryKey: ['billing', clientId],
    queryFn: () => base44.entities.BillingRecord.filter({ client_id: clientId }, '-service_date', 100),
    enabled: !!clientId,
  });

  useEffect(() => {
    if (client && billing.length > 0) {
      calculateForecast();
    }
  }, [client, billing]);

  const calculateForecast = () => {
    const allocated = client.funding_allocated || 0;
    const utilised = client.funding_utilised || 0;
    const remaining = allocated - utilised;

    // Calculate daily burn rate from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentBilling = billing.filter(b => 
      new Date(b.service_date) >= thirtyDaysAgo && b.status !== 'rejected'
    );

    const totalSpent = recentBilling.reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const dailyBurnRate = totalSpent / 30;
    const weeklyBurnRate = dailyBurnRate * 7;

    // Predict exhaustion date
    const daysUntilExhaustion = dailyBurnRate > 0 ? remaining / dailyBurnRate : Infinity;
    const exhaustionDate = dailyBurnRate > 0 ? addDays(new Date(), daysUntilExhaustion) : null;

    // Check plan end date
    const planEndDate = client.plan_end_date ? parseISO(client.plan_end_date) : null;
    const daysUntilPlanEnd = planEndDate ? differenceInDays(planEndDate, new Date()) : Infinity;

    // Determine risk level
    let riskLevel = 'low';
    let riskMessage = '';

    if (exhaustionDate && daysUntilExhaustion < 30) {
      riskLevel = 'critical';
      riskMessage = `Funding predicted to exhaust in ${Math.round(daysUntilExhaustion)} days`;
    } else if (exhaustionDate && daysUntilExhaustion < 60) {
      riskLevel = 'high';
      riskMessage = `Funding predicted to exhaust in ${Math.round(daysUntilExhaustion)} days`;
    } else if (remaining / allocated < 0.2) {
      riskLevel = 'moderate';
      riskMessage = `Less than 20% of funding remaining`;
    } else {
      riskMessage = 'Funding utilization is on track';
    }

    // Generate projection data for chart
    const projectionData = [];
    const today = new Date();
    
    for (let i = 0; i <= 90; i += 7) {
      const date = addDays(today, i);
      const projectedSpend = utilised + (dailyBurnRate * i);
      
      projectionData.push({
        date: format(date, 'MMM dd'),
        actual: i === 0 ? utilised : null,
        projected: projectedSpend,
        allocated: allocated,
      });
    }

    setForecast({
      allocated,
      utilised,
      remaining,
      dailyBurnRate,
      weeklyBurnRate,
      daysUntilExhaustion,
      exhaustionDate,
      planEndDate,
      daysUntilPlanEnd,
      riskLevel,
      riskMessage,
      projectionData,
      utilizationRate: (utilised / allocated) * 100,
    });
  };

  const getRiskColor = (level) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      moderate: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };
    return colors[level] || colors.low;
  };

  if (!forecast) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              Funding Forecast
            </CardTitle>
            <Badge className={getRiskColor(forecast.riskLevel)}>
              {forecast.riskLevel} Risk
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {(forecast.riskLevel === 'high' || forecast.riskLevel === 'critical') && (
            <Alert className="mb-4 bg-orange-50 border-orange-200">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <AlertDescription className="text-orange-900">
                <strong>Action Required:</strong> {forecast.riskMessage}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div>
              <DollarSign className="w-5 h-5 mb-1 text-blue-600" />
              <p className="text-xs text-muted-foreground">Allocated</p>
              <p className="text-xl font-bold">${forecast.allocated.toLocaleString()}</p>
            </div>
            <div>
              <TrendingUp className="w-5 h-5 mb-1 text-green-600" />
              <p className="text-xs text-muted-foreground">Utilised</p>
              <p className="text-xl font-bold">${forecast.utilised.toLocaleString()}</p>
            </div>
            <div>
              <DollarSign className="w-5 h-5 mb-1 text-teal-600" />
              <p className="text-xs text-muted-foreground">Remaining</p>
              <p className="text-xl font-bold">${forecast.remaining.toLocaleString()}</p>
            </div>
            <div>
              <TrendingDown className="w-5 h-5 mb-1 text-purple-600" />
              <p className="text-xs text-muted-foreground">Weekly Burn</p>
              <p className="text-xl font-bold">${forecast.weeklyBurnRate.toFixed(0)}</p>
            </div>
          </div>

          <Card className="bg-slate-50 mb-4">
            <CardContent className="pt-4">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={forecast.projectionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" style={{ fontSize: '11px' }} />
                  <YAxis style={{ fontSize: '11px' }} />
                  <Tooltip />
                  <ReferenceLine 
                    y={forecast.allocated} 
                    stroke="#94a3b8" 
                    strokeDasharray="3 3" 
                    label="Plan Limit" 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="#0ea5e9" 
                    strokeWidth={2} 
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="projected" 
                    stroke="#8b5cf6" 
                    strokeWidth={2} 
                    strokeDasharray="5 5" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <Calendar className="w-5 h-5 mb-2 text-blue-600" />
                <p className="text-xs text-blue-900 mb-1">Predicted Exhaustion</p>
                <p className="text-lg font-bold text-blue-900">
                  {forecast.exhaustionDate 
                    ? format(forecast.exhaustionDate, 'dd MMM yyyy')
                    : 'Not predicted'}
                </p>
                <p className="text-xs text-blue-700">
                  {forecast.daysUntilExhaustion !== Infinity 
                    ? `${Math.round(forecast.daysUntilExhaustion)} days`
                    : 'Sustainable rate'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-teal-50 border-teal-200">
              <CardContent className="pt-4">
                <Calendar className="w-5 h-5 mb-2 text-teal-600" />
                <p className="text-xs text-teal-900 mb-1">Plan End Date</p>
                <p className="text-lg font-bold text-teal-900">
                  {forecast.planEndDate 
                    ? format(forecast.planEndDate, 'dd MMM yyyy')
                    : 'Not set'}
                </p>
                <p className="text-xs text-teal-700">
                  {forecast.daysUntilPlanEnd !== Infinity 
                    ? `${Math.round(forecast.daysUntilPlanEnd)} days remaining`
                    : ''}
                </p>
              </CardContent>
            </Card>
          </div>

          <Alert className="mt-4 bg-blue-50 border-blue-200">
            <AlertDescription className="text-sm text-blue-900">
              <strong>Recommendation:</strong> {forecast.riskLevel === 'low' 
                ? 'Current utilization rate is sustainable. Continue monitoring.'
                : forecast.riskLevel === 'moderate'
                ? 'Review service frequency and plan remaining supports carefully.'
                : 'Immediate action required: Discuss plan review or service adjustment with client and coordinator.'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}