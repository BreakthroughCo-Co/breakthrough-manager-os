import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';

export default function DisengagementRiskChart({ analyses }) {
  if (!analyses || analyses.length === 0) {
    return <div className="text-center py-8 text-slate-500">No data available</div>;
  }

  // Summary data for risk distribution
  const riskDistribution = [
    {
      name: 'Critical (70+)',
      count: analyses.filter(a => a.disengagement_risk_score >= 70).length,
      color: '#dc2626'
    },
    {
      name: 'High (50-69)',
      count: analyses.filter(a => a.disengagement_risk_score >= 50 && a.disengagement_risk_score < 70).length,
      color: '#ea580c'
    },
    {
      name: 'Moderate (30-49)',
      count: analyses.filter(a => a.disengagement_risk_score >= 30 && a.disengagement_risk_score < 50).length,
      color: '#eab308'
    },
    {
      name: 'Low (<30)',
      count: analyses.filter(a => a.disengagement_risk_score < 30).length,
      color: '#16a34a'
    }
  ];

  // Scatter plot: Risk Score vs Session Attendance
  const scatterData = analyses.map(a => ({
    risk_score: a.disengagement_risk_score,
    sessions: a.sessions_last_30d,
    response_rate: a.response_rate_percent,
    client_name: a.client_name,
    risk_level: a.risk_level
  }));

  return (
    <div className="space-y-6">
      {/* Risk Distribution Bar Chart */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Risk Level Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={riskDistribution}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Risk vs Sessions Scatter */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Risk Score vs Session Attendance</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="risk_score" name="Risk Score (0-100)" type="number" />
            <YAxis dataKey="sessions" name="Sessions (30 days)" type="number" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter
              name="Clients"
              data={scatterData}
              fill="#8b5cf6"
              fillOpacity={0.6}
            />
          </ScatterChart>
        </ResponsiveContainer>
        <p className="text-xs text-slate-500 mt-2">
          Higher risk scores and lower session counts indicate clients at greater risk of disengagement.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="text-sm text-slate-600">Average Risk Score</div>
          <div className="text-2xl font-bold">
            {(analyses.reduce((sum, a) => sum + a.disengagement_risk_score, 0) / analyses.length).toFixed(1)}
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="text-sm text-slate-600">Average Session Frequency</div>
          <div className="text-2xl font-bold">
            {(analyses.reduce((sum, a) => sum + a.sessions_last_30d, 0) / analyses.length).toFixed(1)}
            <span className="text-sm text-slate-600">/month</span>
          </div>
        </div>
      </div>
    </div>
  );
}