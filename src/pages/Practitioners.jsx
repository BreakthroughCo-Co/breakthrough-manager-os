import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { createPageUrl } from '@/utils';
import {
  UserPlus,
  Search,
  Filter,
  MoreHorizontal,
  Mail,
  Phone,
  Calendar,
  Target,
  Users,
  Edit,
  Trash2,
  X,
  Check,
  AlertCircle,
  Eye
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const emptyPractitioner = {
  full_name: '',
  email: '',
  phone: '',
  role: 'Behaviour Support Practitioner',
  registration_number: '',
  status: 'active',
  caseload_capacity: 15,
  current_caseload: 0,
  billable_hours_target: 100,
  billable_hours_actual: 0,
  certifications: [],
  start_date: '',
  notes: ''
};

const statusColors = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  on_leave: 'bg-amber-100 text-amber-700 border-amber-200',
  probation: 'bg-blue-100 text-blue-700 border-blue-200',
  inactive: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function Practitioners() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [specialisationFilter, setSpecialisationFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPractitioner, setEditingPractitioner] = useState(null);
  const [formData, setFormData] = useState(emptyPractitioner);

  const queryClient = useQueryClient();

  const { data: practitioners = [], isLoading } = useQuery({
    queryKey: ['practitioners'],
    queryFn: () => base44.entities.Practitioner.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Practitioner.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practitioners'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Practitioner.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practitioners'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Practitioner.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practitioners'] });
    },
  });

  const handleOpenDialog = (practitioner = null) => {
    if (practitioner) {
      setEditingPractitioner(practitioner);
      setFormData(practitioner);
    } else {
      setEditingPractitioner(null);
      setFormData(emptyPractitioner);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPractitioner(null);
    setFormData(emptyPractitioner);
  };

  const handleSubmit = () => {
    if (editingPractitioner) {
      updateMutation.mutate({ id: editingPractitioner.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const ALL_SPECIALISATIONS = ['ABA','OT','Speech Therapy','LEGO Therapy','Early Intervention','Autism','Complex Behaviour','Manual Handling','Social Skills'];

  const filteredPractitioners = practitioners.filter(p => {
    const matchesSearch = p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesSpec = specialisationFilter === 'all' || (p.specialisations || []).includes(specialisationFilter);
    return matchesSearch && matchesStatus && matchesSpec;
  });

  const getUtilizationColor = (current, capacity) => {
    const rate = capacity > 0 ? (current / capacity) * 100 : 0;
    if (rate >= 90) return 'text-red-600';
    if (rate >= 70) return 'text-amber-600';
    return 'text-teal-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Practitioners</h2>
          <p className="text-slate-500 mt-1">Manage your team of practitioners</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-teal-600 hover:bg-teal-700">
          <UserPlus className="w-4 h-4 mr-2" />
          Add Practitioner
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search practitioners..."
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
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on_leave">On Leave</SelectItem>
            <SelectItem value="probation">Probation</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Practitioners Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPractitioners.map((practitioner) => (
          <div
            key={practitioner.id}
            className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-semibold text-lg">
                  {practitioner.full_name?.charAt(0) || '?'}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{practitioner.full_name}</h3>
                  <p className="text-sm text-slate-500">{practitioner.role}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    window.location.href = createPageUrl('PractitionerDetail') + `?id=${practitioner.id}`;
                  }}>
                    <Users className="w-4 h-4 mr-2" />
                    View Caseload
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleOpenDialog(practitioner)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => deleteMutation.mutate(practitioner.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Badge className={cn("mb-4", statusColors[practitioner.status])}>
              {practitioner.status?.replace(/_/g, ' ')}
            </Badge>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="truncate">{practitioner.email}</span>
              </div>
              {practitioner.phone && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{practitioner.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span className={getUtilizationColor(practitioner.current_caseload, practitioner.caseload_capacity)}>
                  {practitioner.current_caseload || 0} / {practitioner.caseload_capacity || 0} clients
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">
                  {practitioner.billable_hours_actual || 0} / {practitioner.billable_hours_target || 0} hrs
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    getUtilizationColor(practitioner.current_caseload, practitioner.caseload_capacity).replace('text-', 'bg-')
                  )}
                  style={{
                    width: `${Math.min(100, ((practitioner.current_caseload || 0) / (practitioner.caseload_capacity || 1)) * 100)}%`
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPractitioners.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No practitioners found</p>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPractitioner ? 'Edit Practitioner' : 'Add New Practitioner'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 sm:col-span-1">
              <Label>Full Name *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Enter full name"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Phone number"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Behaviour Support Practitioner">Behaviour Support Practitioner</SelectItem>
                  <SelectItem value="Senior Practitioner">Senior Practitioner</SelectItem>
                  <SelectItem value="Practice Lead">Practice Lead</SelectItem>
                  <SelectItem value="Allied Health Assistant">Allied Health Assistant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Registration Number</Label>
              <Input
                value={formData.registration_number}
                onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                placeholder="Registration number"
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
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                  <SelectItem value="probation">Probation</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Caseload Capacity</Label>
              <Input
                type="number"
                value={formData.caseload_capacity}
                onChange={(e) => setFormData({ ...formData, caseload_capacity: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Current Caseload</Label>
              <Input
                type="number"
                value={formData.current_caseload}
                onChange={(e) => setFormData({ ...formData, current_caseload: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Billable Hours Target (Monthly)</Label>
              <Input
                type="number"
                value={formData.billable_hours_target}
                onChange={(e) => setFormData({ ...formData, billable_hours_target: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.full_name || !formData.email}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {editingPractitioner ? 'Update' : 'Create'} Practitioner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}