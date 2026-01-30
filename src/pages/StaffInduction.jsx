import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, differenceInDays } from 'date-fns';
import {
  UserCog,
  Plus,
  Edit,
  CheckCircle,
  Circle,
  User,
  Calendar,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
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
import { cn } from '@/lib/utils';

const emptyInduction = {
  staff_id: '',
  staff_name: '',
  start_date: format(new Date(), 'yyyy-MM-dd'),
  induction_status: 'not_started',
  completion_date: '',
  orientation_complete: false,
  policies_acknowledged: false,
  ndis_training_complete: false,
  pbs_training_complete: false,
  restrictive_practices_training: false,
  documentation_training: false,
  it_systems_setup: false,
  shadowing_complete: false,
  supervisor_id: '',
  supervisor_name: '',
  probation_end_date: '',
  first_review_date: '',
  notes: ''
};

const checklistItems = [
  { key: 'orientation_complete', label: 'Orientation Complete', description: 'Initial office tour and team introductions' },
  { key: 'policies_acknowledged', label: 'Policies Acknowledged', description: 'Read and signed all workplace policies' },
  { key: 'ndis_training_complete', label: 'NDIS Training', description: 'NDIS Worker Orientation Module completed' },
  { key: 'pbs_training_complete', label: 'PBS Training', description: 'Positive Behaviour Support fundamentals' },
  { key: 'restrictive_practices_training', label: 'Restrictive Practices', description: 'Understanding restrictive practices requirements' },
  { key: 'documentation_training', label: 'Documentation Training', description: 'Case notes, reports, and system training' },
  { key: 'it_systems_setup', label: 'IT Systems Setup', description: 'Email, software access, credentials' },
  { key: 'shadowing_complete', label: 'Shadowing Complete', description: 'Completed minimum shadowing hours' },
];

const statusColors = {
  not_started: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
};

export default function StaffInduction() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInduction, setEditingInduction] = useState(null);
  const [formData, setFormData] = useState(emptyInduction);
  const [userRole, setUserRole] = useState('user');

  useEffect(() => {
    const checkRole = async () => {
      try {
        const user = await base44.auth.me();
        setUserRole(user.role || 'user');
      } catch (e) {}
    };
    checkRole();
  }, []);

  const queryClient = useQueryClient();

  const { data: inductions = [] } = useQuery({
    queryKey: ['staffInductions'],
    queryFn: () => base44.entities.StaffInduction.list('-created_date'),
  });

  const { data: practitioners = [] } = useQuery({
    queryKey: ['practitioners'],
    queryFn: () => base44.entities.Practitioner.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.StaffInduction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffInductions'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StaffInduction.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffInductions'] });
      handleCloseDialog();
    },
  });

  // Check if user is manager
  if (userRole !== 'admin') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <UserCog className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-900">Access Restricted</h3>
          <p className="text-slate-500">This page is only accessible to Managers.</p>
        </div>
      </div>
    );
  }

  const calculateProgress = (induction) => {
    const completed = checklistItems.filter(item => induction[item.key]).length;
    return Math.round((completed / checklistItems.length) * 100);
  };

  const handleOpenDialog = (induction = null) => {
    if (induction) { setEditingInduction(induction); setFormData(induction); }
    else { setEditingInduction(null); setFormData(emptyInduction); }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => { setIsDialogOpen(false); setEditingInduction(null); setFormData(emptyInduction); };

  const handleStaffChange = (staffId) => {
    const staff = practitioners.find(p => p.id === staffId);
    setFormData({ ...formData, staff_id: staffId, staff_name: staff?.full_name || '' });
  };

  const handleSupervisorChange = (supervisorId) => {
    const supervisor = practitioners.find(p => p.id === supervisorId);
    setFormData({ ...formData, supervisor_id: supervisorId, supervisor_name: supervisor?.full_name || '' });
  };

  const handleChecklistChange = (key, checked) => {
    const updated = { ...formData, [key]: checked };
    const completed = checklistItems.filter(item => updated[item.key]).length;
    const status = completed === 0 ? 'not_started' : completed === checklistItems.length ? 'completed' : 'in_progress';
    setFormData({ ...updated, induction_status: status });
  };

  const handleSubmit = () => {
    if (editingInduction) updateMutation.mutate({ id: editingInduction.id, data: formData });
    else createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UserCog className="w-6 h-6 text-indigo-600" />
            Staff Induction Planner
          </h2>
          <p className="text-slate-500 mt-1">Checklist and resource hub for new hires</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />
          New Induction
        </Button>
      </div>

      {/* Induction Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {inductions.map((induction) => {
          const progress = calculateProgress(induction);
          const daysSinceStart = induction.start_date ? differenceInDays(new Date(), new Date(induction.start_date)) : 0;
          
          return (
            <Card key={induction.id} className="hover:shadow-lg transition-all">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                      <User className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">{induction.staff_name || 'Unknown'}</h4>
                      <p className="text-xs text-slate-500">Day {daysSinceStart}</p>
                    </div>
                  </div>
                  <Badge className={statusColors[induction.induction_status]}>{induction.induction_status?.replace(/_/g, ' ')}</Badge>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-500">Progress</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                <div className="text-sm text-slate-600 space-y-1 mb-4">
                  <p>Supervisor: {induction.supervisor_name || '-'}</p>
                  <p>Started: {induction.start_date ? format(new Date(induction.start_date), 'MMM d, yyyy') : '-'}</p>
                </div>

                <Button variant="outline" size="sm" onClick={() => handleOpenDialog(induction)} className="w-full">
                  <Edit className="w-3 h-3 mr-1" />
                  View/Edit Checklist
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {inductions.length === 0 && (
        <Card className="py-12">
          <div className="text-center">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No staff inductions in progress</p>
          </div>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingInduction ? 'Edit Induction' : 'New Staff Induction'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Staff Member *</Label>
                <Select value={formData.staff_id} onValueChange={handleStaffChange}>
                  <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent>{practitioners.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Supervisor</Label>
                <Select value={formData.supervisor_id} onValueChange={handleSupervisorChange}>
                  <SelectTrigger><SelectValue placeholder="Select supervisor" /></SelectTrigger>
                  <SelectContent>{practitioners.filter(p => p.role === 'Senior Practitioner' || p.role === 'Practice Lead').map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
              </div>
              <div>
                <Label>Probation End Date</Label>
                <Input type="date" value={formData.probation_end_date} onChange={(e) => setFormData({ ...formData, probation_end_date: e.target.value })} />
              </div>
            </div>

            {/* Induction Checklist */}
            <div className="bg-indigo-50 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-indigo-900">Induction Checklist</h4>
                <Badge className={statusColors[formData.induction_status]}>{formData.induction_status?.replace(/_/g, ' ')}</Badge>
              </div>

              <div className="space-y-3">
                {checklistItems.map((item) => (
                  <div key={item.key} className="flex items-start gap-3 bg-white rounded-lg p-3 border border-indigo-200">
                    <Checkbox
                      id={item.key}
                      checked={formData[item.key] || false}
                      onCheckedChange={(checked) => handleChecklistChange(item.key, checked)}
                    />
                    <div className="flex-1">
                      <label htmlFor={item.key} className="font-medium text-slate-900 text-sm cursor-pointer">{item.label}</label>
                      <p className="text-xs text-slate-500">{item.description}</p>
                    </div>
                    {formData[item.key] ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>First Review Date</Label>
              <Input type="date" value={formData.first_review_date} onChange={(e) => setFormData({ ...formData, first_review_date: e.target.value })} />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional notes..." rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.staff_id} className="bg-teal-600 hover:bg-teal-700">
              {editingInduction ? 'Update' : 'Save'} Induction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}