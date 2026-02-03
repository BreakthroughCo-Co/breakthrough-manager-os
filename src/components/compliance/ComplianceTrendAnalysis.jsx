import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertCircle } from 'lucide-react';

export default function ComplianceTrendAnalysis() {
  const [timeRange, setTimeRange] = useState('30'); // days

  const { data: trendData, isLoading } = useQuery({
    queryKey: ['complianceTrends', timeRange],
    queryFn: async () => {
      try {
        // Get all notifications to analyze alert trends
        const notifications = await base44.entities.Notification.list('-created_date', 1000);
        
        const daysBack = parseInt(timeRange);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysBack);

        // Filter and group by date
        const trendsByDate = {};
        const alertCounts = { critical: 0, high: 0, medium: 0 };

        notifications?.forEach(notif => {
          const notifDate = new Date(notif.created_date);
          if (notifDate >= cutoffDate) {
            const dateKey = notifDate.toISOString().split('T')[0];
            if (!trendsByDate[dateKey]) {
              trendsByDate[dateKey] = { date: dateKey, critical: 0, high: 0, medium: 0, total: 0 };
            }
            
            const severity = notif.severity || 'medium';
            trendsByDate[dateKey][severity]++;
            trendsByDate[dateKey].total++;
            alertCounts[severity]++;
          }
        });

        // Convert to array and sort
        const data = Object.values(trendsByDate).sort((a, b) => new Date(a.date) - new Date(b.date));

        return {
          data,
          summary: {
            total_alerts: notifications?.length || 0,
            alerts_in_period: alertCounts.critical + alertCounts.high + alertCounts.medium,
            critical: alertCounts.critical,
            high: alertCounts.high,
            medium: alertCounts.medium,
            trend: data.length > 1 ? (data[data.length - 1].total || 0) - (data[0].total || 0) : 0
          }
        };
      } catch (e) {
        return { data: [], summary: {} };
      }
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  const { data = [], summary = {} } = trendData || {};

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Compliance Alert Trends
            </CardTitle>
            <CardDescription>Historical analysis of compliance alerts over time</CardDescription>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-1 border rounded text-sm bg-white"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Metrics */}
        <div className="grid grid-cols-5 gap-3">
          <Card className="bg-slate-50">
            <CardContent className="pt-4">
              <div className="text-xs text-slate-600">Total Alerts</div>
              <div className="text-2xl font-bold">{summary.total_alerts || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-4">
              <div className="text-xs text-red-600">Critical</div>
              <div className="text-2xl font-bold text-red-600">{summary.critical || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="pt-4">
              <div className="text-xs text-orange-600">High</div>
              <div className="text-2xl font-bold text-orange-600">{summary.high || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="pt-4">
              <div className="text-xs text-yellow-600">Medium</div>
              <div className="text-2xl font-bold text-yellow-600">{summary.medium || 0}</div>
            </CardContent>
          </Card>
          <Card className={summary.trend >= 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}>
            <CardContent className="pt-4">
              <div className="text-xs text-slate-600">Trend</div>
              <div className={`text-2xl font-bold ${summary.trend >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {summary.trend >= 0 ? '+' : ''}{summary.trend}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stacked Bar Chart - Alert Severity Trend */}
        {data.length > 0 ? (
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900">Alert Distribution Over Time</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  angle={data.length > 14 ? -45 : 0}
                  height={data.length > 14 ? 80 : 30}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="critical" stackId="a" fill="#dc2626" name="Critical" />
                <Bar dataKey="high" stackId="a" fill="#ea580c" name="High" />
                <Bar dataKey="medium" stackId="a" fill="#eab308" name="Medium" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-slate-500">
            No alert data available for selected period
          </div>
        )}

        {/* Insights */}
        <div className="bg-blue-50 border border-blue-200 rounded p-4 space-y-2">
          <h4 className="font-semibold text-blue-900 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Insights
          </h4>
          <ul className="text-sm text-blue-800 space-y-1">
            {summary.critical > 0 && (
              <li>• {summary.critical} critical alert(s) require immediate attention</li>
            )}
            {summary.trend > 0 && (
              <li>• Alert trend is increasing - review and escalate as needed</li>
            )}
            {summary.trend < 0 && (
              <li>• Alert trend is decreasing - compliance improvements detected</li>
            )}
            {summary.alerts_in_period === 0 && (
              <li>• No alerts in this period - maintain current compliance practices</li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}