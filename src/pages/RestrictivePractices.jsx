import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, differenceInDays } from 'date-fns';
import {
  Lock,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
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

const emptyPractice = {
  client_id: '',
  client_name: '',
  bsp_id: '',
  practice_type: 'environmental_restraint',
  description: '',
  authorisation_status: 'unauthorised',
  authorised_by: '',
  authorisation_date: '',
  expiry_date: '',
  rationale: '',
  safeguards: '',
  reduction_plan: '',
  consent_obtained: false,
  ndis_notified: false,
  ndis_notification_date: '',
  review_frequency: 'monthly',
  last_review_date: '',
  notes: ''
};

const statusConfig = {
  unauthorised: { label: 'Unauthorised', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  pending_authorisation: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  authorised: { label: 'Authorised', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  expired: { label: 'Expired', color: 'bg-slate-100 text-slate-700', icon: AlertTriangle },
};

const typeLabels = {
  seclusion: 'Seclusion',
  physical_restraint: 'Physical Restraint',
  mechanical_restraint: 'Mechanical Restraint',
  chemical_restraint: 'Chemical Restraint',
  environmental_restraint: 'Environmental Restraint',
};

export default function RestrictivePractices() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPractice, setEditingPractice] = useState(null);
  const [formData, setFormData] = useState(emptyPractice);
  const [statusFilter, setStatusFilter] = useState('all');

  const queryClient = useQueryClient();

  const { data: practices = [] } = useQuery({
    queryKey: ['restrictivePractices'],
    queryFn: () => base44.entities.RestrictivePractice.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: bsps = [] } = useQuery({
    queryKey: ['bsps'],
    queryFn: () => base44.entities.BehaviourSupportPlan.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RestrictivePractice.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restrictivePractices'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RestrictivePractice.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restrictivePractices'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RestrictivePractice.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['restrictivePractices'] }),
  });

  const handleOpenDialog = (practice = null) => {
    if (practice) { setEditingPractice(practice); setFormData(practice); }
    else { setEditingPractice(null); setFormData(emptyPractice); }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => { setIsDialogOpen(false); setEditingPractice(null); setFormData(emptyPractice); };

  const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    setFormData({ ...formData, client_id: clientId, client_name: client?.full_name || '' });
  };

  const handleSubmit = () => {
    if (editingPractice) updateMutation.mutate({ id: editingPractice.id, data: formData });
    else createMutation.mutate(formData);
  };

  const filteredPractices = statusFilter === 'all' ? practices : practices.filter(p => p.authorisation_status === statusFilter);

  // Stats
  const stats = {
    total: practices.length,
    unauthorised: practices.filter(p => p.authorisation_status === 'unauthorised').length,
    authorised: practices.filter(p => p.authorisation_status === 'authorised').length,
    pending: practices.filter(p => p.authorisation_status === 'pending_authorisation').length,
  };

  const clientBSPs = bsps.filter(b => b.client_id === formData.client_id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-6 h-6 text-red-600" />
            Restrictive Practice Protocol
          </h2>
          <p className="text-slate-500 mt-1">Compliance registry for regulated restrictive practices</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />
          Log Practice
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs text-slate-500">Total Logged</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.unauthorised}</p>
                <p className="text-xs text-red-700">Unauthorised</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                <p className="text-xs text-slate-500">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{stats.authorised}</p>
                <p className="text-xs text-slate-500">Authorised</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="unauthorised">Unauthorised</SelectItem>
            <SelectItem value="pending_authorisation">Pending</SelectItem>
            <SelectItem value="authorised">Authorised</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Practice Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>NDIS Notified</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPractices.map((practice) => {
                const status = statusConfig[practice.authorisation_status] || statusConfig.unauthorised;
                const StatusIcon = status.icon;
                const daysToExpiry = practice.expiry_date ? differenceInDays(new Date(practice.expiry_date), new Date()) : null;
                
                return (
                  <TableRow key={practice.id}>
                    <TableCell className="font-medium">{practice.client_name || '-'}</TableCell>
                    <TableCell>{typeLabels[practice.practice_type]}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{practice.description}</TableCell>
                    <TableCell>
                      <Badge className={status.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {daysToExpiry !== null && (
                        <span className={cn("text-sm", daysToExpiry <= 30 ? "text-red-600 font-medium" : "text-slate-600")}>
                          {daysToExpiry} days
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {practice.ndis_notified ? (
                        <Badge className="bg-emerald-100 text-emerald-700">Yes</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(practice)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(practice.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filteredPractices.length === 0 && (
            <div className="text-center py-12">
              <Lock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">No restrictive practices logged</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPractice ? 'Edit Practice' : 'Log Restrictive Practice'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Client *</Label>
                <Select value={formData.client_id} onValueChange={handleClientChange}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Practice Type *</Label>
                <Select value={formData.practice_type} onValueChange={(v) => setFormData({ ...formData, practice_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seclusion">Seclusion</SelectItem>
                    <SelectItem value="physical_restraint">Physical Restraint</SelectItem>
                    <SelectItem value="mechanical_restraint">Mechanical Restraint</SelectItem>
                    <SelectItem value="chemical_restraint">Chemical Restraint</SelectItem>
                    <SelectItem value="environmental_restraint">Environmental Restraint</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Description *</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Detailed description of the practice..." rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Authorisation Status</Label>
                <Select value={formData.authorisation_status} onValueChange={(v) => setFormData({ ...formData, authorisation_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unauthorised">Unauthorised</SelectItem>
                    <SelectItem value="pending_authorisation">Pending Authorisation</SelectItem>
                    <SelectItem value="authorised">Authorised</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Authorised By</Label>
                <Input value={formData.authorised_by} onChange={(e) => setFormData({ ...formData, authorised_by: e.target.value })} />
              </div>
              <div>
                <Label>Authorisation Date</Label>
                <Input type="date" value={formData.authorisation_date} onChange={(e) => setFormData({ ...formData, authorisation_date: e.target.value })} />
              </div>
              <div>
                <Label>Expiry Date</Label>
                <Input type="date" value={formData.expiry_date} onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })} />
              </div>
            </div>

            <div>
              <Label>Rationale & Evidence</Label>
              <Textarea value={formData.rationale} onChange={(e) => setFormData({ ...formData, rationale: e.target.value })} placeholder="Clinical rationale..." rows={2} />
            </div>

            <div>
              <Label>Safeguards</Label>
              <Textarea value={formData.safeguards} onChange={(e) => setFormData({ ...formData, safeguards: e.target.value })} placeholder="Safeguards in place..." rows={2} />
            </div>

            <div>
              <Label>Reduction/Elimination Plan</Label>
              <Textarea value={formData.reduction_plan} onChange={(e) => setFormData({ ...formData, reduction_plan: e.target.value })} placeholder="Plan to reduce or eliminate..." rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={formData.consent_obtained} onCheckedChange={(v) => setFormData({ ...formData, consent_obtained: v })} />
                <Label>Consent Obtained</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formData.ndis_notified} onCheckedChange={(v) => setFormData({ ...formData, ndis_notified: v })} />
                <Label>NDIS Commission Notified</Label>
              </div>
            </div>

            {formData.ndis_notified && (
              <div>
                <Label>NDIS Notification Date</Label>
                <Input type="date" value={formData.ndis_notification_date} onChange={(e) => setFormData({ ...formData, ndis_notification_date: e.target.value })} />
              </div>
            )}

            <div>
              <Label>Review Frequency</Label>
              <Select value={formData.review_frequency} onValueChange={(v) => setFormData({ ...formData, review_frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="six_monthly">Six Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.client_id || !formData.description} className="bg-teal-600 hover:bg-teal-700">
              {editingPractice ? 'Update' : 'Save'} Practice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}