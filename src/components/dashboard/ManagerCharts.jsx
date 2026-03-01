// Lazily loaded — only imported when ManagerDashboard mounts.
// Keeps recharts out of the initial bundle.
import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Target, AlertTriangle, Activity } from 'lucide-react';

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

export default function ManagerCharts({ metrics }) {
  const billingChart = metrics.map(m => ({
    name: m.full_name.split(' ')[0],
    billed: Math.round(m.billing.total_billed),
    collected: Math.round(m.billing.revenue_collected),
  }));

  const utilisationChart = metrics.map(m => ({
    name: m.full_name.split(' ')[0],
    utilisation: m.utilisation.utilisation_pct ?? 0,
    burnout: m.risk.burnout_risk_score,
  }));

  const outcomeChart = metrics
    .filter(m => m.outcomes.avg_goal_attainment !== null)
    .map(m => ({
      name: m.full_name.split(' ')[0],
      goal_attainment: m.outcomes.avg_goal_attainment,
      feedback: m.outcomes.avg_feedback_score ? Math.round(m.outcomes.avg_feedback_score * 20) : null,
    }));

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Caseload Utilisation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-500" />Caseload Utilisation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {metrics.length === 0 && <p className="text-sm text-slate-400">No data available.</p>}
          {metrics.map(m => <UtilisationBar key={m.practitioner_id} m={m} />)}
        </CardContent>
      </Card>

      {/* Billing vs Collected */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-teal-500" />Billing vs Collected
          </CardTitle>
        </CardHeader>
        <CardContent>
          {billingChart.length === 0
            ? <p className="text-sm text-slate-400">No billing data.</p>
            : <ResponsiveContainer width="100%" height={200}>
              <BarChart data={billingChart} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `$${v}`} />
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
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4 text-teal-500" />Goal Attainment vs Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          {outcomeChart.length === 0
            ? <p className="text-sm text-slate-400">No outcome data.</p>
            : <ResponsiveContainer width="100%" height={200}>
              <BarChart data={outcomeChart} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="goal_attainment" name="Goal Attainment %" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="feedback" name="Feedback (normalised)" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          }
        </CardContent>
      </Card>

      {/* Utilisation vs Burnout */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />Utilisation vs Burnout Risk
          </CardTitle>
        </CardHeader>
        <CardContent>
          {utilisationChart.length === 0
            ? <p className="text-sm text-slate-400">No data.</p>
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
  );
}