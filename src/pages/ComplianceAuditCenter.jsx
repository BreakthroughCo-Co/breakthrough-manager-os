import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Calendar, CheckCircle, AlertTriangle, XCircle, FileText, Play, Settings, TrendingUp } from 'lucide-react';

export default function ComplianceAuditCenter() {
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    audit_name: '',
    frequency: 'monthly',
    standards_to_check: [],
    date_range_months: 3,
  });

  const queryClient = useQueryClient();

  const { data: schedules = [] } = useQuery({
    queryKey: ['complianceAuditSchedules'],
    queryFn: () => base44.entities.ComplianceAuditSchedule.list('-next_run_date'),
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['complianceAuditReports'],
    queryFn: () => base44.entities.ComplianceAuditReport.list('-audit_date', 50),
  });

  const createScheduleMutation = useMutation({
    mutationFn: (data) => base44.entities.ComplianceAuditSchedule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complianceAuditSchedules'] });
      setIsScheduleDialogOpen(false);
      setScheduleForm({ audit_name: '', frequency: 'monthly', standards_to_check: [], date_range_months: 3 });
    },
  });

  const handleCreateSchedule = async () => {
    const user = await base44.auth.me();
    const nextRun = new Date();
    if (scheduleForm.frequency === 'monthly') nextRun.setMonth(nextRun.getMonth() + 1);
    if (scheduleForm.frequency === 'quarterly') nextRun.setMonth(nextRun.getMonth() + 3);
    if (scheduleForm.frequency === 'annually') nextRun.setFullYear(nextRun.getFullYear() + 1);

    await createScheduleMutation.mutateAsync({
      ...scheduleForm,
      standards_to_check: JSON.stringify(scheduleForm.standards_to_check),
      next_run_date: nextRun.toISOString().split('T')[0],
      created_by: user.email,
    });
  };

  const complianceStandards = [
    'BSP Quality & Documentation',
    'FBA Completion & Accuracy',
    'Restrictive Practice Authorization',
    'Consent & Authorization Records',
    'Risk Assessment Currency',
    'Staff Training & Competency',
    'NDIS Code of Conduct',
    'Service Agreement Compliance',
    'Incident Reporting',
    'Data Privacy & Security',
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compliance Audit Center</h1>
          <p className="text-muted-foreground">Automated compliance auditing and reporting</p>
        </div>
        <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Audit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Schedule Automated Compliance Audit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Audit Name</Label>
                <Input
                  value={scheduleForm.audit_name}
                  onChange={(e) => setScheduleForm({...scheduleForm, audit_name: e.target.value})}
                  placeholder="e.g., Monthly BSP Review"
                />
              </div>

              <div>
                <Label>Frequency</Label>
                <Select
                  value={scheduleForm.frequency}
                  onValueChange={(val) => setScheduleForm({...scheduleForm, frequency: val})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                    <SelectItem value="one-time">One-Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Data Range (months to review)</Label>
                <Input
                  type="number"
                  value={scheduleForm.date_range_months}
                  onChange={(e) => setScheduleForm({...scheduleForm, date_range_months: parseInt(e.target.value)})}
                />
              </div>

              <div>
                <Label>Standards to Check</Label>
                <div className="grid grid-cols-2 gap-2 mt-2 max-h-60 overflow-y-auto p-2 border rounded">
                  {complianceStandards.map(standard => (
                    <label key={standard} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scheduleForm.standards_to_check.includes(standard)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setScheduleForm({
                              ...scheduleForm,
                              standards_to_check: [...scheduleForm.standards_to_check, standard]
                            });
                          } else {
                            setScheduleForm({
                              ...scheduleForm,
                              standards_to_check: scheduleForm.standards_to_check.filter(s => s !== standard)
                            });
                          }
                        }}
                      />
                      {standard}
                    </label>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleCreateSchedule}
                disabled={!scheduleForm.audit_name || scheduleForm.standards_to_check.length === 0}
                className="w-full"
              >
                Schedule Audit
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="reports" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reports">Audit Reports</TabsTrigger>
          <TabsTrigger value="schedules">Scheduled Audits</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          {selectedReport ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedReport.audit_name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(selectedReport.audit_date).toLocaleString()} • 
                      {selectedReport.date_range_start && selectedReport.date_range_end && 
                        ` Data: ${new Date(selectedReport.date_range_start).toLocaleDateString()} - ${new Date(selectedReport.date_range_end).toLocaleDateString()}`
                      }
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setSelectedReport(null)}>
                    Back to Reports
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-4 gap-4">
                  <Card className="bg-slate-50">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-blue-600">{selectedReport.overall_compliance_score}%</p>
                        <p className="text-xs text-muted-foreground mt-1">Overall Score</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-green-600">{selectedReport.compliant_items || 0}</p>
                        <p className="text-xs text-muted-foreground mt-1">Compliant</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-50">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-red-600">{selectedReport.non_compliant_items || 0}</p>
                        <p className="text-xs text-muted-foreground mt-1">Non-Compliant</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-orange-50">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-orange-600">{selectedReport.high_severity_count || 0}</p>
                        <p className="text-xs text-muted-foreground mt-1">High Severity</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Detailed Findings</h3>
                  <div className="space-y-3">
                    {(JSON.parse(selectedReport.findings || '[]')).map((finding, idx) => (
                      <Card key={idx} className={
                        finding.severity === 'high' ? 'border-l-4 border-l-red-500' :
                        finding.severity === 'medium' ? 'border-l-4 border-l-orange-500' :
                        'border-l-4 border-l-yellow-500'
                      }>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold">{finding.standard}</h4>
                                <Badge variant={finding.severity === 'high' ? 'destructive' : 'secondary'}>
                                  {finding.severity}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{finding.issue}</p>
                            </div>
                          </div>
                          {finding.evidence && (
                            <div className="mt-2 p-2 bg-slate-50 rounded text-xs">
                              <p className="font-medium mb-1">Evidence:</p>
                              <p className="text-muted-foreground">{finding.evidence}</p>
                            </div>
                          )}
                          {finding.remediation && (
                            <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                              <p className="font-medium mb-1 text-blue-900">Suggested Remediation:</p>
                              <p className="text-blue-800">{finding.remediation}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {reports.map(report => (
                <Card key={report.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedReport(report)}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{report.audit_name}</h4>
                          <Badge variant={
                            report.overall_compliance_score >= 90 ? 'default' :
                            report.overall_compliance_score >= 70 ? 'secondary' : 'destructive'
                          }>
                            {report.overall_compliance_score}% compliant
                          </Badge>
                          {report.high_severity_count > 0 && (
                            <Badge variant="destructive">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {report.high_severity_count} high severity
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(report.audit_date).toLocaleDateString()} • 
                          {report.total_items_checked} items checked • 
                          {report.non_compliant_items} issues found
                        </p>
                      </div>
                      <FileText className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
              {reports.length === 0 && (
                <p className="text-center text-muted-foreground py-12">No audit reports yet. Schedule an audit to get started.</p>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="schedules" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {schedules.map(schedule => (
              <Card key={schedule.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{schedule.audit_name}</h4>
                        <Badge variant={schedule.is_active ? 'default' : 'outline'}>
                          {schedule.is_active ? 'Active' : 'Paused'}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p><span className="font-medium">Frequency:</span> {schedule.frequency}</p>
                        <p><span className="font-medium">Next Run:</span> {new Date(schedule.next_run_date).toLocaleDateString()}</p>
                        {schedule.last_run_date && (
                          <p><span className="font-medium">Last Run:</span> {new Date(schedule.last_run_date).toLocaleDateString()}</p>
                        )}
                        <p><span className="font-medium">Standards:</span> {JSON.parse(schedule.standards_to_check || '[]').length} selected</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled>
                        <Play className="w-4 h-4 mr-1" />
                        Run Now
                      </Button>
                      <Button size="sm" variant="outline" disabled>
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {schedules.length === 0 && (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No scheduled audits yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Click "Schedule Audit" to create automated compliance checks</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}