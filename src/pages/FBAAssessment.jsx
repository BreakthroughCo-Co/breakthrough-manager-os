import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  FileSearch,
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Save,
  User
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const emptyFBA = {
  client_id: '',
  client_name: '',
  assessment_date: format(new Date(), 'yyyy-MM-dd'),
  assessor_id: '',
  assessor_name: '',
  status: 'draft',
  referral_reason: '',
  background_history: '',
  current_supports: '',
  target_behaviours: '',
  setting_events: '',
  antecedents: '',
  consequences: '',
  hypothesised_function: '',
  function_evidence: '',
  replacement_behaviours: '',
  recommendations: '',
  notes: ''
};

const statusColors = {
  draft: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  reviewed: 'bg-purple-100 text-purple-700',
};

const steps = [
  { id: 1, title: 'Client & Referral', fields: ['client_id', 'referral_reason'] },
  { id: 2, title: 'Background History', fields: ['background_history', 'current_supports'] },
  { id: 3, title: 'Target Behaviours', fields: ['target_behaviours', 'setting_events'] },
  { id: 4, title: 'ABC Analysis', fields: ['antecedents', 'consequences'] },
  { id: 5, title: 'Function & Recommendations', fields: ['hypothesised_function', 'function_evidence', 'replacement_behaviours', 'recommendations'] },
];

export default function FBAAssessment() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFBA, setEditingFBA] = useState(null);
  const [formData, setFormData] = useState(emptyFBA);
  const [currentStep, setCurrentStep] = useState(1);

  const queryClient = useQueryClient();

  const { data: fbas = [], isLoading } = useQuery({
    queryKey: ['fbas'],
    queryFn: () => base44.entities.FunctionalBehaviourAssessment.list('-created_date'),
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
    mutationFn: (data) => base44.entities.FunctionalBehaviourAssessment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fbas'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FunctionalBehaviourAssessment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fbas'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FunctionalBehaviourAssessment.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fbas'] }),
  });

  const handleOpenDialog = (fba = null) => {
    if (fba) {
      setEditingFBA(fba);
      setFormData(fba);
    } else {
      setEditingFBA(null);
      setFormData(emptyFBA);
    }
    setCurrentStep(1);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingFBA(null);
    setFormData(emptyFBA);
    setCurrentStep(1);
  };

  const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    setFormData({ ...formData, client_id: clientId, client_name: client?.full_name || '' });
  };

  const handlePractitionerChange = (practitionerId) => {
    const practitioner = practitioners.find(p => p.id === practitionerId);
    setFormData({ ...formData, assessor_id: practitionerId, assessor_name: practitioner?.full_name || '' });
  };

  const handleSubmit = () => {
    if (editingFBA) {
      updateMutation.mutate({ id: editingFBA.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label>Client *</Label>
              <Select value={formData.client_id} onValueChange={handleClientChange}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assessor</Label>
              <Select value={formData.assessor_id} onValueChange={handlePractitionerChange}>
                <SelectTrigger><SelectValue placeholder="Select assessor" /></SelectTrigger>
                <SelectContent>
                  {practitioners.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assessment Date</Label>
              <Input type="date" value={formData.assessment_date} onChange={(e) => setFormData({ ...formData, assessment_date: e.target.value })} />
            </div>
            <div>
              <Label>Reason for Referral *</Label>
              <Textarea value={formData.referral_reason} onChange={(e) => setFormData({ ...formData, referral_reason: e.target.value })} placeholder="Why was this assessment requested?" rows={4} />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div>
              <Label>Background & Developmental History</Label>
              <Textarea value={formData.background_history} onChange={(e) => setFormData({ ...formData, background_history: e.target.value })} placeholder="Medical history, developmental milestones, previous interventions..." rows={6} />
            </div>
            <div>
              <Label>Current Support Arrangements</Label>
              <Textarea value={formData.current_supports} onChange={(e) => setFormData({ ...formData, current_supports: e.target.value })} placeholder="Current services, supports, and stakeholders..." rows={4} />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <div>
              <Label>Target Behaviours</Label>
              <Textarea value={formData.target_behaviours} onChange={(e) => setFormData({ ...formData, target_behaviours: e.target.value })} placeholder="Describe each target behaviour in operational terms..." rows={6} />
            </div>
            <div>
              <Label>Setting Events</Label>
              <Textarea value={formData.setting_events} onChange={(e) => setFormData({ ...formData, setting_events: e.target.value })} placeholder="Environmental and biological factors that increase likelihood..." rows={4} />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <div>
              <Label>Common Antecedents/Triggers</Label>
              <Textarea value={formData.antecedents} onChange={(e) => setFormData({ ...formData, antecedents: e.target.value })} placeholder="What typically happens immediately before the behaviour?" rows={5} />
            </div>
            <div>
              <Label>Typical Consequences</Label>
              <Textarea value={formData.consequences} onChange={(e) => setFormData({ ...formData, consequences: e.target.value })} placeholder="What typically happens immediately after the behaviour?" rows={5} />
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-4">
            <div>
              <Label>Hypothesised Function</Label>
              <Select value={formData.hypothesised_function} onValueChange={(v) => setFormData({ ...formData, hypothesised_function: v })}>
                <SelectTrigger><SelectValue placeholder="Select function" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="escape_avoidance">Escape/Avoidance</SelectItem>
                  <SelectItem value="attention">Attention</SelectItem>
                  <SelectItem value="tangible">Access to Tangibles</SelectItem>
                  <SelectItem value="sensory">Sensory/Automatic</SelectItem>
                  <SelectItem value="multiple">Multiple Functions</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Evidence Supporting Hypothesis</Label>
              <Textarea value={formData.function_evidence} onChange={(e) => setFormData({ ...formData, function_evidence: e.target.value })} placeholder="What evidence supports this hypothesised function?" rows={3} />
            </div>
            <div>
              <Label>Replacement Behaviours</Label>
              <Textarea value={formData.replacement_behaviours} onChange={(e) => setFormData({ ...formData, replacement_behaviours: e.target.value })} placeholder="Functionally equivalent replacement behaviours..." rows={3} />
            </div>
            <div>
              <Label>Recommendations</Label>
              <Textarea value={formData.recommendations} onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })} placeholder="Key recommendations for intervention..." rows={4} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileSearch className="w-6 h-6 text-blue-600" />
            Functional Behaviour Assessment
          </h2>
          <p className="text-slate-500 mt-1">Multi-step FBA forms for comprehensive assessment</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />
          New FBA
        </Button>
      </div>

      {/* FBA List */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Assessor</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Function</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fbas.map((fba) => (
                <TableRow key={fba.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-slate-400" />
                      </div>
                      <span className="font-medium">{fba.client_name || 'Unknown'}</span>
                    </div>
                  </TableCell>
                  <TableCell>{fba.assessor_name || '-'}</TableCell>
                  <TableCell>{fba.assessment_date ? format(new Date(fba.assessment_date), 'MMM d, yyyy') : '-'}</TableCell>
                  <TableCell className="capitalize">{fba.hypothesised_function?.replace(/_/g, ' ') || '-'}</TableCell>
                  <TableCell><Badge className={statusColors[fba.status]}>{fba.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(fba)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(fba.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {fbas.length === 0 && (
            <div className="text-center py-12">
              <FileSearch className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">No FBAs created yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Multi-Step Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFBA ? 'Edit FBA' : 'New Functional Behaviour Assessment'}</DialogTitle>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center justify-between mb-6">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => setCurrentStep(step.id)}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    currentStep === step.id ? "bg-teal-600 text-white" : currentStep > step.id ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-500"
                  )}
                >
                  {step.id}
                </button>
                {idx < steps.length - 1 && <div className={cn("w-8 h-0.5 mx-1", currentStep > step.id ? "bg-teal-300" : "bg-slate-200")} />}
              </div>
            ))}
          </div>

          <p className="text-sm font-medium text-slate-700 mb-4">Step {currentStep}: {steps[currentStep - 1].title}</p>

          {renderStepContent()}

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : handleCloseDialog()}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              {currentStep > 1 ? 'Previous' : 'Cancel'}
            </Button>
            {currentStep < 5 ? (
              <Button onClick={() => setCurrentStep(currentStep + 1)} className="bg-teal-600 hover:bg-teal-700">
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!formData.client_id} className="bg-teal-600 hover:bg-teal-700">
                <Save className="w-4 h-4 mr-1" />
                {editingFBA ? 'Update' : 'Save'} FBA
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}