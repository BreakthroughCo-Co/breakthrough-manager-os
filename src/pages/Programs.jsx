import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Plus,
  Search,
  Boxes,
  Users,
  Calendar,
  DollarSign,
  Edit,
  Trash2,
  Play,
  Pause,
  CheckCircle
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const emptyProgram = {
  name: '',
  type: 'LEGO Therapy',
  description: '',
  status: 'planning',
  lead_practitioner_id: '',
  lead_practitioner_name: '',
  max_participants: 8,
  current_participants: 0,
  session_frequency: 'Weekly',
  start_date: '',
  end_date: '',
  revenue_target: 0,
  revenue_actual: 0,
  notes: ''
};

const statusConfig = {
  planning: { label: 'Planning', color: 'bg-blue-100 text-blue-700', icon: Calendar },
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700', icon: Play },
  paused: { label: 'Paused', color: 'bg-amber-100 text-amber-700', icon: Pause },
  completed: { label: 'Completed', color: 'bg-slate-100 text-slate-700', icon: CheckCircle },
};

const typeColors = {
  'LEGO Therapy': 'bg-yellow-100 text-yellow-800',
  'Social Skills Group': 'bg-purple-100 text-purple-800',
  'Behaviour Support': 'bg-teal-100 text-teal-800',
  'Parent Training': 'bg-pink-100 text-pink-800',
  'School Consultation': 'bg-blue-100 text-blue-800',
  'Other': 'bg-slate-100 text-slate-800',
};

const programTypes = [
  'LEGO Therapy',
  'Social Skills Group',
  'Behaviour Support',
  'Parent Training',
  'School Consultation',
  'Other'
];

export default function Programs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [formData, setFormData] = useState(emptyProgram);

  const queryClient = useQueryClient();

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ['programs'],
    queryFn: () => base44.entities.Program.list(),
  });

  const { data: practitioners = [] } = useQuery({
    queryKey: ['practitioners'],
    queryFn: () => base44.entities.Practitioner.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Program.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Program.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Program.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
    },
  });

  const handleOpenDialog = (program = null) => {
    if (program) {
      setEditingProgram(program);
      setFormData(program);
    } else {
      setEditingProgram(null);
      setFormData(emptyProgram);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProgram(null);
    setFormData(emptyProgram);
  };

  const handlePractitionerChange = (practitionerId) => {
    const practitioner = practitioners.find(p => p.id === practitionerId);
    setFormData({
      ...formData,
      lead_practitioner_id: practitionerId,
      lead_practitioner_name: practitioner?.full_name || ''
    });
  };

  const handleSubmit = () => {
    if (editingProgram) {
      updateMutation.mutate({ id: editingProgram.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredPrograms = programs.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Programs</h2>
          <p className="text-slate-500 mt-1">Manage group programs and initiatives</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />
          New Program
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search programs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Programs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPrograms.map((program) => {
          const status = statusConfig[program.status] || statusConfig.planning;
          const StatusIcon = status.icon;
          const participantPercent = program.max_participants > 0 
            ? (program.current_participants / program.max_participants) * 100 
            : 0;
          const revenuePercent = program.revenue_target > 0 
            ? (program.revenue_actual / program.revenue_target) * 100 
            : 0;
          
          return (
            <div
              key={program.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <Badge className={typeColors[program.type]}>{program.type}</Badge>
                    <h3 className="font-semibold text-slate-900 mt-2">{program.name}</h3>
                  </div>
                  <Badge className={status.color}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {status.label}
                  </Badge>
                </div>

                {program.description && (
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">{program.description}</p>
                )}

                <div className="space-y-4">
                  {/* Participants */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Participants
                      </span>
                      <span className="font-medium">
                        {program.current_participants || 0} / {program.max_participants || 0}
                      </span>
                    </div>
                    <Progress value={participantPercent} className="h-1.5" />
                  </div>

                  {/* Revenue */}
                  {program.revenue_target > 0 && (
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-500 flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          Revenue
                        </span>
                        <span className="font-medium">
                          ${(program.revenue_actual || 0).toLocaleString()} / ${program.revenue_target.toLocaleString()}
                        </span>
                      </div>
                      <Progress value={revenuePercent} className="h-1.5 [&>div]:bg-purple-500" />
                    </div>
                  )}

                  {/* Meta Info */}
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    {program.lead_practitioner_name && (
                      <span>Lead: {program.lead_practitioner_name}</span>
                    )}
                    {program.session_frequency && (
                      <span>{program.session_frequency}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 px-6 py-3 bg-slate-50 flex justify-between items-center">
                {program.start_date && (
                  <span className="text-xs text-slate-500">
                    {format(new Date(program.start_date), 'MMM d')} 
                    {program.end_date && ` - ${format(new Date(program.end_date), 'MMM d, yyyy')}`}
                  </span>
                )}
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(program)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(program.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredPrograms.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <Boxes className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No programs found</p>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProgram ? 'Edit Program' : 'Create New Program'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2">
              <Label>Program Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter program name"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Program Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {programTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Program description..."
                rows={2}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Lead Practitioner</Label>
              <Select
                value={formData.lead_practitioner_id}
                onValueChange={handlePractitionerChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select practitioner" />
                </SelectTrigger>
                <SelectContent>
                  {practitioners.filter(p => p.status === 'active').map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Session Frequency</Label>
              <Select
                value={formData.session_frequency}
                onValueChange={(value) => setFormData({ ...formData, session_frequency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Fortnightly">Fortnightly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Ad-hoc">Ad-hoc</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Max Participants</Label>
              <Input
                type="number"
                value={formData.max_participants}
                onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Current Participants</Label>
              <Input
                type="number"
                value={formData.current_participants}
                onChange={(e) => setFormData({ ...formData, current_participants: parseInt(e.target.value) || 0 })}
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
            <div className="col-span-2 sm:col-span-1">
              <Label>End Date</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Revenue Target ($)</Label>
              <Input
                type="number"
                value={formData.revenue_target}
                onChange={(e) => setFormData({ ...formData, revenue_target: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Revenue Actual ($)</Label>
              <Input
                type="number"
                value={formData.revenue_actual}
                onChange={(e) => setFormData({ ...formData, revenue_actual: parseFloat(e.target.value) || 0 })}
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
              disabled={!formData.name}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {editingProgram ? 'Update' : 'Create'} Program
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}