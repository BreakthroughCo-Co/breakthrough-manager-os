import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import {
  Plus,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const emptyRecord = {
  client_id: '',
  client_name: '',
  practitioner_id: '',
  practitioner_name: '',
  service_date: format(new Date(), 'yyyy-MM-dd'),
  service_type: 'Direct Support',
  ndis_line_item: '',
  duration_hours: 1,
  rate: 0,
  total_amount: 0,
  status: 'draft',
  invoice_number: '',
  notes: ''
};

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700' },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700' },
  paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
  queried: { label: 'Queried', color: 'bg-amber-100 text-amber-700' },
};

const serviceTypes = [
  'Assessment',
  'Plan Development',
  'Plan Review',
  'Direct Support',
  'Report Writing',
  'Travel',
  'Supervision',
  'Group Session',
  'Capacity Building - Finding and Keeping a Job',
  'Core - Social, Economic and Community Participation',
  'Core - Assistance with Daily Life'
];

export default function Billing() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState(emptyRecord);

  const queryClient = useQueryClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'new') {
      setIsDialogOpen(true);
    }
  }, []);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['billing'],
    queryFn: () => base44.entities.BillingRecord.list('-service_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: practitioners = [] } = useQuery({
    queryKey: ['practitioners'],
    queryFn: () => base44.entities.Practitioner.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BillingRecord.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BillingRecord.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BillingRecord.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
  });

  const handleOpenDialog = (record = null) => {
    if (record) {
      setEditingRecord(record);
      setFormData(record);
    } else {
      setEditingRecord(null);
      setFormData(emptyRecord);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingRecord(null);
    setFormData(emptyRecord);
  };

  const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    setFormData({
      ...formData,
      client_id: clientId,
      client_name: client?.full_name || ''
    });
  };

  const handlePractitionerChange = (practitionerId) => {
    const practitioner = practitioners.find(p => p.id === practitionerId);
    setFormData({
      ...formData,
      practitioner_id: practitionerId,
      practitioner_name: practitioner?.full_name || ''
    });
  };

  const handleSubmit = () => {
    const total = (formData.duration_hours || 0) * (formData.rate || 0);
    const dataToSave = { ...formData, total_amount: total };
    
    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: dataToSave });
    } else {
      createMutation.mutate(dataToSave);
    }
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch = r.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.practitioner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const thisMonthStart = startOfMonth(new Date());
  const thisMonthEnd = endOfMonth(new Date());
  const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
  const lastMonthEnd = endOfMonth(subMonths(new Date(), 1));

  const thisMonthTotal = records
    .filter(r => {
      const date = new Date(r.service_date);
      return date >= thisMonthStart && date <= thisMonthEnd;
    })
    .reduce((sum, r) => sum + (r.total_amount || 0), 0);

  const lastMonthTotal = records
    .filter(r => {
      const date = new Date(r.service_date);
      return date >= lastMonthStart && date <= lastMonthEnd;
    })
    .reduce((sum, r) => sum + (r.total_amount || 0), 0);

  const paidTotal = records
    .filter(r => r.status === 'paid')
    .reduce((sum, r) => sum + (r.total_amount || 0), 0);

  const pendingTotal = records
    .filter(r => r.status === 'submitted' || r.status === 'draft')
    .reduce((sum, r) => sum + (r.total_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Billing Records</h2>
          <p className="text-slate-500 mt-1">Track service delivery and invoicing</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />
          Log Service
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">${thisMonthTotal.toLocaleString()}</p>
              <p className="text-xs text-slate-500">This Month</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">${lastMonthTotal.toLocaleString()}</p>
              <p className="text-xs text-slate-500">Last Month</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-600">${paidTotal.toLocaleString()}</p>
              <p className="text-xs text-slate-500">Total Paid</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-amber-600">${pendingTotal.toLocaleString()}</p>
              <p className="text-xs text-slate-500">Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by client, practitioner, or invoice..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="queried">Queried</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Practitioner</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.map((record) => (
              <TableRow key={record.id} className="hover:bg-slate-50">
                <TableCell className="font-medium">
                  {format(new Date(record.service_date), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>{record.client_name || '-'}</TableCell>
                <TableCell>{record.practitioner_name || '-'}</TableCell>
                <TableCell className="text-sm text-slate-600">{record.service_type}</TableCell>
                <TableCell>{record.duration_hours}h</TableCell>
                <TableCell className="font-semibold">${(record.total_amount || 0).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge className={statusConfig[record.status]?.color}>
                    {statusConfig[record.status]?.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(record)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(record.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredRecords.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No billing records found</p>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? 'Edit Billing Record' : 'Log New Service'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 sm:col-span-1">
              <Label>Client *</Label>
              <Select
                value={formData.client_id}
                onValueChange={handleClientChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Practitioner</Label>
              <Select
                value={formData.practitioner_id}
                onValueChange={handlePractitionerChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select practitioner" />
                </SelectTrigger>
                <SelectContent>
                  {practitioners.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Service Date *</Label>
              <Input
                type="date"
                value={formData.service_date}
                onChange={(e) => setFormData({ ...formData, service_date: e.target.value })}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Service Type *</Label>
              <Select
                value={formData.service_type}
                onValueChange={(value) => setFormData({ ...formData, service_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>NDIS Line Item</Label>
              <Input
                value={formData.ndis_line_item}
                onChange={(e) => setFormData({ ...formData, ndis_line_item: e.target.value })}
                placeholder="e.g., 15_038_0117_1_3"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Duration (hours) *</Label>
              <Input
                type="number"
                step="0.25"
                value={formData.duration_hours}
                onChange={(e) => setFormData({ ...formData, duration_hours: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Hourly Rate ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Total Amount</Label>
              <Input
                type="text"
                value={`$${((formData.duration_hours || 0) * (formData.rate || 0)).toFixed(2)}`}
                disabled
                className="bg-slate-50"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="queried">Queried</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Invoice Number</Label>
              <Input
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                placeholder="Invoice reference"
              />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.client_id || !formData.service_date || !formData.duration_hours}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {editingRecord ? 'Update' : 'Create'} Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}