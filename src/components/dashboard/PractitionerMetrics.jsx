import React from 'react';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users, Target, TrendingUp } from 'lucide-react';

export default function PractitionerMetrics({ practitioners = [], className }) {
  const activeCount = practitioners.filter(p => p.status === 'active').length;
  
  // Calculate average utilization
  const avgUtilization = practitioners.length > 0
    ? practitioners.reduce((sum, p) => {
        const target = p.billable_hours_target || 1;
        const actual = p.billable_hours_actual || 0;
        return sum + (actual / target) * 100;
      }, 0) / practitioners.length
    : 0;

  // Caseload data for chart
  const caseloadData = practitioners
    .filter(p => p.status === 'active')
    .map(p => ({
      name: p.full_name?.split(' ')[0] || 'Unknown',
      current: p.current_caseload || 0,
      capacity: p.caseload_capacity || 0,
      utilization: p.caseload_capacity > 0 
        ? ((p.current_caseload || 0) / p.caseload_capacity) * 100 
        : 0
    }))
    .slice(0, 6);

  const getBarColor = (utilization) => {
    if (utilization >= 90) return '#ef4444';
    if (utilization >= 70) return '#f59e0b';
    return '#14b8a6';
  };

  return (
    <div className={cn("bg-white rounded-2xl border border-slate-200 p-6", className)}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Practitioner Metrics</h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="font-medium text-slate-900">{activeCount}</span>
            <span className="text-slate-500">Active</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-teal-500" />
            <span className="font-medium text-slate-900">{avgUtilization.toFixed(0)}%</span>
            <span className="text-slate-500">Avg Target</span>
          </div>
        </div>
      </div>

      {caseloadData.length > 0 ? (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={caseloadData} layout="vertical" barSize={20}>
              <XAxis type="number" domain={[0, 'dataMax']} hide />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={60}
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={({ payload, label }) => {
                  if (payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-3">
                        <p className="font-medium text-slate-900">{data.name}</p>
                        <p className="text-sm text-slate-600">
                          {data.current} / {data.capacity} clients
                        </p>
                        <p className="text-sm text-teal-600">{data.utilization.toFixed(0)}% capacity</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="current" radius={[0, 4, 4, 0]}>
                {caseloadData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.utilization)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-48 flex items-center justify-center text-slate-400">
          <p className="text-sm">No practitioner data available</p>
        </div>
      )}

      <div className="mt-4 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-teal-500" />
          <span className="text-slate-500">&lt;70% capacity</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-slate-500">70-90%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-slate-500">&gt;90% (at capacity)</span>
        </div>
      </div>
    </div>
  );
}