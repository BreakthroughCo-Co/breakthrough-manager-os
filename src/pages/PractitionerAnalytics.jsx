import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, FileText, TrendingUp, AlertTriangle, Target, Clock, CheckCircle } from 'lucide-react';

export default function PractitionerAnalytics() {
  const [user, setUser] = useState(null);
  const [selectedPractitioner, setSelectedPractitioner] = useState('all');
  const [timeframe, setTimeframe] = useState('last_30_days');

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: practitioners = [] } = useQuery({
    queryKey: ['practitioners'],
    queryFn: () => base44.entities.Practitioner.list(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: caseNotes = [] } = useQuery({
    queryKey: ['caseNotes'],
    queryFn: () => base44.entities.CaseNote.list(),
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => base44.entities.IncidentReport.list(),
  });

  const { data: billingRecords = [] } = useQuery({
    queryKey: ['billing'],
    queryFn: () => base44.entities.BillingRecord.list(),
  });

  // Calculate KPIs
  const calculateKPIs = (practitionerId) => {
    const practitionerClients = practitionerId === 'all' 
      ? clients 
      : clients.filter(c => c.assigned_practitioner_id === practitionerId);
    
    const practitionerCaseNotes = practitionerId === 'all'
      ? caseNotes
      : caseNotes.filter(cn => cn.practitioner_id === practitionerId);

    const practitionerIncidents = practitionerId === 'all'
      ? incidents
      : incidents.filter(i => practitionerClients.some(c => c.id === i.client_id));

    const practitionerBilling = practitionerId === 'all'
      ? billingRecords
      : billingRecords.filter(b => b.practitioner_id === practitionerId);

    // Timeliness: notes within 48 hours of session
    const timelyNotes = practitionerCaseNotes.filter(note => {
      if (!note.session_date) return false;
      const sessionDate = new Date(note.session_date);
      const createdDate = new Date(note.created_date);
      const hoursDiff = (createdDate - sessionDate) / (1000 * 60 * 60);
      return hoursDiff <= 48;
    });

    return {
      totalClients: practitionerClients.length,
      activeClients: practitionerClients.filter(c => c.status === 'active').length,
      totalCaseNotes: practitionerCaseNotes.length,
      timelyNotes: timelyNotes.length,
      timelinessRate: practitionerCaseNotes.length > 0 
        ? Math.round((timelyNotes.length / practitionerCaseNotes.length) * 100)
        : 0,
      totalIncidents: practitionerIncidents.length,
      incidentRate: practitionerClients.length > 0
        ? (practitionerIncidents.length / practitionerClients.length).toFixed(2)
        : 0,
      billableHours: practitionerBilling.reduce((sum, b) => sum + (b.duration_hours || 0), 0),
      avgProgressRating: practitionerCaseNotes.length > 0
        ? (practitionerCaseNotes.reduce((sum, n) => sum + (n.progress_rating || 0), 0) / practitionerCaseNotes.filter(n => n.progress_rating).length).toFixed(1)
        : 'N/A',
    };
  };

  const kpis = calculateKPIs(selectedPractitioner);

  // Practitioner comparison data
  const practitionerComparison = practitioners.map(p => {
    const pKpis = calculateKPIs(p.id);
    return {
      name: p.full_name?.split(' ')[0] || 'Unknown',
      caseload: pKpis.activeClients,
      capacity: p.caseload_capacity || 0,
      utilisation: p.caseload_capacity > 0 ? Math.round((pKpis.activeClients / p.caseload_capacity) * 100) : 0,
      timeliness: pKpis.timelinessRate,
      incidents: pKpis.totalIncidents,
    };
  });

  // Monthly trend data (mock for demonstration)
  const monthlyTrends = [
    { month: 'Oct', caseNotes: 45, incidents: 3, progress: 7.2 },
    { month: 'Nov', caseNotes: 52, incidents: 2, progress: 7.5 },
    { month: 'Dec', caseNotes: 48, incidents: 4, progress: 7.1 },
    { month: 'Jan', caseNotes: 58, incidents: 2, progress: 7.8 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Practitioner Analytics</h1>
          <p className="text-muted-foreground">Performance metrics and KPI tracking</p>
        </div>
        <div className="flex gap-3">
          <Select value={selectedPractitioner} onValueChange={setSelectedPractitioner}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select practitioner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Practitioners</SelectItem>
              {practitioners.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_7_days">Last 7 Days</SelectItem>
              <SelectItem value="last_30_days">Last 30 Days</SelectItem>
              <SelectItem value="last_90_days">Last 90 Days</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Active Caseload
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis.activeClients}</div>
            <p className="text-xs text-muted-foreground mt-1">of {kpis.totalClients} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Documentation Timeliness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis.timelinessRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">{kpis.timelyNotes} of {kpis.totalCaseNotes} within 48h</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Avg Progress Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis.avgProgressRating}</div>
            <p className="text-xs text-muted-foreground mt-1">out of 10</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Incident Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis.incidentRate}</div>
            <p className="text-xs text-muted-foreground mt-1">per client</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Practitioner Caseload Utilisation</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={practitionerComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="caseload" fill="#14b8a6" name="Active Clients" />
                <Bar dataKey="capacity" fill="#e2e8f0" name="Capacity" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documentation & Progress Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="caseNotes" stroke="#14b8a6" name="Case Notes" />
                <Line type="monotone" dataKey="progress" stroke="#3b82f6" name="Avg Progress" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timeliness Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={practitionerComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="timeliness" fill="#10b981" name="Timeliness %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incident Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={practitionerComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="incidents" fill="#f59e0b" name="Incidents" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Practitioner Performance Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Practitioner</th>
                  <th className="text-left py-3 px-4">Caseload</th>
                  <th className="text-left py-3 px-4">Utilisation</th>
                  <th className="text-left py-3 px-4">Timeliness</th>
                  <th className="text-left py-3 px-4">Incidents</th>
                  <th className="text-left py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {practitionerComparison.map((p, i) => (
                  <tr key={i} className="border-b hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium">{practitioners[i]?.full_name}</td>
                    <td className="py-3 px-4">{p.caseload} / {p.capacity}</td>
                    <td className="py-3 px-4">
                      <Badge variant={p.utilisation > 90 ? 'destructive' : 'default'}>
                        {p.utilisation}%
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={p.timeliness > 80 ? 'default' : 'outline'}>
                        {p.timeliness}%
                      </Badge>
                    </td>
                    <td className="py-3 px-4">{p.incidents}</td>
                    <td className="py-3 px-4">
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}