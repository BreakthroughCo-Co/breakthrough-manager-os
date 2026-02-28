import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, subMonths, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeContext';

const SEVERITY_COLORS = {
  critical: '#ef4444',
  serious_injury: '#f97316',
  safeguarding_concern: '#f59e0b',
  non_compliance: '#8b5cf6',
  operational_issue: '#3b82f6',
  other: '#94a3b8',
};

export default function IncidentChartWidget() {
  const { isDark } = useTheme();

  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => base44.entities.Incident.list('-incident_date', 200),
  });

  // Monthly trend (last 6 months)
  const monthlyData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const month = subMonths(new Date(), 5 - i);
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      const count = incidents.filter(inc => {
        if (!inc.incident_date) return false;
        const d = parseISO(inc.incident_date);
        return d >= start && d <= end;
      }).length;
      return { month: format(month, 'MMM'), count };
    });
  }, [incidents]);

  // By severity
  const severityData = useMemo(() => {
    const counts = {};
    incidents.forEach(i => {
      const key = i.severity || 'other';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: name.replace(/_/g, ' '),
      value,
      color: SEVERITY_COLORS[name] || '#94a3b8',
    }));
  }, [incidents]);

  const axisColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#334155' : '#e2e8f0';

  return (
    <div className={cn(
      "rounded-xl border p-5 space-y-5",
      isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
    )}>
      <h3 className="font-semibold text-sm">Incident Analytics</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <div>
          <p className={cn("text-xs mb-3", isDark ? "text-slate-400" : "text-slate-500")}>Monthly Trend (6 months)</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={monthlyData} barSize={24}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: isDark ? '#1e293b' : '#fff', border: `1px solid ${gridColor}`, borderRadius: 8, fontSize: 12 }}
                cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}
              />
              <Bar dataKey="count" fill="#0d9488" radius={[4,4,0,0]} name="Incidents" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* By Severity */}
        <div>
          <p className={cn("text-xs mb-3", isDark ? "text-slate-400" : "text-slate-500")}>By Severity</p>
          {severityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={severityData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value">
                  {severityData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: isDark ? '#1e293b' : '#fff', border: `1px solid ${gridColor}`, borderRadius: 8, fontSize: 12 }}
                  formatter={(val, name) => [val, name]}
                />
                <Legend iconSize={8} iconType="circle" formatter={v => <span style={{ fontSize: 11, color: axisColor }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center">
              <p className={cn("text-sm", isDark ? "text-slate-500" : "text-slate-400")}>No incident data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}