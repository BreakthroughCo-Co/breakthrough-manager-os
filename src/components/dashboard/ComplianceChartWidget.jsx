import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeContext';

const STATUS_COLORS = {
  compliant: '#10b981',
  attention_needed: '#f59e0b',
  non_compliant: '#ef4444',
  pending_review: '#94a3b8',
};

export default function ComplianceChartWidget() {
  const { isDark } = useTheme();

  const { data: complianceItems = [] } = useQuery({
    queryKey: ['compliance'],
    queryFn: () => base44.entities.ComplianceItem.list(),
  });

  const statusData = useMemo(() => {
    const counts = {};
    complianceItems.forEach(i => {
      const key = i.status || 'pending_review';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: name.replace(/_/g, ' '),
      value,
      color: STATUS_COLORS[name] || '#94a3b8',
    }));
  }, [complianceItems]);

  const categoryData = useMemo(() => {
    const counts = {};
    complianceItems.forEach(i => {
      const key = i.category || 'Other';
      if (!counts[key]) counts[key] = { compliant: 0, attention_needed: 0, non_compliant: 0, pending_review: 0 };
      counts[key][i.status || 'pending_review'] = (counts[key][i.status || 'pending_review'] || 0) + 1;
    });
    return Object.entries(counts).map(([name, vals]) => ({ name: name.replace(/ /g, '\n'), ...vals }));
  }, [complianceItems]);

  const axisColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#334155' : '#e2e8f0';

  return (
    <div className={cn(
      "rounded-xl border p-5 space-y-5",
      isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
    )}>
      <h3 className="font-semibold text-sm">Compliance Status Overview</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Pie */}
        <div>
          <p className={cn("text-xs mb-3", isDark ? "text-slate-400" : "text-slate-500")}>Status Distribution</p>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value">
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: isDark ? '#1e293b' : '#fff', border: `1px solid ${gridColor}`, borderRadius: 8, fontSize: 12 }} />
                <Legend iconSize={8} iconType="circle" formatter={v => <span style={{ fontSize: 11, color: axisColor }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center">
              <p className={cn("text-sm", isDark ? "text-slate-500" : "text-slate-400")}>No compliance data</p>
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div>
          <p className={cn("text-xs mb-3", isDark ? "text-slate-400" : "text-slate-500")}>By Category</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={categoryData} barSize={8} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: axisColor }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={{ background: isDark ? '#1e293b' : '#fff', border: `1px solid ${gridColor}`, borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="compliant" fill="#10b981" name="Compliant" stackId="a" radius={[0,0,0,0]} />
              <Bar dataKey="attention_needed" fill="#f59e0b" name="Attention" stackId="a" />
              <Bar dataKey="non_compliant" fill="#ef4444" name="Non-Compliant" stackId="a" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}