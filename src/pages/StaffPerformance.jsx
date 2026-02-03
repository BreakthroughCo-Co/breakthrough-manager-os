import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Award, AlertTriangle, CheckCircle, Users, GraduationCap, Activity } from 'lucide-react';

export default function StaffPerformance() {
  const [selectedPractitioner, setSelectedPractitioner] = useState('all');
  const [timeframe, setTimeframe] = useState('30');

  const { data: practitioners = [] } = useQuery({
    queryKey: ['practitioners'],
    queryFn: () => base44.entities.Practitioner.list(),
  });

  const { data: agentLogs = [] } = useQuery({
    queryKey: ['agentPerformanceLogs'],
    queryFn: () => base44.entities.AgentPerformanceLog.list('-execution_date', 500),
  });

  const { data: trainingAssignments = [] } = useQuery({
    queryKey: ['trainingAssignments'],
    queryFn: () => base44.entities.TrainingAssignment.list(),
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => base44.entities.Incident.list('-incident_date', 200),
  });

  const { data: breaches = [] } = useQuery({
    queryKey: ['complianceBreaches'],
    queryFn: () => base44.entities.ComplianceBreach.list(),
  });

  const { data: caseNotes = [] } = useQuery({
    queryKey: ['caseNotes'],
    queryFn: () => base44.entities.CaseNote.list('-session_date', 200),
  });

  // Calculate practitioner performance metrics
  const practitionerMetrics = practitioners.map(p => {
    const assignments = trainingAssignments.filter(a => a.practitioner_id === p.id);
    const completed = assignments.filter(a => a.completion_status === 'completed');
    const overdue = assignments.filter(a => 
      a.completion_status !== 'completed' && new Date(a.due_date) < new Date()
    );

    const reportedIncidents = incidents.filter(inc => inc.reported_by === p.email);
    const highSeverityIncidents = reportedIncidents.filter(inc => 
      inc.severity === 'high' || inc.severity === 'critical'
    );

    const relatedBreaches = breaches.filter(b => 
      b.description?.includes(p.email) || b.description?.includes(p.full_name)
    );

    const practitionerNotes = caseNotes.filter(n => n.practitioner_id === p.id);
    const recentNotes = practitionerNotes.filter(n => {
      const noteDate = new Date(n.session_date);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - parseInt(timeframe));
      return noteDate > cutoff;
    });

    return {
      ...p,
      training_completion_rate: assignments.length > 0 ? Math.round((completed.length / assignments.length) * 100) : 100,
      overdue_training: overdue.length,
      incidents_reported: reportedIncidents.length,
      high_severity_incidents: highSeverityIncidents.length,
      compliance_breaches: relatedBreaches.length,
      case_notes_count: recentNotes.length,
      performance_score: calculatePerformanceScore({
        training: assignments.length > 0 ? (completed.length / assignments.length) * 100 : 100,
        incidents: highSeverityIncidents.length,
        breaches: relatedBreaches.length,
        activity: recentNotes.length,
      })
    };
  });

  function calculatePerformanceScore(data) {
    let score = 100;
    score -= (100 - data.training) * 0.3; // Training weight 30%
    score -= data.incidents * 5; // Each high severity incident -5 points
    score -= data.breaches * 10; // Each breach -10 points
    if (data.activity < 10) score -= 10; // Low activity penalty
    return Math.max(0, Math.round(score));
  }

  const filteredMetrics = selectedPractitioner === 'all' 
    ? practitionerMetrics 
    : practitionerMetrics.filter(p => p.id === selectedPractitioner);

  // Overall stats
  const avgTrainingCompletion = Math.round(
    practitionerMetrics.reduce((sum, p) => sum + p.training_completion_rate, 0) / practitioners.length
  );
  const totalOverdueTraining = practitionerMetrics.reduce((sum, p) => sum + p.overdue_training, 0);
  const totalBreaches = practitionerMetrics.reduce((sum, p) => sum + p.compliance_breaches, 0);
  const highPerformers = practitionerMetrics.filter(p => p.performance_score >= 85).length;

  // Training trend data
  const trainingTrendData = practitioners.map(p => ({
    name: p.full_name.split(' ')[0],
    completion: practitionerMetrics.find(m => m.id === p.id)?.training_completion_rate || 0,
  }));

  // Role distribution
  const roleDistribution = {};
  practitioners.forEach(p => {
    roleDistribution[p.role] = (roleDistribution[p.role] || 0) + 1;
  });
  const roleData = Object.entries(roleDistribution).map(([role, count]) => ({
    name: role,
    value: count,
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Staff Performance Analytics</h1>
          <p className="text-muted-foreground">Comprehensive performance tracking and insights</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedPractitioner} onValueChange={setSelectedPractitioner}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Practitioners" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Practitioners</SelectItem>
              {practitioners.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Award className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{highPerformers}</p>
                <p className="text-xs text-muted-foreground">High Performers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgTrainingCompletion}%</p>
                <p className="text-xs text-muted-foreground">Avg Training Complete</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{totalOverdueTraining}</p>
                <p className="text-xs text-muted-foreground">Overdue Training</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <Activity className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{totalBreaches}</p>
                <p className="text-xs text-muted-foreground">Compliance Issues</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="training">Training Analysis</TabsTrigger>
          <TabsTrigger value="details">Individual Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Training Completion by Practitioner</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={trainingTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="completion" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Staff by Role</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={roleData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => entry.name}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {roleData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="training" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Training Completion Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {practitionerMetrics.map(p => (
                  <div key={p.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">{p.full_name}</h4>
                        <p className="text-sm text-muted-foreground">{p.role}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{p.training_completion_rate}%</p>
                        {p.overdue_training > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {p.overdue_training} overdue
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Progress value={p.training_completion_rate} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <div className="space-y-4">
            {filteredMetrics.map(p => (
              <Card key={p.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{p.full_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{p.role}</p>
                    </div>
                    <Badge variant={
                      p.performance_score >= 85 ? 'default' :
                      p.performance_score >= 70 ? 'secondary' : 'destructive'
                    }>
                      Score: {p.performance_score}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Training</p>
                      <p className="text-2xl font-bold text-blue-600">{p.training_completion_rate}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Case Notes</p>
                      <p className="text-2xl font-bold">{p.case_notes_count}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Incidents</p>
                      <p className="text-2xl font-bold text-orange-600">{p.incidents_reported}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Breaches</p>
                      <p className="text-2xl font-bold text-red-600">{p.compliance_breaches}</p>
                    </div>
                  </div>
                  {(p.overdue_training > 0 || p.compliance_breaches > 0) && (
                    <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-sm font-medium text-red-900">Requires Attention:</p>
                      <ul className="list-disc list-inside text-xs text-red-800 mt-1">
                        {p.overdue_training > 0 && <li>{p.overdue_training} overdue training modules</li>}
                        {p.compliance_breaches > 0 && <li>{p.compliance_breaches} compliance breaches</li>}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}