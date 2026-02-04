import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Mail, Trash2, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function ScheduledReportManager() {
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    report_name: '',
    report_type: 'client_progress',
    frequency: 'weekly',
    schedule_day: 1,
    schedule_time: '09:00',
    recipient_emails: '',
    format: 'csv',
    is_active: true
  });

  const queryClient = useQueryClient();

  const { data: scheduledReports = [] } = useQuery({
    queryKey: ['scheduledReports'],
    queryFn: () => base44.entities.ScheduledReport.list()
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const emails = data.recipient_emails.split(',').map(e => e.trim()).filter(e => e);
      return base44.entities.ScheduledReport.create({
        ...data,
        recipient_emails: emails
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledReports'] });
      setIsCreating(false);
      toast.success('Scheduled report created');
      setFormData({
        report_name: '',
        report_type: 'client_progress',
        frequency: 'weekly',
        schedule_day: 1,
        schedule_time: '09:00',
        recipient_emails: '',
        format: 'csv',
        is_active: true
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ScheduledReport.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledReports'] });
      toast.success('Scheduled report deleted');
    }
  });

  const reportTypes = [
    { value: 'client_progress', label: 'Client Progress Report' },
    { value: 'service_utilization', label: 'Service Utilization' },
    { value: 'funding_expenditure', label: 'Funding Expenditure' },
    { value: 'practitioner_performance', label: 'Practitioner Performance' },
    { value: 'compliance_status', label: 'Compliance Status' },
    { value: 'risk_summary', label: 'Risk Summary' }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Scheduled Reports</CardTitle>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Schedule New Report</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Report Name</Label>
                  <Input
                    value={formData.report_name}
                    onChange={(e) => setFormData({ ...formData, report_name: e.target.value })}
                    placeholder="e.g., Weekly Client Progress Summary"
                  />
                </div>

                <div>
                  <Label>Report Type</Label>
                  <Select
                    value={formData.report_type}
                    onValueChange={(value) => setFormData({ ...formData, report_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {reportTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Frequency</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.frequency === 'weekly' && (
                  <div>
                    <Label>Day of Week</Label>
                    <Select
                      value={formData.schedule_day.toString()}
                      onValueChange={(value) => setFormData({ ...formData, schedule_day: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Monday</SelectItem>
                        <SelectItem value="2">Tuesday</SelectItem>
                        <SelectItem value="3">Wednesday</SelectItem>
                        <SelectItem value="4">Thursday</SelectItem>
                        <SelectItem value="5">Friday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label>Time (24hr)</Label>
                  <Input
                    type="time"
                    value={formData.schedule_time}
                    onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Recipient Emails (comma separated)</Label>
                  <Input
                    value={formData.recipient_emails}
                    onChange={(e) => setFormData({ ...formData, recipient_emails: e.target.value })}
                    placeholder="manager@example.com, admin@example.com"
                  />
                </div>

                <Button
                  onClick={() => createMutation.mutate(formData)}
                  disabled={!formData.report_name || !formData.recipient_emails}
                  className="w-full"
                >
                  Create Schedule
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {scheduledReports.map((report) => (
            <div key={report.id} className="flex items-center justify-between p-3 border rounded">
              <div className="flex-1">
                <p className="font-medium">{report.report_name}</p>
                <div className="flex items-center gap-3 mt-1 text-sm text-slate-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {report.frequency}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {report.schedule_time}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {report.recipient_emails?.length || 0} recipients
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={report.is_active ? 'default' : 'outline'}>
                  {report.is_active ? 'Active' : 'Paused'}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(report.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </div>
          ))}
          {scheduledReports.length === 0 && (
            <p className="text-center text-sm text-slate-500 py-8">
              No scheduled reports yet. Create one to automate report delivery.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}