import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ArrowDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { cn } from '@/lib/utils';

const emptyRCA = {
  client_id: '',
  client_name: '',
  incident_date: '',
  analysis_date: format(new Date(), 'yyyy-MM-dd'),
  conducted_by: '',
  problem_statement: '',
  why_1: '',
  why_2: '',
  why_3: '',
  why_4: '',
  why_5: '',
  root_cause: '',
  contributing_factors: '',
  corrective_actions: '',
  preventive_measures: '',
  status: 'open',
  notes: ''
};

const statusColors = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-100 text-slate-700',
};

export default function RootCauseAnalysis() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRCA, setEditingRCA] = useState(null);
  const [formData, setFormData] = useState(emptyRCA);

  const queryClient = useQueryClient();

  const { data: rcas = [] } = useQuery({
    queryKey: ['rcas'],
    queryFn: () => base44.entities.RootCauseAnalysis.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RootCauseAnalysis.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rcas'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RootCauseAnalysis.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rcas'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RootCauseAnalysis.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rcas'] }),
  });

  const handleOpenDialog = (rca = null) => {
    if (rca) { setEditingRCA(rca); setFormData(rca); }
    else { setEditingRCA(null); setFormData(emptyRCA); }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => { setIsDialogOpen(false); setEditingRCA(null); setFormData(emptyRCA); };

  const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    setFormData({ ...formData, client_id: clientId, client_name: client?.full_name || '' });
  };

  const handleSubmit = () => {
    if (editingRCA) updateMutation.mutate({ id: editingRCA.id, data: formData });
    else createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
            Root Cause Analysis (5 Whys)
          </h2>
          <p className="text-slate-500 mt-1">Guided RCA using the 5 Whys framework</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />
          New Analysis
        </Button>
      </div>

      {/* RCA Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rcas.map((rca) => (
          <Card key={rca.id} className="hover:shadow-lg transition-all">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base line-clamp-2">{rca.problem_statement || 'No problem statement'}</CardTitle>
                  <p className="text-sm text-slate-500">{rca.client_name || 'General'}</p>
                </div>
                <Badge className={statusColors[rca.status]}>{rca.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-slate-600 mb-4">
                <p>Date: {rca.analysis_date ? format(new Date(rca.analysis_date), 'MMM d, yyyy') : '-'}</p>
                {rca.root_cause && <p className="mt-2"><span className="font-medium">Root Cause:</span> {rca.root_cause}</p>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleOpenDialog(rca)}>
                  <Edit className="w-3 h-3 mr-1" />
                  View/Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(rca.id)} className="text-red-600">
                  <Trash2 className="w-3 h-3 mr-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {rcas.length === 0 && (
        <Card className="py-12">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No Root Cause Analyses created yet</p>
          </div>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRCA ? 'Edit RCA' : 'New Root Cause Analysis'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Related Client (optional)</Label>
                <Select value={formData.client_id} onValueChange={handleClientChange}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Analysis Date</Label>
                <Input type="date" value={formData.analysis_date} onChange={(e) => setFormData({ ...formData, analysis_date: e.target.value })} />
              </div>
              <div>
                <Label>Incident Date</Label>
                <Input type="date" value={formData.incident_date} onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })} />
              </div>
              <div>
                <Label>Conducted By</Label>
                <Input value={formData.conducted_by} onChange={(e) => setFormData({ ...formData, conducted_by: e.target.value })} />
              </div>
            </div>

            <div>
              <Label>Problem Statement *</Label>
              <Textarea value={formData.problem_statement} onChange={(e) => setFormData({ ...formData, problem_statement: e.target.value })} placeholder="Clearly describe the problem or incident..." rows={3} />
            </div>

            {/* 5 Whys */}
            <div className="bg-orange-50 rounded-xl p-4 space-y-4">
              <h4 className="font-semibold text-orange-900">5 Whys Analysis</h4>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-orange-800">1. Why did this happen?</Label>
                  <Textarea value={formData.why_1} onChange={(e) => setFormData({ ...formData, why_1: e.target.value })} rows={2} className="mt-1" />
                </div>
                {formData.why_1 && (
                  <>
                    <ArrowDown className="w-4 h-4 text-orange-400 mx-auto" />
                    <div>
                      <Label className="text-orange-800">2. Why did that happen?</Label>
                      <Textarea value={formData.why_2} onChange={(e) => setFormData({ ...formData, why_2: e.target.value })} rows={2} className="mt-1" />
                    </div>
                  </>
                )}
                {formData.why_2 && (
                  <>
                    <ArrowDown className="w-4 h-4 text-orange-400 mx-auto" />
                    <div>
                      <Label className="text-orange-800">3. Why did that happen?</Label>
                      <Textarea value={formData.why_3} onChange={(e) => setFormData({ ...formData, why_3: e.target.value })} rows={2} className="mt-1" />
                    </div>
                  </>
                )}
                {formData.why_3 && (
                  <>
                    <ArrowDown className="w-4 h-4 text-orange-400 mx-auto" />
                    <div>
                      <Label className="text-orange-800">4. Why did that happen?</Label>
                      <Textarea value={formData.why_4} onChange={(e) => setFormData({ ...formData, why_4: e.target.value })} rows={2} className="mt-1" />
                    </div>
                  </>
                )}
                {formData.why_4 && (
                  <>
                    <ArrowDown className="w-4 h-4 text-orange-400 mx-auto" />
                    <div>
                      <Label className="text-orange-800">5. Why did that happen? (Root Cause)</Label>
                      <Textarea value={formData.why_5} onChange={(e) => setFormData({ ...formData, why_5: e.target.value })} rows={2} className="mt-1" />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div>
              <Label>Identified Root Cause</Label>
              <Textarea value={formData.root_cause} onChange={(e) => setFormData({ ...formData, root_cause: e.target.value })} placeholder="Summary of the root cause identified..." rows={2} />
            </div>

            <div>
              <Label>Contributing Factors</Label>
              <Textarea value={formData.contributing_factors} onChange={(e) => setFormData({ ...formData, contributing_factors: e.target.value })} placeholder="Other factors that contributed..." rows={2} />
            </div>

            <div>
              <Label>Corrective Actions</Label>
              <Textarea value={formData.corrective_actions} onChange={(e) => setFormData({ ...formData, corrective_actions: e.target.value })} placeholder="Immediate actions to address the root cause..." rows={2} />
            </div>

            <div>
              <Label>Preventive Measures</Label>
              <Textarea value={formData.preventive_measures} onChange={(e) => setFormData({ ...formData, preventive_measures: e.target.value })} placeholder="Measures to prevent recurrence..." rows={2} />
            </div>

            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.problem_statement} className="bg-teal-600 hover:bg-teal-700">
              {editingRCA ? 'Update' : 'Save'} Analysis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}