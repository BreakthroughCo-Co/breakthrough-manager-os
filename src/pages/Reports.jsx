import React, { useState, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays, startOfMonth, endOfMonth, parseISO, startOfWeek, startOfYear, eachMonthOfInterval, eachWeekOfInterval } from 'date-fns';
import {
  FileText,
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
  FileDown,
  Save,
  Star,
  Trash2,
  PieChart,
  TrendingUp,
  LayoutDashboard,
  LineChart as LineChartIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { cn } from '@/lib/utils';

const COLORS = ['#14B8A6', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#10B981'];

const entityConfig = {
  Client: {
    name: 'Clients',
    icon: Users,
    fields: [
      { key: 'full_name', label: 'Name', default: true },
      { key: 'ndis_number', label: 'NDIS Number', default: true },
      { key: 'status', label: 'Status', default: true, filterable: true, chartable: true },
      { key: 'service_type', label: 'Service Type', default: true, filterable: true, chartable: true },
      { key: 'risk_level', label: 'Risk Level', filterable: true, chartable: true },
      { key: 'assigned_practitioner_id', label: 'Practitioner' },
      { key: 'funding_allocated', label: 'Funding Allocated', format: 'currency', aggregatable: true },
      { key: 'funding_utilised', label: 'Funding Used', format: 'currency', aggregatable: true },
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
      { key: 'role', label: 'Role', default: true, filterable: true, chartable: true },
      { key: 'status', label: 'Status', default: true, filterable: true, chartable: true },
      { key: 'current_caseload', label: 'Current Caseload', default: true, aggregatable: true },
      { key: 'caseload_capacity', label: 'Capacity', aggregatable: true },
      { key: 'billable_hours_target', label: 'Billable Target', aggregatable: true },
      { key: 'billable_hours_actual', label: 'Billable Actual', aggregatable: true },
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
      { key: 'service_type', label: 'Service Type', default: true, filterable: true, chartable: true },
      { key: 'duration_hours', label: 'Hours', default: true, aggregatable: true },
      { key: 'rate', label: 'Rate', format: 'currency' },
      { key: 'total_amount', label: 'Amount', format: 'currency', default: true, aggregatable: true },
      { key: 'status', label: 'Status', default: true, filterable: true, chartable: true },
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
      { key: 'category', label: 'Category', default: true, filterable: true, chartable: true },
      { key: 'priority', label: 'Priority', default: true, filterable: true, chartable: true },
      { key: 'status', label: 'Status', default: true, filterable: true, chartable: true },
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
      { key: 'category', label: 'Category', default: true, filterable: true, chartable: true },
      { key: 'status', label: 'Status', default: true, filterable: true, chartable: true },
      { key: 'priority', label: 'Priority', default: true, filterable: true, chartable: true },
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
      { key: 'type', label: 'Type', default: true, filterable: true, chartable: true },
      { key: 'status', label: 'Status', default: true, filterable: true, chartable: true },
      { key: 'lead_practitioner_name', label: 'Lead Practitioner' },
      { key: 'max_participants', label: 'Max Participants', aggregatable: true },
      { key: 'current_participants', label: 'Current Participants', aggregatable: true },
      { key: 'start_date', label: 'Start Date', format: 'date' },
      { key: 'end_date', label: 'End Date', format: 'date' },
      { key: 'revenue_target', label: 'Revenue Target', format: 'currency', aggregatable: true },
      { key: 'revenue_actual', label: 'Revenue Actual', format: 'currency', aggregatable: true },
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
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [selectedFields, setSelectedFields] = useState([]);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [filters, setFilters] = useState({});
  const [reportData, setReportData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [reportName, setReportName] = useState('');
  const [chartType, setChartType] = useState('pie');
  const [chartField, setChartField] = useState('');

  const queryClient = useQueryClient();

  // Fetch all data
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => base44.entities.Client.list() });
  const { data: practitioners = [] } = useQuery({ queryKey: ['practitioners'], queryFn: () => base44.entities.Practitioner.list() });
  const { data: billingRecords = [] } = useQuery({ queryKey: ['billing'], queryFn: () => base44.entities.BillingRecord.list() });
  const { data: complianceItems = [] } = useQuery({ queryKey: ['compliance'], queryFn: () => base44.entities.ComplianceItem.list() });
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks'], queryFn: () => base44.entities.Task.list() });
  const { data: programs = [] } = useQuery({ queryKey: ['programs'], queryFn: () => base44.entities.Program.list() });
  const { data: savedReports = [] } = useQuery({ queryKey: ['savedReports'], queryFn: () => base44.entities.SavedReport.list('-created_date') });

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.SavedReport.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['savedReports'] }); setSaveDialogOpen(false); setReportName(''); },
  });

  const deleteSavedMutation = useMutation({
    mutationFn: (id) => base44.entities.SavedReport.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['savedReports'] }),
  });

  const dataMap = { Client: clients, Practitioner: practitioners, BillingRecord: billingRecords, ComplianceItem: complianceItems, Task: tasks, Program: programs };

  // Dashboard metrics
  const dashboardMetrics = useMemo(() => {
    // Generate time-series data for client growth
    const sortedClients = [...clients].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    const clientGrowth = [];
    if (sortedClients.length > 0) {
      const startDate = new Date(sortedClients[0]?.created_date || new Date());
      const months = eachMonthOfInterval({ start: startOfYear(startDate), end: new Date() }).slice(-12);
      months.forEach(month => {
        const count = sortedClients.filter(c => new Date(c.created_date) <= month).length;
        clientGrowth.push({ name: format(month, 'MMM yyyy'), value: count });
      });
    }

    // Billing over time
    const billingByMonth = [];
    const billingMonths = eachMonthOfInterval({ start: subDays(new Date(), 365), end: new Date() }).slice(-12);
    billingMonths.forEach(month => {
      const monthStart = month;
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      const total = billingRecords
        .filter(b => {
          const date = new Date(b.service_date);
          return date >= monthStart && date <= monthEnd;
        })
        .reduce((sum, b) => sum + (b.total_amount || 0), 0);
      billingByMonth.push({ name: format(month, 'MMM'), value: total });
    });

    return {
      clientsByStatus: Object.entries(clients.reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {})).map(([name, value]) => ({ name: name?.replace(/_/g, ' ') || 'Unknown', value })),
      clientsByService: Object.entries(clients.reduce((acc, c) => { acc[c.service_type || 'Unknown'] = (acc[c.service_type || 'Unknown'] || 0) + 1; return acc; }, {})).map(([name, value]) => ({ name, value })),
      tasksByStatus: Object.entries(tasks.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {})).map(([name, value]) => ({ name: name?.replace(/_/g, ' ') || 'Unknown', value })),
      complianceByStatus: Object.entries(complianceItems.reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {})).map(([name, value]) => ({ name: name?.replace(/_/g, ' ') || 'Unknown', value })),
      totalFunding: clients.reduce((sum, c) => sum + (c.funding_allocated || 0), 0),
      usedFunding: clients.reduce((sum, c) => sum + (c.funding_utilised || 0), 0),
      billingByStatus: Object.entries(billingRecords.reduce((acc, b) => { acc[b.status] = (acc[b.status] || 0) + (b.total_amount || 0); return acc; }, {})).map(([name, value]) => ({ name, value })),
      practitionersByRole: Object.entries(practitioners.reduce((acc, p) => { acc[p.role || 'Unknown'] = (acc[p.role || 'Unknown'] || 0) + 1; return acc; }, {})).map(([name, value]) => ({ name: name?.split(' ')[0] || 'Unknown', value })),
      clientGrowth,
      billingByMonth,
    };
  }, [clients, tasks, complianceItems, billingRecords, practitioners]);

  // Generate chart data from report results
  const chartData = useMemo(() => {
    if (!reportData || !selectedEntity) return null;
    const config = entityConfig[selectedEntity];
    const chartableFields = config.fields.filter(f => f.chartable && selectedFields.includes(f.key));
    
    return chartableFields.map(field => {
      const counts = {};
      dataMap[selectedEntity].forEach(item => {
        let value = item[field.key];
        // Apply filters
        let include = true;
        Object.entries(filters).forEach(([fKey, fValue]) => {
          if (fValue && fValue !== 'all' && item[fKey] !== fValue) include = false;
        });
        if (include) {
          const key = value?.toString()?.replace(/_/g, ' ') || 'Unknown';
          counts[key] = (counts[key] || 0) + 1;
        }
      });
      return { field: field.label, key: field.key, data: Object.entries(counts).map(([name, value]) => ({ name, value })) };
    });
  }, [reportData, selectedEntity, selectedFields, filters]);

  // Time-series chart data for report builder
  const timeSeriesData = useMemo(() => {
    if (!selectedEntity || !reportData) return null;
    const config = entityConfig[selectedEntity];
    const dateField = config.dateField || 'created_date';
    
    const data = dataMap[selectedEntity].filter(item => {
      let include = true;
      Object.entries(filters).forEach(([fKey, fValue]) => {
        if (fValue && fValue !== 'all' && item[fKey] !== fValue) include = false;
      });
      return include && item[dateField];
    });

    if (data.length === 0) return null;

    // Group by month
    const byMonth = {};
    data.forEach(item => {
      const date = new Date(item[dateField]);
      const key = format(date, 'MMM yyyy');
      byMonth[key] = (byMonth[key] || 0) + 1;
    });

    // Sort by date
    const sorted = Object.entries(byMonth)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .slice(-12)
      .map(([name, value]) => ({ name, value }));

    return sorted;
  }, [selectedEntity, reportData, filters]);

  const handleEntitySelect = (entity) => {
    setSelectedEntity(entity);
    setSelectedFields(entityConfig[entity].fields.filter(f => f.default).map(f => f.key));
    setFilters({});
    setReportData(null);
  };

  const handleFieldToggle = (fieldKey) => {
    setSelectedFields(prev => prev.includes(fieldKey) ? prev.filter(f => f !== fieldKey) : [...prev, fieldKey]);
  };

  const formatValue = (value, formatType) => {
    if (value === null || value === undefined) return '-';
    switch (formatType) {
      case 'currency': return `$${parseFloat(value).toLocaleString()}`;
      case 'date': try { return format(new Date(value), 'MMM d, yyyy'); } catch { return value; }
      default: return String(value);
    }
  };

  const generateReport = () => {
    if (!selectedEntity || selectedFields.length === 0) return;
    setIsGenerating(true);
    const config = entityConfig[selectedEntity];
    let data = [...dataMap[selectedEntity]];

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

    Object.entries(filters).forEach(([field, value]) => {
      if (value && value !== 'all') data = data.filter(item => item[field] === value);
    });

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

  const handleSaveReport = () => {
    if (!reportName || !selectedEntity) return;
    saveMutation.mutate({
      name: reportName,
      entity_type: selectedEntity,
      selected_fields: JSON.stringify(selectedFields),
      filters: JSON.stringify(filters),
      date_range: JSON.stringify(dateRange),
      chart_config: JSON.stringify({ chartType, chartField }),
    });
  };

  const handleLoadSavedReport = (saved) => {
    setSelectedEntity(saved.entity_type);
    try {
      setSelectedFields(JSON.parse(saved.selected_fields || '[]'));
      setFilters(JSON.parse(saved.filters || '{}'));
      setDateRange(JSON.parse(saved.date_range || '{}'));
      const chartConfig = JSON.parse(saved.chart_config || '{}');
      if (chartConfig.chartType) setChartType(chartConfig.chartType);
      if (chartConfig.chartField) setChartField(chartConfig.chartField);
    } catch { }
    setActiveView('builder');
    setReportData(null);
  };

  const exportToCSV = () => {
    if (!reportData || reportData.length === 0) return;
    const headers = Object.keys(reportData[0]);
    const csvContent = [headers.join(','), ...reportData.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${selectedEntity}_Report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    if (!reportData || reportData.length === 0) return;
    const headers = Object.keys(reportData[0]);
    const htmlContent = `<!DOCTYPE html><html><head><title>${entityConfig[selectedEntity]?.name} Report</title><style>body{font-family:Arial,sans-serif;padding:20px}h1{color:#0D9488;margin-bottom:5px}.meta{color:#666;font-size:12px;margin-bottom:20px}table{width:100%;border-collapse:collapse;font-size:11px}th{background:#0D9488;color:white;padding:8px;text-align:left}td{border:1px solid #ddd;padding:6px}tr:nth-child(even){background:#f9f9f9}.footer{margin-top:20px;font-size:10px;color:#999}</style></head><body><h1>${entityConfig[selectedEntity]?.name} Report</h1><div class="meta">Generated: ${format(new Date(), 'MMMM d, yyyy HH:mm')} | Records: ${reportData.length}</div><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${reportData.map(row => `<tr>${headers.map(h => `<td>${row[h] || '-'}</td>`).join('')}</tr>`).join('')}</tbody></table><div class="footer">Breakthrough Coaching & Consulting</div></body></html>`;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  const currentConfig = selectedEntity ? entityConfig[selectedEntity] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-teal-600" />
            Reports & Analytics
          </h2>
          <p className="text-slate-500 mt-1">Dashboard overview and custom report builder</p>
        </div>
      </div>

      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList>
          <TabsTrigger value="dashboard"><LayoutDashboard className="w-4 h-4 mr-1" />Dashboard</TabsTrigger>
          <TabsTrigger value="builder"><Settings className="w-4 h-4 mr-1" />Report Builder</TabsTrigger>
          <TabsTrigger value="saved"><Star className="w-4 h-4 mr-1" />Saved Reports ({savedReports.length})</TabsTrigger>
        </TabsList>

        {/* Dashboard View */}
        <TabsContent value="dashboard" className="space-y-6 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-6"><p className="text-2xl font-bold text-slate-900">{clients.length}</p><p className="text-xs text-slate-500">Total Clients</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-2xl font-bold text-teal-600">${(dashboardMetrics.totalFunding / 1000).toFixed(0)}k</p><p className="text-xs text-slate-500">Total Funding</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-2xl font-bold text-blue-600">{practitioners.filter(p => p.status === 'active').length}</p><p className="text-xs text-slate-500">Active Practitioners</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-2xl font-bold text-amber-600">{tasks.filter(t => t.status === 'pending').length}</p><p className="text-xs text-slate-500">Pending Tasks</p></CardContent></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Clients by Status</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPie><Pie data={dashboardMetrics.clientsByStatus} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>{dashboardMetrics.clientsByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></RechartsPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Clients by Service Type</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dashboardMetrics.clientsByService}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis /><Tooltip /><Bar dataKey="value" fill="#14B8A6" radius={[4, 4, 0, 0]} /></BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Task Status Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPie><Pie data={dashboardMetrics.tasksByStatus} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value" label>{dashboardMetrics.tasksByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></RechartsPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Compliance Status</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dashboardMetrics.complianceByStatus} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" radius={[0, 4, 4, 0]}>{dashboardMetrics.complianceByStatus.map((entry, i) => <Cell key={i} fill={entry.name === 'non compliant' ? '#EF4444' : entry.name === 'attention needed' ? '#F59E0B' : '#10B981'} />)}</Bar></BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Funding Utilisation</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPie><Pie data={[{ name: 'Used', value: dashboardMetrics.usedFunding }, { name: 'Remaining', value: dashboardMetrics.totalFunding - dashboardMetrics.usedFunding }]} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}><Cell fill="#14B8A6" /><Cell fill="#E2E8F0" /></Pie><Tooltip formatter={(v) => `$${v.toLocaleString()}`} /></RechartsPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Practitioners by Role</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dashboardMetrics.practitionersByRole}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis /><Tooltip /><Bar dataKey="value" fill="#8B5CF6" radius={[4, 4, 0, 0]} /></BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Time-series charts */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><LineChartIcon className="w-4 h-4" />Client Growth Over Time</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={dashboardMetrics.clientGrowth}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis /><Tooltip /><Line type="monotone" dataKey="value" stroke="#14B8A6" strokeWidth={2} dot={{ fill: '#14B8A6' }} /></LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" />Monthly Billing Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={dashboardMetrics.billingByMonth}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} /><Tooltip formatter={(v) => `$${v.toLocaleString()}`} /><Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6' }} /></LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Report Builder View */}
        <TabsContent value="builder" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <h3 className="font-semibold text-slate-900">Select Entity</h3>
              <div className="space-y-2">
                {Object.entries(entityConfig).map(([key, config]) => (
                  <button key={key} onClick={() => handleEntitySelect(key)} className={cn("w-full p-3 rounded-xl border text-left transition-all hover:shadow-md", selectedEntity === key ? "border-teal-300 bg-teal-50" : "border-slate-200 bg-white hover:border-teal-200")}>
                    <div className="flex items-center gap-3">
                      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", selectedEntity === key ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600")}><config.icon className="w-4 h-4" /></div>
                      <span className="font-medium text-slate-900 text-sm">{config.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-3 space-y-4">
              {selectedEntity ? (
                <>
                  <Tabs defaultValue="fields">
                    <TabsList>
                      <TabsTrigger value="fields"><Settings className="w-4 h-4 mr-1" />Fields</TabsTrigger>
                      <TabsTrigger value="filters"><Filter className="w-4 h-4 mr-1" />Filters</TabsTrigger>
                      <TabsTrigger value="chart"><PieChart className="w-4 h-4 mr-1" />Chart</TabsTrigger>
                    </TabsList>
                    <TabsContent value="fields" className="mt-4">
                      <Card><CardHeader className="pb-3"><CardTitle className="text-base">Select Fields to Include</CardTitle></CardHeader><CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{currentConfig.fields.map(field => (<div key={field.key} className="flex items-center gap-2"><Checkbox id={field.key} checked={selectedFields.includes(field.key)} onCheckedChange={() => handleFieldToggle(field.key)} /><label htmlFor={field.key} className="text-sm text-slate-700 cursor-pointer">{field.label}</label></div>))}</div>
                      </CardContent></Card>
                    </TabsContent>
                    <TabsContent value="filters" className="mt-4">
                      <Card><CardHeader className="pb-3"><CardTitle className="text-base">Apply Filters</CardTitle></CardHeader><CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {currentConfig.dateField && (<><div><Label className="text-xs">Date Preset</Label><Select onValueChange={(v) => { const preset = datePresets.find(p => p.label === v); if (preset) setDateRange(preset.getValue()); }}><SelectTrigger className="mt-1"><SelectValue placeholder="Select range" /></SelectTrigger><SelectContent>{datePresets.map(p => <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>)}</SelectContent></Select></div><div><Label className="text-xs">From</Label><Input type="date" className="mt-1" value={dateRange.from} onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })} /></div><div><Label className="text-xs">To</Label><Input type="date" className="mt-1" value={dateRange.to} onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })} /></div></>)}
                          {currentConfig.fields.filter(f => f.filterable).map(field => (<div key={field.key}><Label className="text-xs">{field.label}</Label><Select value={filters[field.key] || 'all'} onValueChange={(v) => setFilters({ ...filters, [field.key]: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{currentConfig.filterOptions?.[field.key]?.map(opt => (<SelectItem key={opt} value={opt} className="capitalize">{opt.replace(/_/g, ' ')}</SelectItem>))}</SelectContent></Select></div>))}
                        </div>
                      </CardContent></Card>
                    </TabsContent>
                    <TabsContent value="chart" className="mt-4">
                      <Card><CardHeader className="pb-3"><CardTitle className="text-base">Chart Visualisation</CardTitle></CardHeader><CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs">Chart Type</Label>
                            <Select value={chartType} onValueChange={setChartType}>
                              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pie"><div className="flex items-center gap-2"><PieChart className="w-4 h-4" />Pie Chart</div></SelectItem>
                                <SelectItem value="bar"><div className="flex items-center gap-2"><BarChart3 className="w-4 h-4" />Bar Chart</div></SelectItem>
                                <SelectItem value="line"><div className="flex items-center gap-2"><LineChartIcon className="w-4 h-4" />Line Chart (Time Series)</div></SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Chart Field</Label>
                            <Select value={chartField} onValueChange={setChartField}>
                              <SelectTrigger className="mt-1"><SelectValue placeholder="Select field" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value={null}>Auto (all chartable)</SelectItem>
                                {currentConfig.fields.filter(f => f.chartable).map(f => (
                                  <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent></Card>
                    </TabsContent>
                  </Tabs>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setSaveDialogOpen(true)} disabled={selectedFields.length === 0}><Save className="w-4 h-4 mr-2" />Save Configuration</Button>
                    <Button onClick={generateReport} disabled={selectedFields.length === 0} className="bg-teal-600 hover:bg-teal-700">{isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BarChart3 className="w-4 h-4 mr-2" />}Generate Report</Button>
                  </div>

                  {reportData && (
                    <>
                      {/* Charts */}
                      {chartData && chartData.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {(chartField ? chartData.filter(c => c.key === chartField) : chartData).map((chart, idx) => (
                            <Card key={idx}><CardHeader className="pb-2"><CardTitle className="text-sm">{chart.field} Distribution</CardTitle></CardHeader><CardContent>
                              <ResponsiveContainer width="100%" height={200}>
                                {chartType === 'pie' ? (
                                  <RechartsPie><Pie data={chart.data} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>{chart.data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></RechartsPie>
                                ) : chartType === 'bar' ? (
                                  <BarChart data={chart.data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis /><Tooltip /><Bar dataKey="value" fill="#14B8A6" radius={[4, 4, 0, 0]} /></BarChart>
                                ) : (
                                  <BarChart data={chart.data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis /><Tooltip /><Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} /></BarChart>
                                )}
                              </ResponsiveContainer>
                            </CardContent></Card>
                          ))}
                          
                          {/* Time-series line chart */}
                          {chartType === 'line' && timeSeriesData && timeSeriesData.length > 0 && (
                            <Card className="md:col-span-2"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><LineChartIcon className="w-4 h-4" />{currentConfig?.name} Over Time</CardTitle></CardHeader><CardContent>
                              <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={timeSeriesData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis /><Tooltip /><Line type="monotone" dataKey="value" stroke="#14B8A6" strokeWidth={2} dot={{ fill: '#14B8A6' }} /></LineChart>
                              </ResponsiveContainer>
                            </CardContent></Card>
                          )}
                        </div>
                      )}

                      <Card><CardHeader className="pb-3 flex flex-row items-center justify-between"><div><CardTitle className="text-base">{currentConfig.name} Report</CardTitle><CardDescription>{reportData.length} records</CardDescription></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={exportToCSV}><FileSpreadsheet className="w-4 h-4 mr-1" />CSV</Button><Button variant="outline" size="sm" onClick={exportToPDF}><FileDown className="w-4 h-4 mr-1" />PDF</Button></div></CardHeader><CardContent>
                        <div className="overflow-x-auto"><Table><TableHeader><TableRow>{reportData.length > 0 && Object.keys(reportData[0]).map(key => (<TableHead key={key} className="whitespace-nowrap">{key}</TableHead>))}</TableRow></TableHeader><TableBody>{reportData.slice(0, 100).map((row, idx) => (<TableRow key={idx}>{Object.values(row).map((val, vidx) => (<TableCell key={vidx} className="text-sm whitespace-nowrap">{val}</TableCell>))}</TableRow>))}</TableBody></Table>{reportData.length > 100 && <p className="text-sm text-slate-500 text-center mt-4">Showing 100 of {reportData.length} records.</p>}{reportData.length === 0 && <p className="text-sm text-slate-500 text-center py-8">No records match criteria</p>}</div>
                      </CardContent></Card>
                    </>
                  )}
                </>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 h-96 flex items-center justify-center"><div className="text-center"><FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Select an entity to build your report</p></div></div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Saved Reports View */}
        <TabsContent value="saved" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedReports.map((report) => {
              const IconComponent = entityConfig[report.entity_type]?.icon;
              return (
                <Card key={report.id} className="hover:shadow-lg transition-all cursor-pointer" onClick={() => handleLoadSavedReport(report)}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                          {IconComponent && <IconComponent className="w-5 h-5 text-teal-600" />}
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">{report.name}</h4>
                          <p className="text-xs text-slate-500">{entityConfig[report.entity_type]?.name}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteSavedMutation.mutate(report.id); }} className="text-red-500 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-slate-400">Created {report.created_date ? format(new Date(report.created_date), 'MMM d, yyyy') : '-'}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {savedReports.length === 0 && (<div className="bg-white rounded-2xl border border-slate-200 py-16 text-center"><Star className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No saved reports yet</p><p className="text-sm text-slate-400">Save report configurations from the Report Builder</p></div>)}
        </TabsContent>
      </Tabs>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Save Report Configuration</DialogTitle></DialogHeader>
          <div className="py-4"><Label>Report Name</Label><Input value={reportName} onChange={(e) => setReportName(e.target.value)} placeholder="e.g., Monthly Client Status" className="mt-2" /></div>
          <DialogFooter><Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button><Button onClick={handleSaveReport} disabled={!reportName} className="bg-teal-600 hover:bg-teal-700">Save Report</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}