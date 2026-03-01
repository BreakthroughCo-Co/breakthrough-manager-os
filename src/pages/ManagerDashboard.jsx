import React, { useState, Suspense, lazy } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, TrendingUp, DollarSign, AlertTriangle, RefreshCw, Activity, Target } from 'lucide-react';

// Recharts deferred — only loaded when this page mounts (Item 4)
const ManagerCharts = lazy(() => import('@/components/dashboard/ManagerCharts.jsx'));

function MetricCard({ title, value, icon: Icon, color = 'teal' }) {
  const colorMap = {
    teal: 'text-teal-600 bg-teal-50 dark:bg-teal-900/20',
    green: 'text-green-600 bg-green-50 dark:bg-green-900/20',
    amber: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
    red: 'text-red-600 bg-red-50 dark:bg-red-900/20',
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${colorMap[color].split(' ')[0]}`}>{value}</p>
        </div>
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ManagerDashboard() {
  const [dateRange, setDateRange] = useState('90');
  const [selectedPractitioner, setSelectedPractitioner] = useState('all');

  const { data: metricsData, isLoading, refetch } = useQuery({
    queryKey: ['manager-dashboard-metrics', dateRange, selectedPractitioner],
    queryFn: async () => {
      const dateFrom = new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const payload = { date_from: dateFrom, date_to: new Date().toISOString().split('T')[0] };
      if (selectedPractitioner !== 'all') payload.practitioner_id = selectedPractitioner;
      const res = await base44.functions.invoke('getPractitionerPerformanceMetrics', payload);
      return res.data;
    },
  });

  const metrics = metricsData?.metrics || [];
  const org = metricsData?.org_summary || {};
  const highBurnoutRisk = metrics.filter(m => m.risk.burnout_risk_level === 'high');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Manager Analytics Dashboard</h2>
          <p className="text-sm text-slate-500 mt-1">Practitioner performance, billing accuracy, and predictive risk analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 animate-spin text-teal-500 mr-2" />
          <span className="text-slate-500">Aggregating performance data...</span>
        </div>
      )}

      {!isLoading && (
        <>
          {/* Org Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard title="Practitioners" value={org.total_practitioners || 0} icon={Users} color="teal" />
            <MetricCard title="Avg Utilisation" value={`${org.avg_utilisation || 0}%`} icon={Activity} color={org.avg_utilisation > 85 ? 'red' : 'blue'} />
            <MetricCard title="Revenue (Period)" value={`$${((org.total_revenue || 0) / 1000).toFixed(1)}k`} icon={DollarSign} color="green" />
            <MetricCard title="Avg Rejection Rate" value={`${org.avg_rejection_rate || 0}%`} icon={TrendingUp} color={org.avg_rejection_rate > 10 ? 'red' : 'teal'} />
            <MetricCard title="High Burnout Risk" value={org.high_burnout_risk || 0} icon={AlertTriangle} color={org.high_burnout_risk > 0 ? 'amber' : 'green'} />
            <MetricCard title="Active Staff" value={org.active_practitioners || 0} icon={Users} color="teal" />
          </div>

          {/* Burnout Risk Alerts */}
          {highBurnoutRisk.length > 0 && (
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Burnout Risk Threshold Alerts ({highBurnoutRisk.length} practitioner{highBurnoutRisk.length > 1 ? 's' : ''})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {highBurnoutRisk.map(m => (
                  <div key={m.practitioner_id} className="bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm border border-amber-200">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{m.full_name}</span>
                    <span className="ml-2 text-amber-600">Risk Score: {m.risk.burnout_risk_score}/100</span>
                    <div className="text-xs text-slate-500">
                      {m.utilisation.utilisation_pct}% utilised · {m.billing.rejection_rate}% rejection · {m.outcomes.high_risk_clients} high-risk clients
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Lazy-loaded Charts (recharts deferred) */}
          <Suspense fallback={
            <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />Loading charts...
            </div>
          }>
            <ManagerCharts metrics={metrics} />
          </Suspense>

          {/* Practitioner Detail Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Practitioner Performance Matrix</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      {['Practitioner', 'Role', 'Utilisation', 'Billed', 'Rejection %', 'Goal Attainment', 'Feedback', 'Sessions', 'Burnout Risk'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map(m => (
                      <tr key={m.practitioner_id} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">{m.full_name}</td>
                        <td className="px-3 py-2 text-xs text-slate-500">{m.role}</td>
                        <td className="px-3 py-2">
                          <span className={`font-semibold ${m.utilisation.utilisation_pct >= 90 ? 'text-red-500' : m.utilisation.utilisation_pct >= 75 ? 'text-amber-500' : 'text-teal-600'}`}>
                            {m.utilisation.utilisation_pct ?? '—'}%
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">${m.billing.total_billed.toFixed(0)}</td>
                        <td className="px-3 py-2">
                          <span className={m.billing.rejection_rate > 10 ? 'text-red-500 font-semibold' : 'text-slate-600'}>
                            {m.billing.rejection_rate}%
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{m.outcomes.avg_goal_attainment != null ? `${m.outcomes.avg_goal_attainment}%` : '—'}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{m.outcomes.avg_feedback_score ?? '—'}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{m.sessions.sessions_in_period}</td>
                        <td className="px-3 py-2">
                          <Badge className={
                            m.risk.burnout_risk_level === 'high' ? 'bg-red-100 text-red-700' :
                            m.risk.burnout_risk_level === 'medium' ? 'bg-amber-100 text-amber-700' :
                            'bg-green-100 text-green-700'
                          }>
                            {m.risk.burnout_risk_level} ({m.risk.burnout_risk_score})
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {metrics.length === 0 && (
                      <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-400">No practitioner data. Run metrics to populate.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}