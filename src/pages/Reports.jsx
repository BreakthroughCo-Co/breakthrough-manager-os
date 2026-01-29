import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import {
  FileText,
  Download,
  Filter,
  BarChart3,
  Users,
  DollarSign,
  CheckSquare,
  Shield,
  Loader2,
  FileSpreadsheet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const reportTypes = [
  { id: 'client_summary', name: 'Client Summary', icon: Users, entity: 'Client', description: 'Overview of all clients with status and funding' },
  { id: 'practitioner_performance', name: 'Practitioner Performance', icon: BarChart3, entity: 'Practitioner', description: 'Caseload and billable hours analysis' },
  { id: 'billing_summary', name: 'Billing Summary', icon: DollarSign, entity: 'BillingRecord', description: 'Revenue and billing status breakdown' },
  { id: 'compliance_status', name: 'Compliance Status', icon: Shield, entity: 'ComplianceItem', description: 'Compliance items by status and category' },
  { id: 'task_overview', name: 'Task Overview', icon: CheckSquare, entity: 'Task', description: 'Tasks by status, category and priority' },
];

const datePresets = [
  { label: 'Last 7 Days', getValue: () => ({ from: format(subDays(new Date(), 7), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') }) },
  { label: 'Last 30 Days', getValue: () => ({ from: format(subDays(new Date(), 30), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') }) },
  { label: 'This Month', getValue: () => ({ from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: format(endOfMonth(new Date()), 'yyyy-MM-dd') }) },
  { label: 'All Time', getValue: () => ({ from: '', to: '' }) },
];

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState(null);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [filters, setFilters] = useState({});
  const [reportData, setReportData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    enabled: selectedReport?.entity === 'Client',
  });

  const { data: practitioners = [] } = useQuery({
    queryKey: ['practitioners'],
    queryFn: () => base44.entities.Practitioner.list(),
    enabled: selectedReport?.entity === 'Practitioner',
  });

  const { data: billingRecords = [] } = useQuery({
    queryKey: ['billing'],
    queryFn: () => base44.entities.BillingRecord.list(),
    enabled: selectedReport?.entity === 'BillingRecord',
  });

  const { data: complianceItems = [] } = useQuery({
    queryKey: ['compliance'],
    queryFn: () => base44.entities.ComplianceItem.list(),
    enabled: selectedReport?.entity === 'ComplianceItem',
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
    enabled: selectedReport?.entity === 'Task',
  });

  const generateReport = () => {
    setIsGenerating(true);
    
    let data = [];
    switch (selectedReport?.entity) {
      case 'Client':
        data = clients.map(c => ({
          Name: c.full_name,
          'NDIS Number': c.ndis_number,
          Status: c.status,
          'Service Type': c.service_type,
          'Funding Allocated': `$${(c.funding_allocated || 0).toLocaleString()}`,
          'Funding Used': `$${(c.funding_utilised || 0).toLocaleString()}`,
          'Utilization %': c.funding_allocated ? `${Math.round((c.funding_utilised / c.funding_allocated) * 100)}%` : 'N/A',
          'Plan End': c.plan_end_date ? format(new Date(c.plan_end_date), 'MMM d, yyyy') : 'N/A',
        }));
        break;
      case 'Practitioner':
        data = practitioners.map(p => ({
          Name: p.full_name,
          Role: p.role,
          Status: p.status,
          'Current Caseload': p.current_caseload || 0,
          Capacity: p.caseload_capacity || 0,
          'Caseload %': p.caseload_capacity ? `${Math.round((p.current_caseload / p.caseload_capacity) * 100)}%` : 'N/A',
          'Billable Target': p.billable_hours_target || 0,
          'Billable Actual': p.billable_hours_actual || 0,
          'Hours %': p.billable_hours_target ? `${Math.round((p.billable_hours_actual / p.billable_hours_target) * 100)}%` : 'N/A',
        }));
        break;
      case 'BillingRecord':
        data = billingRecords
          .filter(r => {
            if (!dateRange.from && !dateRange.to) return true;
            const date = new Date(r.service_date);
            if (dateRange.from && date < new Date(dateRange.from)) return false;
            if (dateRange.to && date > new Date(dateRange.to)) return false;
            return true;
          })
          .map(r => ({
            Date: format(new Date(r.service_date), 'MMM d, yyyy'),
            Client: r.client_name,
            Practitioner: r.practitioner_name,
            Service: r.service_type,
            Hours: r.duration_hours,
            Amount: `$${(r.total_amount || 0).toFixed(2)}`,
            Status: r.status,
          }));
        break;
      case 'ComplianceItem':
        data = complianceItems.map(c => ({
          Title: c.title,
          Category: c.category,
          Status: c.status,
          Priority: c.priority,
          'Due Date': c.due_date ? format(new Date(c.due_date), 'MMM d, yyyy') : 'N/A',
          Responsible: c.responsible_person || 'N/A',
        }));
        break;
      case 'Task':
        data = tasks.map(t => ({
          Title: t.title,
          Category: t.category,
          Priority: t.priority,
          Status: t.status,
          'Due Date': t.due_date ? format(new Date(t.due_date), 'MMM d, yyyy') : 'N/A',
          'Assigned To': t.assigned_to || 'N/A',
        }));
        break;
    }

    setReportData(data);
    setIsGenerating(false);
  };

  const exportToCSV = () => {
    if (!reportData || reportData.length === 0) return;
    
    const headers = Object.keys(reportData[0]);
    const csvContent = [
      headers.join(','),
      ...reportData.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${selectedReport?.id}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Reports</h2>
        <p className="text-slate-500 mt-1">Generate and export custom reports</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Report Selection */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="font-semibold text-slate-900">Report Type</h3>
          <div className="space-y-2">
            {reportTypes.map((report) => (
              <button
                key={report.id}
                onClick={() => {
                  setSelectedReport(report);
                  setReportData(null);
                }}
                className={cn(
                  "w-full p-4 rounded-xl border text-left transition-all hover:shadow-md",
                  selectedReport?.id === report.id
                    ? "border-teal-300 bg-teal-50"
                    : "border-slate-200 bg-white hover:border-teal-200"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    selectedReport?.id === report.id ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"
                  )}>
                    <report.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{report.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{report.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Report Configuration & Results */}
        <div className="lg:col-span-3 space-y-4">
          {selectedReport ? (
            <>
              {/* Filters */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Report Filters
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selectedReport.entity === 'BillingRecord' && (
                      <>
                        <div>
                          <Label className="text-xs">Date Range</Label>
                          <Select onValueChange={(v) => {
                            const preset = datePresets.find(p => p.label === v);
                            if (preset) setDateRange(preset.getValue());
                          }}>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select range" />
                            </SelectTrigger>
                            <SelectContent>
                              {datePresets.map(p => (
                                <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">From</Label>
                          <Input
                            type="date"
                            className="mt-1"
                            value={dateRange.from}
                            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">To</Label>
                          <Input
                            type="date"
                            className="mt-1"
                            value={dateRange.to}
                            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button onClick={generateReport} className="bg-teal-600 hover:bg-teal-700">
                      {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BarChart3 className="w-4 h-4 mr-2" />}
                      Generate Report
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Results */}
              {reportData && (
                <Card>
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{selectedReport.name}</CardTitle>
                      <CardDescription>{reportData.length} records</CardDescription>
                    </div>
                    <Button variant="outline" onClick={exportToCSV}>
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {reportData.length > 0 && Object.keys(reportData[0]).map(key => (
                              <TableHead key={key}>{key}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.slice(0, 50).map((row, idx) => (
                            <TableRow key={idx}>
                              {Object.values(row).map((val, vidx) => (
                                <TableCell key={vidx} className="text-sm">{val}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {reportData.length > 50 && (
                        <p className="text-sm text-slate-500 text-center mt-4">
                          Showing 50 of {reportData.length} records. Export to CSV to see all.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 h-96 flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Select a report type to get started</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}