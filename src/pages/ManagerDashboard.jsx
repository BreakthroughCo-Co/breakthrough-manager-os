import React, { useState, Suspense, lazy } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, TrendingUp, DollarSign, AlertTriangle, RefreshCw, Activity, Target } from 'lucide-react';

// Lazy-load recharts to prevent it inflating the initial bundle
const {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line,
} = await (async () => {
  const rc = await import('recharts');
  return rc;
})();

// SSR-safe lazy chart wrapper
const LazyCharts = lazy(() => import('@/components/dashboard/ManagerCharts'));

const RISK_COLORS = { low: '#10b981', medium: '#f59e0b', high: '#ef4444' };
const CHART_COLORS = ['#14b8a6', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

function MetricCard({ title, value, subtitle, icon: Icon, color = 'teal', badge }) {
  const colorMap = {
    teal: 'text-teal-600 bg-teal-50 dark:bg-teal-900/20',
    green: 'text-green-600 bg-green-50 dark:bg-green-900/20',
    amber: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
    red: 'text-red-600 bg-red-50 dark:bg-red-900/20',
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${colorMap[color].split(' ')[0]}`}>{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          {badge && <Badge className="mt-1 text-xs">{badge}</Badge>}
        </div>
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function UtilisationBar({ m }) {
  const pct = m.utilisation.utilisation_pct ?? 0;
  const color = pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-teal-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium text-slate-700 dark:text-slate-300">{m.full_name}</span>
        <span className="text-slate-500">{m.utilisation.current_caseload}/{m.utilisation.caseload_capacity} ({pct}%)</span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

export default function ManagerDashboard() {
  const [dateRange, setDateRange] = useState('90');
  const [selectedPractitioner, setSelectedPractitioner] = useState('all');

  const { data: metricsData, isLoading, refetch } = useQuery({
    queryKey: ['manager-dashboard-metrics', dateRange, selectedPractitioner],
    queryFn: async () => {
      const dateFrom = new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const payload = {
        date_from: dateFrom,
        date_to: new Date().toISOString().split('T')[0]
      };
      if (selectedPractitioner !== 'all') payload.practitioner_id = selectedPractitioner;
      const res = await base44.functions.invoke('getPractitionerPerformanceMetrics', payload);
      return res.data;
    }
  });

  const metrics = metricsData?.metrics || [];
  const org = metricsData?.org_summary || {};

  // Chart data
  const billingChart = metrics.map(m => ({
    name: m.full_name.split(' ')[0],
    billed: Math.round(m.billing.total_billed),
    collected: Math.round(m.billing.revenue_collected),
    rejection_pct: m.billing.rejection_rate
  }));

  const utilisationChart = metrics.map(m => ({
    name: m.full_name.split(' ')[0],
    utilisation: m.utilisation.utilisation_pct ?? 0,
    burnout: m.risk.burnout_risk_score
  }));

  const outcomeChart = metrics
    .filter(m => m.outcomes.avg_goal_attainment !== null)
    .map(m => ({
      name: m.full_name.split(' ')[0],
      goal_attainment: m.outcomes.avg_goal_attainment,
      feedback: m.outcomes.avg_feedback_score ? Math.round(m.outcomes.avg_feedback_score * 20) : null
    }));

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

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Caseload Utilisation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-teal-500" />Caseload Utilisation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {metrics.length === 0 && <p className="text-sm text-slate-400">No data available.</p>}
                {metrics.map(m => <UtilisationBar key={m.practitioner_id} m={m} />)}
              </CardContent>
            </Card>

            {/* Billing Accuracy Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2"><DollarSign className="w-4 h-4 text-teal-500" />Billing vs Collected & Rejection Rate</CardTitle>
              </CardHeader>
              <CardContent>
                {billingChart.length === 0
                  ? <p className="text-sm text-slate-400">No billing data.</p>
                  : <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={billingChart} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v, n) => [n === 'rejection_pct' ? `${v}%` : `$${v}`, n]} />
                      <Bar dataKey="billed" name="Billed" fill="#14b8a6" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="collected" name="Collected" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                }
              </CardContent>
            </Card>

            {/* Goal Attainment & Feedback */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2"><Target className="w-4 h-4 text-teal-500" />Goal Attainment vs Feedback Score</CardTitle>
              </CardHeader>
              <CardContent>
                {outcomeChart.length === 0
                  ? <p className="text-sm text-slate-400">No outcome data available.</p>
                  : <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={outcomeChart} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="goal_attainment" name="Goal Attainment %" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="feedback" name="Feedback Score (normalised)" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                }
              </CardContent>
            </Card>

            {/* Utilisation vs Burnout */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" />Utilisation vs Burnout Risk Score</CardTitle>
              </CardHeader>
              <CardContent>
                {utilisationChart.length === 0
                  ? <p className="text-sm text-slate-400">No data available.</p>
                  : <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={utilisationChart} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="utilisation" stroke="#14b8a6" strokeWidth={2} name="Utilisation %" dot />
                      <Line type="monotone" dataKey="burnout" stroke="#ef4444" strokeWidth={2} name="Burnout Score" dot />
                    </LineChart>
                  </ResponsiveContainer>
                }
              </CardContent>
            </Card>
          </div>

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