import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, differenceInDays } from 'date-fns';
import {
  UserCog,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { cn } from '@/lib/utils';

const emptyScreening = {
  staff_id: '',
  staff_name: '',
  screening_type: 'ndis_worker_screening',
  document_number: '',
  issue_date: '',
  expiry_date: '',
  status: 'valid',
  verified_by: '',
  verification_date: '',
  document_url: '',
  notes: ''
};

const typeLabels = {
  ndis_worker_screening: 'NDIS Worker Screening',
  wwcc: 'Working With Children Check',
  police_check: 'Police Check',
  first_aid: 'First Aid Certificate',
  cpr: 'CPR Certificate',
  manual_handling: 'Manual Handling',
  other: 'Other',
};

const statusColors = {
  valid: 'bg-emerald-100 text-emerald-700',
  expiring_soon: 'bg-amber-100 text-amber-700',
  expired: 'bg-red-100 text-red-700',
  pending: 'bg-blue-100 text-blue-700',
};

export default function WorkerScreening() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingScreening, setEditingScreening] = useState(null);
  const [formData, setFormData] = useState(emptyScreening);
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

  const { data: screenings = [] } = useQuery({
    queryKey: ['workerScreenings'],
    queryFn: () => base44.entities.WorkerScreening.list('-expiry_date'),
  });

  const { data: practitioners = [] } = useQuery({
    queryKey: ['practitioners'],
    queryFn: () => base44.entities.Practitioner.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkerScreening.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workerScreenings'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WorkerScreening.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workerScreenings'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WorkerScreening.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workerScreenings'] }),
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

  const handleOpenDialog = (screening = null) => {
    if (screening) { setEditingScreening(screening); setFormData(screening); }
    else { setEditingScreening(null); setFormData(emptyScreening); }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => { setIsDialogOpen(false); setEditingScreening(null); setFormData(emptyScreening); };

  const handleStaffChange = (staffId) => {
    const staff = practitioners.find(p => p.id === staffId);
    setFormData({ ...formData, staff_id: staffId, staff_name: staff?.full_name || '' });
  };

  const handleSubmit = () => {
    // Auto-calculate status based on expiry
    let status = formData.status;
    if (formData.expiry_date) {
      const daysToExpiry = differenceInDays(new Date(formData.expiry_date), new Date());
      if (daysToExpiry < 0) status = 'expired';
      else if (daysToExpiry <= 30) status = 'expiring_soon';
      else status = 'valid';
    }
    
    const dataToSave = { ...formData, status };
    if (editingScreening) updateMutation.mutate({ id: editingScreening.id, data: dataToSave });
    else createMutation.mutate(dataToSave);
  };

  // Stats
  const stats = {
    total: screenings.length,
    expired: screenings.filter(s => {
      const days = s.expiry_date ? differenceInDays(new Date(s.expiry_date), new Date()) : 999;
      return days < 0;
    }).length,
    expiringSoon: screenings.filter(s => {
      const days = s.expiry_date ? differenceInDays(new Date(s.expiry_date), new Date()) : 999;
      return days >= 0 && days <= 30;
    }).length,
    valid: screenings.filter(s => {
      const days = s.expiry_date ? differenceInDays(new Date(s.expiry_date), new Date()) : 999;
      return days > 30;
    }).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UserCog className="w-6 h-6 text-blue-600" />
            Worker Screening Validator
          </h2>
          <p className="text-slate-500 mt-1">Track staff screening and certification expiry dates</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Screening
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-xs text-slate-500">Total Records</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
                <p className="text-xs text-red-700">Expired</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-2xl font-bold text-amber-600">{stats.expiringSoon}</p>
                <p className="text-xs text-amber-700">Expiring Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-2xl font-bold text-emerald-600">{stats.valid}</p>
                <p className="text-xs text-emerald-700">Valid</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead>Screening Type</TableHead>
                <TableHead>Document #</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Days Until Expiry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {screenings.map((screening) => {
                const daysToExpiry = screening.expiry_date ? differenceInDays(new Date(screening.expiry_date), new Date()) : null;
                let calculatedStatus = 'valid';
                if (daysToExpiry !== null) {
                  if (daysToExpiry < 0) calculatedStatus = 'expired';
                  else if (daysToExpiry <= 30) calculatedStatus = 'expiring_soon';
                }
                
                return (
                  <TableRow key={screening.id}>
                    <TableCell className="font-medium">{screening.staff_name || '-'}</TableCell>
                    <TableCell>{typeLabels[screening.screening_type]}</TableCell>
                    <TableCell className="font-mono text-sm">{screening.document_number || '-'}</TableCell>
                    <TableCell>{screening.issue_date ? format(new Date(screening.issue_date), 'MMM d, yyyy') : '-'}</TableCell>
                    <TableCell>{screening.expiry_date ? format(new Date(screening.expiry_date), 'MMM d, yyyy') : '-'}</TableCell>
                    <TableCell>
                      {daysToExpiry !== null && (
                        <span className={cn(
                          "font-medium",
                          daysToExpiry < 0 ? "text-red-600" :
                          daysToExpiry <= 30 ? "text-amber-600" : "text-emerald-600"
                        )}>
                          {daysToExpiry < 0 ? `${Math.abs(daysToExpiry)} days overdue` : `${daysToExpiry} days`}
                        </span>
                      )}
                    </TableCell>
                    <TableCell><Badge className={statusColors[calculatedStatus]}>{calculatedStatus.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(screening)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(screening.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {screenings.length === 0 && (
            <div className="text-center py-12">
              <UserCog className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">No screening records added yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingScreening ? 'Edit Screening' : 'Add Worker Screening'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Staff Member *</Label>
              <Select value={formData.staff_id} onValueChange={handleStaffChange}>
                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>{practitioners.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div>
              <Label>Screening Type *</Label>
              <Select value={formData.screening_type} onValueChange={(v) => setFormData({ ...formData, screening_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ndis_worker_screening">NDIS Worker Screening</SelectItem>
                  <SelectItem value="wwcc">Working With Children Check</SelectItem>
                  <SelectItem value="police_check">Police Check</SelectItem>
                  <SelectItem value="first_aid">First Aid Certificate</SelectItem>
                  <SelectItem value="cpr">CPR Certificate</SelectItem>
                  <SelectItem value="manual_handling">Manual Handling</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Document Number</Label>
              <Input value={formData.document_number} onChange={(e) => setFormData({ ...formData, document_number: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Issue Date</Label>
                <Input type="date" value={formData.issue_date} onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })} />
              </div>
              <div>
                <Label>Expiry Date *</Label>
                <Input type="date" value={formData.expiry_date} onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Verified By</Label>
                <Input value={formData.verified_by} onChange={(e) => setFormData({ ...formData, verified_by: e.target.value })} />
              </div>
              <div>
                <Label>Verification Date</Label>
                <Input type="date" value={formData.verification_date} onChange={(e) => setFormData({ ...formData, verification_date: e.target.value })} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.staff_id || !formData.expiry_date} className="bg-teal-600 hover:bg-teal-700">
              {editingScreening ? 'Update' : 'Save'} Screening
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}