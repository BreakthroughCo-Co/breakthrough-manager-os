import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  TrendingUp, 
  Activity, 
  CheckCircle2,
  XCircle,
  Clock,
  Zap
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ObservabilityDashboard() {
  const [timeRange, setTimeRange] = useState('24h');

  const { data: errors = [] } = useQuery({
    queryKey: ['errorLogs'],
    queryFn: () => base44.entities.ErrorLog.list('-created_date', 100),
  });

  const { data: perfMetrics = [] } = useQuery({
    queryKey: ['performanceMetrics'],
    queryFn: () => base44.entities.PerformanceMetric.list('-created_date', 100),
  });

  const { data: systemEvents = [] } = useQuery({
    queryKey: ['systemEvents'],
    queryFn: () => base44.entities.SystemEvent.list('-created_date', 50),
  });

  const unresolvedErrors = errors.filter(e => !e.resolved);
  const criticalErrors = errors.filter(e => e.severity === 'critical');
  const slowMetrics = perfMetrics.filter(m => m.threshold_exceeded);

  const errorsBySeverity = {
    critical: errors.filter(e => e.severity === 'critical').length,
    high: errors.filter(e => e.severity === 'high').length,
    medium: errors.filter(e => e.severity === 'medium').length,
    low: errors.filter(e => e.severity === 'low').length,
  };

  const avgLoadTime = perfMetrics
    .filter(m => m.metric_type === 'page_load')
    .reduce((sum, m) => sum + m.duration_ms, 0) / 
    (perfMetrics.filter(m => m.metric_type === 'page_load').length || 1);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">System Observability</h1>
          <p className="text-muted-foreground">Error tracking, performance monitoring, and system health</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Errors</CardTitle>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unresolvedErrors.length}</div>
            <p className="text-xs text-muted-foreground">
              {criticalErrors.length} critical
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Load Time</CardTitle>
            <Clock className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(avgLoadTime)}ms</div>
            <p className="text-xs text-muted-foreground">
              {slowMetrics.length} slow pages
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">System Events</CardTitle>
            <Activity className="w-4 h-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemEvents.length}</div>
            <p className="text-xs text-muted-foreground">
              {systemEvents.filter(e => e.status === 'completed').length} processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Zap className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {criticalErrors.length === 0 ? 'Healthy' : 'Issues'}
            </div>
            <p className="text-xs text-muted-foreground">
              {criticalErrors.length === 0 ? 'All systems operational' : 'Attention needed'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="errors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="errors">Error Logs</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="events">System Events</TabsTrigger>
        </TabsList>

        <TabsContent value="errors" className="space-y-4">
          {criticalErrors.length > 0 && (
            <Alert className="bg-red-50 border-red-200">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>{criticalErrors.length} critical errors</strong> require immediate attention
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Error Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={[errorsBySeverity]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="critical" fill="#dc2626" />
                  <Bar dataKey="high" fill="#ea580c" />
                  <Bar dataKey="medium" fill="#f59e0b" />
                  <Bar dataKey="low" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {errors.slice(0, 10).map((error) => (
                  <div key={error.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="mt-1">
                      {error.severity === 'critical' ? (
                        <XCircle className="w-5 h-5 text-red-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={error.severity === 'critical' ? 'destructive' : 'outline'}>
                          {error.severity}
                        </Badge>
                        <Badge variant="outline">{error.error_type}</Badge>
                        {error.resolved && (
                          <Badge className="bg-green-100 text-green-800">Resolved</Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium">{error.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {error.page} • {error.component || 'Unknown component'}
                        {error.user_email && ` • ${error.user_email}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Page Load Times</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={perfMetrics.filter(m => m.metric_type === 'page_load').slice(0, 20).reverse()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="page" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="duration_ms" stroke="#3b82f6" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Slow Performance Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {slowMetrics.slice(0, 10).map((metric) => (
                  <div key={metric.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Badge variant="outline" className="mb-1">{metric.metric_type}</Badge>
                      <p className="text-sm font-medium">{metric.page || metric.component}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-orange-600">{metric.duration_ms}ms</p>
                      <p className="text-xs text-muted-foreground">Threshold exceeded</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {systemEvents.map((event) => (
                  <div key={event.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="mt-1">
                      {event.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : event.status === 'failed' ? (
                        <XCircle className="w-5 h-5 text-red-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{event.event_type}</Badge>
                        <Badge variant="outline">{event.entity_type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Triggered by {event.triggered_by}
                      </p>
                    </div>
                    <Badge variant={
                      event.status === 'completed' ? 'default' : 
                      event.status === 'failed' ? 'destructive' : 'outline'
                    }>
                      {event.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}