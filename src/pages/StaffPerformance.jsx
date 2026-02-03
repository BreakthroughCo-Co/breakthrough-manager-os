import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Award, AlertTriangle, CheckCircle, Users, GraduationCap, Activity, Sparkles, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function StaffPerformance() {
  const [selectedPractitioner, setSelectedPractitioner] = useState('all');
  const [timeframe, setTimeframe] = useState('30');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportType, setReportType] = useState('General Performance Review');
  const [customDateRange, setCustomDateRange] = useState({ from: '', to: '' });
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    frequency: 'weekly',
    recipients: '',
  });
  const [showAIReportDialog, setShowAIReportDialog] = useState(false);
  const [aiReportResult, setAiReportResult] = useState(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

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

  const handleScheduleReport = async () => {
    try {
      const user = await base44.auth.me();
      const recipients = scheduleForm.recipients.split(',').map(e => e.trim()).filter(e => e);
      
      await base44.entities.ScheduledReport.create({
        report_name: `${reportType} - ${scheduleForm.frequency}`,
        report_type: 'staff_performance',
        frequency: scheduleForm.frequency,
        recipients: JSON.stringify(recipients),
        parameters: JSON.stringify({
          report_type: reportType,
          timeframe_days: parseInt(timeframe),
          practitioner_id: selectedPractitioner !== 'all' ? selectedPractitioner : null,
        }),
        created_by: user.email,
        next_run_date: new Date().toISOString(),
      });
      
      setIsScheduleDialogOpen(false);
      alert('Report scheduled successfully');
    } catch (error) {
      alert('Failed to schedule report: ' + error.message);
    }
  };

  const handleGenerateReport = async (format) => {
    setIsGeneratingReport(true);
    try {
      let days = parseInt(timeframe);
      if (useCustomRange && customDateRange.from && customDateRange.to) {
        const from = new Date(customDateRange.from);
        const to = new Date(customDateRange.to);
        days = Math.floor((to - from) / (1000 * 60 * 60 * 24));
      }
      
      const result = await base44.functions.invoke('generatePerformanceReport', {
        report_type: reportType,
        timeframe_days: days,
        practitioner_id: selectedPractitioner !== 'all' ? selectedPractitioner : null,
        format,
      });

      if (format === 'csv') {
        // Create blob and download
        const blob = new Blob([result.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance_report_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      } else {
        // Display report in dialog or new window
        const reportWindow = window.open('', '_blank');
        if (result.data.format === 'markdown') {
          reportWindow.document.write(`<pre style="font-family: system-ui; padding: 20px;">${result.data.content}</pre>`);
        } else {
          reportWindow.document.write(`<pre>${JSON.stringify(result.data, null, 2)}</pre>`);
        }
      }
    } catch (error) {
      alert('Failed to generate report: ' + error.message);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleGenerateAIReport = async () => {
    setIsGeneratingAI(true);
    try {
      const startDate = useCustomRange && customDateRange.from 
        ? customDateRange.from 
        : new Date(Date.now() - parseInt(timeframe)*24*60*60*1000).toISOString().split('T')[0];
      const endDate = useCustomRange && customDateRange.to 
        ? customDateRange.to 
        : new Date().toISOString().split('T')[0];

      const result = await base44.functions.invoke('generateAIPerformanceReport', {
        practitioner_id: selectedPractitioner !== 'all' ? selectedPractitioner : null,
        start_date: startDate,
        end_date: endDate,
        include_kpis: true,
        include_trends: true,
        include_interventions: true,
      });
      setAiReportResult(result.data);
      setShowAIReportDialog(true);
    } catch (error) {
      alert('Failed to generate AI report: ' + error.message);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const exportAIReport = (format) => {
    if (!aiReportResult) return;

    if (format === 'csv') {
      const csvData = aiReportResult.practitioner_data.map(p => ({
        Name: p.name,
        Role: p.role,
        'Training Completion': p.kpis.training_completion_rate + '%',
        'Overdue Training': p.kpis.overdue_training,
        'Incidents': p.kpis.incidents_reported,
        'Breaches': p.kpis.compliance_breaches,
        'Performance Score': p.kpis.performance_score,
      }));

      const headers = Object.keys(csvData[0]).join(',');
      const rows = csvData.map(row => Object.values(row).join(','));
      const csv = [headers, ...rows].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-performance-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } else if (format === 'txt') {
      const textReport = `
STAFF PERFORMANCE AI ANALYSIS
Period: ${aiReportResult.report_period.start_date} to ${aiReportResult.report_period.end_date}
Generated: ${new Date().toLocaleDateString()}

EXECUTIVE SUMMARY
${aiReportResult.ai_analysis.executive_summary}

KEY TRENDS
${aiReportResult.ai_analysis.key_trends.map((t, i) => `${i+1}. ${t}`).join('\n')}

SKILL GAPS
${aiReportResult.ai_analysis.skill_gaps.map((g, i) => `${i+1}. ${g}`).join('\n')}

INTERVENTION PRIORITIES
${aiReportResult.ai_analysis.intervention_priorities.map((p, i) => `${i+1}. ${p}`).join('\n')}

RECOMMENDATIONS
${aiReportResult.ai_analysis.recommendations.map((r, i) => `${i+1}. ${r}`).join('\n')}
      `;
      
      const blob = new Blob([textReport], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-performance-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
    }
  };

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
          {!useCustomRange ? (
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
          ) : (
            <>
              <Input
                type="date"
                value={customDateRange.from}
                onChange={(e) => setCustomDateRange({...customDateRange, from: e.target.value})}
                className="w-[150px]"
              />
              <Input
                type="date"
                value={customDateRange.to}
                onChange={(e) => setCustomDateRange({...customDateRange, to: e.target.value})}
                className="w-[150px]"
              />
            </>
          )}
          <Button
            variant="outline"
            onClick={() => setUseCustomRange(!useCustomRange)}
            size="sm"
          >
            {useCustomRange ? 'Use Preset' : 'Custom Range'}
          </Button>
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
          <Button
            onClick={() => handleGenerateReport('csv')}
            disabled={isGeneratingReport}
            variant="outline"
          >
            Export CSV
          </Button>
          <Button
            onClick={() => handleGenerateReport('json')}
            disabled={isGeneratingReport}
          >
            Generate Report
          </Button>
          <Button
            onClick={handleGenerateAIReport}
            disabled={isGeneratingAI}
            variant="default"
          >
            {isGeneratingAI ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            AI Analysis
          </Button>
          <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Schedule Report</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule Automated Report</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Frequency</Label>
                  <Select
                    value={scheduleForm.frequency}
                    onValueChange={(v) => setScheduleForm({...scheduleForm, frequency: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Recipients (comma-separated emails)</Label>
                  <Textarea
                    value={scheduleForm.recipients}
                    onChange={(e) => setScheduleForm({...scheduleForm, recipients: e.target.value})}
                    placeholder="manager@example.com, admin@example.com"
                    rows={3}
                  />
                </div>
                <Button onClick={handleScheduleReport} className="w-full">
                  Schedule Report
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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

      <Dialog open={showAIReportDialog} onOpenChange={setShowAIReportDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI Performance Analysis</DialogTitle>
          </DialogHeader>
          {aiReportResult && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Period: {new Date(aiReportResult.report_period.start_date).toLocaleDateString()} - {new Date(aiReportResult.report_period.end_date).toLocaleDateString()}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => exportAIReport('csv')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportAIReport('txt')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Export Report
                  </Button>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Executive Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700">{aiReportResult.ai_analysis.executive_summary}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Key Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {aiReportResult.ai_analysis.key_trends.map((trend, idx) => (
                      <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                        <TrendingUp className="w-4 h-4 mt-0.5 text-blue-600" />
                        {trend}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Skill Gaps</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {aiReportResult.ai_analysis.skill_gaps.map((gap, idx) => (
                        <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 mt-0.5 text-orange-600" />
                          {gap}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Intervention Priorities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {aiReportResult.ai_analysis.intervention_priorities.map((priority, idx) => (
                        <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                          <Award className="w-4 h-4 mt-0.5 text-red-600" />
                          {priority}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {aiReportResult.ai_analysis.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                        <span className="font-semibold text-teal-600">{idx + 1}.</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {aiReportResult.practitioner_data && (
                <Card>
                  <CardHeader>
                    <CardTitle>Individual Performance Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {aiReportResult.practitioner_data.slice(0, 5).map(prac => (
                        <div key={prac.id} className="border-b pb-3 last:border-0">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium">{prac.name}</p>
                              <p className="text-xs text-muted-foreground">{prac.role}</p>
                            </div>
                            <Badge variant={prac.kpis.performance_score >= 80 ? 'default' : 'secondary'}>
                              Score: {prac.kpis.performance_score}/100
                            </Badge>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-xs">
                            <div>
                              <p className="text-muted-foreground">Training</p>
                              <p className="font-medium">{prac.kpis.training_completion_rate}%</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Overdue</p>
                              <p className="font-medium">{prac.kpis.overdue_training}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Breaches</p>
                              <p className="font-medium">{prac.kpis.compliance_breaches}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Notes</p>
                              <p className="font-medium">{prac.kpis.case_notes_completed}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}