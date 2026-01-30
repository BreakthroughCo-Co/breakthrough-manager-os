import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfMonth, endOfMonth, parseISO } from 'date-fns';
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
  FileSpreadsheet,
  Boxes,
  Settings,
  FileDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const entityConfig = {
  Client: {
    name: 'Clients',
    icon: Users,
    fields: [
      { key: 'full_name', label: 'Name', default: true },
      { key: 'ndis_number', label: 'NDIS Number', default: true },
      { key: 'status', label: 'Status', default: true, filterable: true },
      { key: 'service_type', label: 'Service Type', default: true, filterable: true },
      { key: 'risk_level', label: 'Risk Level', filterable: true },
      { key: 'assigned_practitioner_id', label: 'Practitioner' },
      { key: 'funding_allocated', label: 'Funding Allocated', format: 'currency' },
      { key: 'funding_utilised', label: 'Funding Used', format: 'currency' },
      { key: 'plan_start_date', label: 'Plan Start', format: 'date' },
      { key: 'plan_end_date', label: 'Plan End', format: 'date', default: true },
      { key: 'primary_contact_name', label: 'Contact Name' },
      { key: 'primary_contact_email', label: 'Contact Email' },
      { key: 'created_date', label: 'Created Date', format: 'date' },
    ],
    filterOptions: {
      status: ['active', 'waitlist', 'on_hold', 'discharged', 'plan_review'],
      service_type: ['Behaviour Support', 'LEGO Therapy', 'Capacity Building', 'Combined'],
      risk_level: ['low', 'medium', 'high'],
    },
  },
  Practitioner: {
    name: 'Practitioners',
    icon: Users,
    fields: [
      { key: 'full_name', label: 'Name', default: true },
      { key: 'email', label: 'Email', default: true },
      { key: 'role', label: 'Role', default: true, filterable: true },
      { key: 'status', label: 'Status', default: true, filterable: true },
      { key: 'current_caseload', label: 'Current Caseload', default: true },
      { key: 'caseload_capacity', label: 'Capacity' },
      { key: 'billable_hours_target', label: 'Billable Target' },
      { key: 'billable_hours_actual', label: 'Billable Actual' },
      { key: 'start_date', label: 'Start Date', format: 'date' },
    ],
    filterOptions: {
      role: ['Behaviour Support Practitioner', 'Senior Practitioner', 'Practice Lead', 'Allied Health Assistant'],
      status: ['active', 'on_leave', 'probation', 'inactive'],
    },
  },
  BillingRecord: {
    name: 'Billing Records',
    icon: DollarSign,
    dateField: 'service_date',
    fields: [
      { key: 'service_date', label: 'Service Date', format: 'date', default: true },
      { key: 'client_name', label: 'Client', default: true },
      { key: 'practitioner_name', label: 'Practitioner', default: true },
      { key: 'service_type', label: 'Service Type', default: true, filterable: true },
      { key: 'duration_hours', label: 'Hours', default: true },
      { key: 'rate', label: 'Rate', format: 'currency' },
      { key: 'total_amount', label: 'Amount', format: 'currency', default: true },
      { key: 'status', label: 'Status', default: true, filterable: true },
      { key: 'invoice_number', label: 'Invoice #' },
      { key: 'ndis_line_item', label: 'NDIS Line Item' },
    ],
    filterOptions: {
      status: ['draft', 'submitted', 'paid', 'rejected', 'queried'],
      service_type: ['Assessment', 'Plan Development', 'Plan Review', 'Direct Support', 'Report Writing', 'Travel', 'Supervision', 'Group Session'],
    },
  },
  Task: {
    name: 'Tasks',
    icon: CheckSquare,
    dateField: 'due_date',
    fields: [
      { key: 'title', label: 'Title', default: true },
      { key: 'category', label: 'Category', default: true, filterable: true },
      { key: 'priority', label: 'Priority', default: true, filterable: true },
      { key: 'status', label: 'Status', default: true, filterable: true },
      { key: 'due_date', label: 'Due Date', format: 'date', default: true },
      { key: 'assigned_to', label: 'Assigned To' },
      { key: 'related_entity_type', label: 'Related Entity' },
      { key: 'created_date', label: 'Created Date', format: 'date' },
    ],
    filterOptions: {
      category: ['Compliance', 'HR', 'Finance', 'Clinical', 'Operations', 'Strategic', 'Other'],
      priority: ['urgent', 'high', 'medium', 'low'],
      status: ['pending', 'in_progress', 'completed', 'deferred'],
    },
  },
  ComplianceItem: {
    name: 'Compliance Items',
    icon: Shield,
    dateField: 'due_date',
    fields: [
      { key: 'title', label: 'Title', default: true },
      { key: 'category', label: 'Category', default: true, filterable: true },
      { key: 'status', label: 'Status', default: true, filterable: true },
      { key: 'priority', label: 'Priority', default: true, filterable: true },
      { key: 'due_date', label: 'Due Date', format: 'date', default: true },
      { key: 'last_reviewed', label: 'Last Reviewed', format: 'date' },
      { key: 'responsible_person', label: 'Responsible' },
    ],
    filterOptions: {
      category: ['NDIS Registration', 'Quality & Safeguards', 'Worker Screening', 'Insurance', 'Professional Development', 'Clinical Governance', 'Documentation', 'Other'],
      status: ['compliant', 'attention_needed', 'non_compliant', 'pending_review'],
      priority: ['critical', 'high', 'medium', 'low'],
    },
  },
  Program: {
    name: 'Programs',
    icon: Boxes,
    fields: [
      { key: 'name', label: 'Name', default: true },
      { key: 'type', label: 'Type', default: true, filterable: true },
      { key: 'status', label: 'Status', default: true, filterable: true },
      { key: 'lead_practitioner_name', label: 'Lead Practitioner' },
      { key: 'max_participants', label: 'Max Participants' },
      { key: 'current_participants', label: 'Current Participants' },
      { key: 'start_date', label: 'Start Date', format: 'date' },
      { key: 'end_date', label: 'End Date', format: 'date' },
      { key: 'revenue_target', label: 'Revenue Target', format: 'currency' },
      { key: 'revenue_actual', label: 'Revenue Actual', format: 'currency' },
    ],
    filterOptions: {
      type: ['LEGO Therapy', 'Social Skills Group', 'Behaviour Support', 'Parent Training', 'School Consultation', 'Other'],
      status: ['planning', 'active', 'paused', 'completed'],
    },
  },
};

const datePresets = [
  { label: 'Last 7 Days', getValue: () => ({ from: format(subDays(new Date(), 7), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') }) },
  { label: 'Last 30 Days', getValue: () => ({ from: format(subDays(new Date(), 30), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') }) },
  { label: 'Last 90 Days', getValue: () => ({ from: format(subDays(new Date(), 90), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') }) },
  { label: 'This Month', getValue: () => ({ from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: format(endOfMonth(new Date()), 'yyyy-MM-dd') }) },
  { label: 'All Time', getValue: () => ({ from: '', to: '' }) },
];

export default function Reports() {
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [selectedFields, setSelectedFields] = useState([]);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [filters, setFilters] = useState({});
  const [reportData, setReportData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const tableRef = useRef(null);

  // Fetch all data
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => base44.entities.Client.list() });
  const { data: practitioners = [] } = useQuery({ queryKey: ['practitioners'], queryFn: () => base44.entities.Practitioner.list() });
  const { data: billingRecords = [] } = useQuery({ queryKey: ['billing'], queryFn: () => base44.entities.BillingRecord.list() });
  const { data: complianceItems = [] } = useQuery({ queryKey: ['compliance'], queryFn: () => base44.entities.ComplianceItem.list() });
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks'], queryFn: () => base44.entities.Task.list() });
  const { data: programs = [] } = useQuery({ queryKey: ['programs'], queryFn: () => base44.entities.Program.list() });

  const dataMap = {
    Client: clients,
    Practitioner: practitioners,
    BillingRecord: billingRecords,
    ComplianceItem: complianceItems,
    Task: tasks,
    Program: programs,
  };

  const handleEntitySelect = (entity) => {
    setSelectedEntity(entity);
    setSelectedFields(entityConfig[entity].fields.filter(f => f.default).map(f => f.key));
    setFilters({});
    setReportData(null);
  };

  const handleFieldToggle = (fieldKey) => {
    setSelectedFields(prev => 
      prev.includes(fieldKey) ? prev.filter(f => f !== fieldKey) : [...prev, fieldKey]
    );
  };

  const formatValue = (value, formatType) => {
    if (value === null || value === undefined) return '-';
    switch (formatType) {
      case 'currency':
        return `$${parseFloat(value).toLocaleString()}`;
      case 'date':
        try {
          return format(new Date(value), 'MMM d, yyyy');
        } catch {
          return value;
        }
      default:
        return String(value);
    }
  };

  const generateReport = () => {
    if (!selectedEntity || selectedFields.length === 0) return;

    setIsGenerating(true);
    const config = entityConfig[selectedEntity];
    let data = [...dataMap[selectedEntity]];

    // Apply date filter
    if (config.dateField && (dateRange.from || dateRange.to)) {
      data = data.filter(item => {
        const itemDate = item[config.dateField];
        if (!itemDate) return false;
        const date = new Date(itemDate);
        if (dateRange.from && date < new Date(dateRange.from)) return false;
        if (dateRange.to && date > new Date(dateRange.to)) return false;
        return true;
      });
    }

    // Apply filters
    Object.entries(filters).forEach(([field, value]) => {
      if (value && value !== 'all') {
        data = data.filter(item => item[field] === value);
      }
    });

    // Map to selected fields
    const result = data.map(item => {
      const row = {};
      selectedFields.forEach(fieldKey => {
        const fieldConfig = config.fields.find(f => f.key === fieldKey);
        row[fieldConfig?.label || fieldKey] = formatValue(item[fieldKey], fieldConfig?.format);
      });
      return row;
    });

    setReportData(result);
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
    link.download = `${selectedEntity}_Report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const exportToPDF = async () => {
    if (!reportData || reportData.length === 0) return;

    // Create printable HTML
    const headers = Object.keys(reportData[0]);
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${entityConfig[selectedEntity]?.name} Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #0D9488; margin-bottom: 5px; }
          .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #0D9488; color: white; padding: 8px; text-align: left; }
          td { border: 1px solid #ddd; padding: 6px; }
          tr:nth-child(even) { background: #f9f9f9; }
          .footer { margin-top: 20px; font-size: 10px; color: #999; }
        </style>
      </head>
      <body>
        <h1>${entityConfig[selectedEntity]?.name} Report</h1>
        <div class="meta">
          Generated: ${format(new Date(), 'MMMM d, yyyy HH:mm')} | Records: ${reportData.length}
          ${dateRange.from ? ` | Date Range: ${dateRange.from} to ${dateRange.to}` : ''}
        </div>
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${reportData.map(row => `<tr>${headers.map(h => `<td>${row[h] || '-'}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
        <div class="footer">Breakthrough Coaching & Consulting - NDIS Provider</div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  const currentConfig = selectedEntity ? entityConfig[selectedEntity] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-teal-600" />
          Custom Report Builder
        </h2>
        <p className="text-slate-500 mt-1">Generate customised reports with filtering and export options</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Entity Selection */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="font-semibold text-slate-900">Select Entity</h3>
          <div className="space-y-2">
            {Object.entries(entityConfig).map(([key, config]) => (
              <button
                key={key}
                onClick={() => handleEntitySelect(key)}
                className={cn(
                  "w-full p-3 rounded-xl border text-left transition-all hover:shadow-md",
                  selectedEntity === key
                    ? "border-teal-300 bg-teal-50"
                    : "border-slate-200 bg-white hover:border-teal-200"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center",
                    selectedEntity === key ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"
                  )}>
                    <config.icon className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-slate-900 text-sm">{config.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Report Configuration & Results */}
        <div className="lg:col-span-3 space-y-4">
          {selectedEntity ? (
            <>
              <Tabs defaultValue="fields">
                <TabsList>
                  <TabsTrigger value="fields"><Settings className="w-4 h-4 mr-1" />Fields</TabsTrigger>
                  <TabsTrigger value="filters"><Filter className="w-4 h-4 mr-1" />Filters</TabsTrigger>
                </TabsList>

                <TabsContent value="fields" className="mt-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Select Fields to Include</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {currentConfig.fields.map(field => (
                          <div key={field.key} className="flex items-center gap-2">
                            <Checkbox
                              id={field.key}
                              checked={selectedFields.includes(field.key)}
                              onCheckedChange={() => handleFieldToggle(field.key)}
                            />
                            <label htmlFor={field.key} className="text-sm text-slate-700 cursor-pointer">
                              {field.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="filters" className="mt-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Apply Filters</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Date Range */}
                        {currentConfig.dateField && (
                          <>
                            <div>
                              <Label className="text-xs">Date Preset</Label>
                              <Select onValueChange={(v) => {
                                const preset = datePresets.find(p => p.label === v);
                                if (preset) setDateRange(preset.getValue());
                              }}>
                                <SelectTrigger className="mt-1"><SelectValue placeholder="Select range" /></SelectTrigger>
                                <SelectContent>
                                  {datePresets.map(p => <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">From Date</Label>
                              <Input type="date" className="mt-1" value={dateRange.from} onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })} />
                            </div>
                            <div>
                              <Label className="text-xs">To Date</Label>
                              <Input type="date" className="mt-1" value={dateRange.to} onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })} />
                            </div>
                          </>
                        )}
                        
                        {/* Dynamic Filters */}
                        {currentConfig.fields.filter(f => f.filterable).map(field => (
                          <div key={field.key}>
                            <Label className="text-xs">{field.label}</Label>
                            <Select value={filters[field.key] || 'all'} onValueChange={(v) => setFilters({ ...filters, [field.key]: v })}>
                              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                {currentConfig.filterOptions?.[field.key]?.map(opt => (
                                  <SelectItem key={opt} value={opt} className="capitalize">{opt.replace(/_/g, ' ')}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end">
                <Button onClick={generateReport} disabled={selectedFields.length === 0} className="bg-teal-600 hover:bg-teal-700">
                  {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BarChart3 className="w-4 h-4 mr-2" />}
                  Generate Report
                </Button>
              </div>

              {/* Results */}
              {reportData && (
                <Card>
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{currentConfig.name} Report</CardTitle>
                      <CardDescription>{reportData.length} records found</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={exportToCSV}>
                        <FileSpreadsheet className="w-4 h-4 mr-1" />
                        CSV
                      </Button>
                      <Button variant="outline" size="sm" onClick={exportToPDF}>
                        <FileDown className="w-4 h-4 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto" ref={tableRef}>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {reportData.length > 0 && Object.keys(reportData[0]).map(key => (
                              <TableHead key={key} className="whitespace-nowrap">{key}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.slice(0, 100).map((row, idx) => (
                            <TableRow key={idx}>
                              {Object.values(row).map((val, vidx) => (
                                <TableCell key={vidx} className="text-sm whitespace-nowrap">{val}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {reportData.length > 100 && (
                        <p className="text-sm text-slate-500 text-center mt-4">
                          Showing 100 of {reportData.length} records. Export to see all.
                        </p>
                      )}
                      {reportData.length === 0 && (
                        <p className="text-sm text-slate-500 text-center py-8">No records match the selected criteria</p>
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
                <p className="text-slate-500">Select an entity to build your report</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}