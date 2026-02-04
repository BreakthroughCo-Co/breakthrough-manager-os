import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Download, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

export default function CustomReportBuilder() {
  const [reportType, setReportType] = useState('client_progress');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedMetrics, setSelectedMetrics] = useState({
    funding_utilization: true,
    goal_progress: true,
    appointment_adherence: true,
    risk_levels: false,
    incident_summary: false
  });
  const [exportFormat, setExportFormat] = useState('csv');
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list()
  });

  const { data: practitioners = [] } = useQuery({
    queryKey: ['practitioners'],
    queryFn: () => base44.entities.Practitioner.list()
  });

  const reportTypes = [
    { value: 'client_progress', label: 'Client Progress Report' },
    { value: 'service_utilization', label: 'Service Utilization Report' },
    { value: 'funding_expenditure', label: 'Funding Expenditure Analysis' },
    { value: 'practitioner_performance', label: 'Practitioner Performance Report' },
    { value: 'compliance_audit', label: 'Compliance Audit Report' }
  ];

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      let reportData;
      
      switch (reportType) {
        case 'client_progress':
          reportData = await generateClientProgressReport();
          break;
        case 'service_utilization':
          reportData = await generateServiceUtilizationReport();
          break;
        case 'funding_expenditure':
          reportData = await generateFundingReport();
          break;
        case 'practitioner_performance':
          reportData = await generatePractitionerReport();
          break;
        case 'compliance_audit':
          reportData = await generateComplianceReport();
          break;
      }

      downloadReport(reportData, exportFormat);
      toast.success('Report generated successfully');
    } catch (error) {
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateClientProgressReport = async () => {
    const goals = await base44.entities.ClientGoal.list();
    const appointments = await base44.entities.Appointment.list();
    
    const reportData = clients.map(client => {
      const clientGoals = goals.filter(g => g.client_id === client.id);
      const clientAppointments = appointments.filter(a => a.client_id === client.id);
      const completedAppointments = clientAppointments.filter(a => a.status === 'completed');
      
      return {
        'Client Name': client.full_name,
        'NDIS Number': client.ndis_number,
        'Service Type': client.service_type,
        'Active Goals': clientGoals.filter(g => g.status === 'in_progress').length,
        'Achieved Goals': clientGoals.filter(g => g.status === 'achieved').length,
        'Average Goal Progress': calculateAverageProgress(clientGoals),
        'Total Appointments': clientAppointments.length,
        'Completed Appointments': completedAppointments.length,
        'Appointment Adherence': `${((completedAppointments.length / clientAppointments.length) * 100 || 0).toFixed(1)}%`,
        'Funding Allocated': client.funding_allocated || 0,
        'Funding Utilized': client.funding_utilised || 0,
        'Funding Remaining': (client.funding_allocated || 0) - (client.funding_utilised || 0),
        'Risk Level': client.risk_level || 'Not assessed'
      };
    });

    return reportData;
  };

  const generateServiceUtilizationReport = async () => {
    const appointments = await base44.entities.Appointment.list();
    const billingRecords = await base44.entities.BillingRecord.list().catch(() => []);
    
    return clients.map(client => {
      const clientAppointments = appointments.filter(a => a.client_id === client.id);
      const clientBilling = billingRecords.filter(b => b.client_id === client.id);
      
      return {
        'Client Name': client.full_name,
        'Service Type': client.service_type,
        'Total Sessions Scheduled': clientAppointments.length,
        'Sessions Completed': clientAppointments.filter(a => a.status === 'completed').length,
        'Sessions Cancelled': clientAppointments.filter(a => a.status === 'cancelled').length,
        'Total Billed Amount': clientBilling.reduce((sum, b) => sum + (b.total_amount || 0), 0),
        'Funding Utilization Rate': `${((client.funding_utilised / client.funding_allocated) * 100 || 0).toFixed(1)}%`
      };
    });
  };

  const generateFundingReport = async () => {
    return clients.map(client => ({
      'Client Name': client.full_name,
      'NDIS Number': client.ndis_number,
      'Plan Start Date': client.plan_start_date || 'N/A',
      'Plan End Date': client.plan_end_date || 'N/A',
      'Funding Allocated': client.funding_allocated || 0,
      'Funding Utilized': client.funding_utilised || 0,
      'Funding Remaining': (client.funding_allocated || 0) - (client.funding_utilised || 0),
      'Utilization Percentage': `${((client.funding_utilised / client.funding_allocated) * 100 || 0).toFixed(1)}%`,
      'Status': client.status
    }));
  };

  const generatePractitionerReport = async () => {
    const appointments = await base44.entities.Appointment.list();
    const goals = await base44.entities.ClientGoal.list();
    
    return practitioners.map(prac => {
      const pracClients = clients.filter(c => c.assigned_practitioner_id === prac.id);
      const pracAppointments = appointments.filter(a => a.practitioner_id === prac.id);
      const completedAppointments = pracAppointments.filter(a => a.status === 'completed');
      
      const clientGoals = goals.filter(g => 
        pracClients.some(c => c.id === g.client_id)
      );
      
      return {
        'Practitioner Name': prac.full_name,
        'Role': prac.role || 'N/A',
        'Active Caseload': pracClients.filter(c => c.status === 'active').length,
        'Total Clients': pracClients.length,
        'Total Appointments': pracAppointments.length,
        'Completed Appointments': completedAppointments.length,
        'Completion Rate': `${((completedAppointments.length / pracAppointments.length) * 100 || 0).toFixed(1)}%`,
        'Client Goals Tracked': clientGoals.length,
        'Goals Achieved': clientGoals.filter(g => g.status === 'achieved').length,
        'Average Goal Progress': calculateAverageProgress(clientGoals)
      };
    });
  };

  const generateComplianceReport = async () => {
    const response = await base44.functions.invoke('analyzeNDISCompliance', {});
    const issues = response.data?.issues || [];
    
    return issues.map(issue => ({
      'Severity': issue.severity,
      'Category': issue.category,
      'Entity Type': issue.entity_type,
      'Entity Name': issue.entity_name,
      'Issue': issue.issue,
      'Required Action': issue.required_action,
      'Compliance Standard': issue.compliance_standard
    }));
  };

  const calculateAverageProgress = (goals) => {
    if (goals.length === 0) return 0;
    const total = goals.reduce((sum, g) => sum + (g.current_progress || 0), 0);
    return (total / goals.length).toFixed(1);
  };

  const downloadReport = (data, format) => {
    if (format === 'csv') {
      downloadCSV(data);
    } else if (format === 'json') {
      downloadJSON(data);
    }
  };

  const downloadCSV = (data) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h]}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const downloadJSON = (data) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Custom Report Builder
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label>Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Export Format</Label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (Excel Compatible)</SelectItem>
                <SelectItem value="json">JSON (Data Format)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={generateReport}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              'Generating Report...'
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Generate & Download Report
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}