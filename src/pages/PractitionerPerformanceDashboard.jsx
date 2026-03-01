import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, differenceInDays } from 'date-fns';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, AlertTriangle, Users, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PractitionerPerformanceDashboard() {
  const [selectedPractitioner, setSelectedPractitioner] = useState(null);
  const [isGeneratingForecast, setIsGeneratingForecast] = useState(false);

  const { data: practitioners = [] } = useQuery({
    queryKey: ['practitioners'],
    queryFn: () => base44.entities.Practitioner.list()
  });

  const { data: metrics = [], refetch: refetchMetrics } = useQuery({
    queryKey: ['performanceMetrics'],
    queryFn: () => base44.entities.PerformanceMetric.list('-metric_date')
  });

  const { data: billingRecords = [] } = useQuery({
    queryKey: ['billingRecords'],
    queryFn: () => base44.entities.BillingRecord.list('-service_date', 200)
  });

  const { data: credentials = [] } = useQuery({
    queryKey: ['credentials'],
    queryFn: () => base44.entities.PractitionerCredential.list()
  });

  const { data: trainingRecords = [] } = useQuery({
    queryKey: ['trainingRecords'],
    queryFn: () => base44.entities.TrainingRecord.list()
  });

  const handleGenerateForecast = async (practitionerId) => {
    setIsGeneratingForecast(true);
    await base44.functions.invoke('forecastPractitionerPerformance', { practitioner_id: practitionerId });
    setIsGeneratingForecast(false);
    refetchMetrics();
  };

  const filteredMetrics = selectedPractitioner
    ? metrics.filter((m) => m.practitioner_id === selectedPractitioner)
    : metrics.slice(0, 10);

  const chartData = filteredMetrics.map((m) => ({
    date: format(new Date(m.metric_date), 'MMM dd'),
    predicted: m.predicted_billable_hours,
    actual: m.actual_billable_hours,
    efficiency: m.caseload_efficiency_score
  }));

  const complianceData = practitioners.map((p) => {
    const pCredentials = credentials.filter((c) => c.practitioner_id === p.id);
    const pTraining = trainingRecords.filter((t) => t.practitioner_id === p.id);
    const activeTraining = pTraining.filter((t) => t.status === 'current').length;

    return {
      name: p.full_name,
      id: p.id,
      compliance: pTraining.length > 0 ? (activeTraining / pTraining.length) * 100 : 100
    };
  });

  const highRiskPractitioners = filteredMetrics.filter((m) => m.risk_of_burnout || m.burnout_score > 70);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-teal-600" />
            Practitioner Performance Analytics
          </h2>
          <p className="text-slate-500 mt-1">Billable hours forecasts, caseload efficiency, and compliance tracking</p>
        </div>
        <Button
          onClick={() => practitioners.forEach((p) => handleGenerateForecast(p.id))}
          disabled={isGeneratingForecast}
          className="bg-teal-600 hover:bg-teal-700"
        >
          {isGeneratingForecast ? 'Generating...' : 'Generate All Forecasts'}
        </Button>
      </div>

      {/* Filter */}
      <Select value={selectedPractitioner || 'all'} onValueChange={(v) => setSelectedPractitioner(v === 'all' ? null : v)}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="All Practitioners" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Practitioners</SelectItem>
          {practitioners.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* High Risk Alert */}
      {highRiskPractitioners.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 ml-2">
            {highRiskPractitioners.length} practitioner(s) at high risk of burnout. Recommend immediate caseload review.
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Active Practitioners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-teal-600">{practitioners.filter((p) => p.status === 'active').length}</div>
            <p className="text-xs text-slate-500 mt-1">{practitioners.length} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Avg Caseload Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-teal-600">
              {(filteredMetrics.reduce((sum, m) => sum + (m.caseload_efficiency_score || 0), 0) / Math.max(filteredMetrics.length, 1)).toFixed(0)}%
            </div>
            <p className="text-xs text-slate-500 mt-1">Based on recent metrics</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Billable Hours (Avg)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-teal-600">
              {(filteredMetrics.reduce((sum, m) => sum + (m.actual_billable_hours || 0), 0) / Math.max(filteredMetrics.length, 1)).toFixed(1)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Monthly average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Compliance Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-teal-600">
              {(filteredMetrics.reduce((sum, m) => sum + (m.compliance_score || 0), 0) / Math.max(filteredMetrics.length, 1)).toFixed(0)}%
            </div>
            <p className="text-xs text-slate-500 mt-1">Training & credentials</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Billable Hours Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Billable Hours Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="predicted" stroke="#0d9488" strokeWidth={2} />
                <Line type="monotone" dataKey="actual" stroke="#64748b" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Caseload Efficiency */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Caseload Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="efficiency" fill="#0d9488" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Compliance Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Compliance Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={complianceData}
                  dataKey="compliance"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {complianceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#0d9488', '#0f766e', '#134e4a', '#164e63'][index % 4]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Burnout Risk */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Burnout Risk Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredMetrics.slice(0, 5).map((m) => (
              <div key={m.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                <span className="font-medium text-sm">{m.practitioner_name}</span>
                <Badge
                  className={cn(
                    m.risk_of_burnout ? 'bg-red-100 text-red-700' : m.burnout_score > 50 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  )}
                >
                  {m.burnout_score ? `${m.burnout_score}%` : m.risk_of_burnout ? 'High' : 'Low'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Practitioner View */}
      {selectedPractitioner && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {filteredMetrics.slice(0, 1).map((m) => (
                <React.Fragment key={m.id}>
                  <div className="p-3 bg-slate-50 rounded">
                    <p className="text-xs text-slate-600">Predicted Hours</p>
                    <p className="text-lg font-bold text-teal-600">{m.predicted_billable_hours?.toFixed(1) || 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded">
                    <p className="text-xs text-slate-600">Actual Hours</p>
                    <p className="text-lg font-bold text-teal-600">{m.actual_billable_hours?.toFixed(1) || 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded">
                    <p className="text-xs text-slate-600">Caseload Efficiency</p>
                    <p className="text-lg font-bold text-teal-600">{m.caseload_efficiency_score?.toFixed(0) || 'N/A'}%</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded">
                    <p className="text-xs text-slate-600">Compliance</p>
                    <p className="text-lg font-bold text-teal-600">{m.compliance_score?.toFixed(0) || 'N/A'}%</p>
                  </div>
                </React.Fragment>
              ))}
            </div>

            {filteredMetrics.slice(0, 1).map((m) => (
              m.ai_recommendations && (
                <div key={`rec-${m.id}`} className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="text-sm font-medium text-blue-900">AI Recommendations:</p>
                  <p className="text-sm text-blue-800 mt-2">{m.ai_recommendations}</p>
                </div>
              )
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}