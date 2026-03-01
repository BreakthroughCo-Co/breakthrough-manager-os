import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CaseNoteSchema, validateEntity } from '@/components/schemas/ndisEntities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Sparkles,
  Loader2,
  Copy,
  Check,
  User,
  DollarSign
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
  DialogDescription,
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

const emptyNote = {
  client_id: '',
  client_name: '',
  practitioner_id: '',
  practitioner_name: '',
  session_date: format(new Date(), 'yyyy-MM-dd'),
  session_type: 'direct_support',
  duration_minutes: 60,
  location: '',
  subjective: '',
  objective: '',
  assessment: '',
  plan: '',
  refined_note: '',
  goals_addressed: '',
  progress_rating: 'progressing',
  status: 'draft',
  notes: ''
};

const progressColors = {
  regression: 'bg-red-100 text-red-700',
  no_change: 'bg-slate-100 text-slate-700',
  emerging: 'bg-amber-100 text-amber-700',
  progressing: 'bg-blue-100 text-blue-700',
  achieved: 'bg-emerald-100 text-emerald-700',
};

export default function CaseNotes() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [formData, setFormData] = useState(emptyNote);
  const [isRefining, setIsRefining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(null);
  const [billingPrompt, setBillingPrompt] = useState(null); // note id after completion

  const queryClient = useQueryClient();

  const { data: notes = [] } = useQuery({
    queryKey: ['caseNotes'],
    queryFn: () => base44.entities.CaseNote.list('-session_date'),
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
    mutationFn: (data) => base44.entities.CaseNote.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caseNotes'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CaseNote.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caseNotes'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CaseNote.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['caseNotes'] }),
  });

  const handleOpenDialog = (note = null) => {
    if (note) { setEditingNote(note); setFormData(note); }
    else { setEditingNote(null); setFormData(emptyNote); }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => { setIsDialogOpen(false); setEditingNote(null); setFormData(emptyNote); };

  const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    setFormData({ ...formData, client_id: clientId, client_name: client?.full_name || '' });
  };

  const handlePractitionerChange = (practitionerId) => {
    const practitioner = practitioners.find(p => p.id === practitionerId);
    setFormData({ ...formData, practitioner_id: practitionerId, practitioner_name: practitioner?.full_name || '' });
  };

  const handleRefineWithAI = async () => {
    if (!formData.subjective && !formData.objective && !formData.assessment && !formData.plan) return;

    setIsRefining(true);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an NDIS Behaviour Support Practitioner writing professional, audit-proof case notes.

Refine the following SOAP note into professional, objective clinical language suitable for NDIS documentation:

SUBJECTIVE (Client/carer reported):
${formData.subjective || 'Not provided'}

OBJECTIVE (Observable data):
${formData.objective || 'Not provided'}

ASSESSMENT (Clinical interpretation):
${formData.assessment || 'Not provided'}

PLAN (Next steps):
${formData.plan || 'Not provided'}

Session Type: ${formData.session_type}
Duration: ${formData.duration_minutes} minutes
Progress Rating: ${formData.progress_rating}

Rules:
- Use objective, measurable language
- Remove subjective opinions
- Use third person
- Be concise but comprehensive
- Include relevant clinical terminology
- Ensure NDIS compliance

Output a single cohesive professional case note.`
      });

      setFormData(prev => ({ ...prev, refined_note: result }));
    } catch (error) {
      console.error('Refinement failed:', error);
    } finally {
      setIsRefining(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(formData.refined_note);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSummarize = async (noteId) => {
    setIsSummarizing(noteId);
    try {
      await base44.functions.invoke('summarizeCaseNote', { case_note_id: noteId });
      queryClient.invalidateQueries({ queryKey: ['caseNotes'] });
    } catch (error) {
      alert('Failed to summarize: ' + error.message);
    } finally {
      setIsSummarizing(null);
    }
  };

  const handleCreateBillingRecord = async (note) => {
    await base44.entities.BillingRecord.create({
      client_id: note.client_id,
      client_name: note.client_name,
      practitioner_id: note.practitioner_id,
      practitioner_name: note.practitioner_name,
      service_date: note.session_date,
      service_type: note.session_type === 'direct_support' ? 'Direct Support' :
                    note.session_type === 'assessment' ? 'Assessment' :
                    note.session_type === 'plan_development' ? 'Plan Development' :
                    note.session_type === 'review' ? 'Plan Review' : 'Direct Support',
      duration_hours: parseFloat(((note.duration_minutes || 60) / 60).toFixed(2)),
      status: 'draft',
      notes: `Auto-created from Case Note (${note.session_date})`,
    });
    setBillingPrompt(null);
    queryClient.invalidateQueries({ queryKey: ['billing'] });
  };

  const handleSubmit = () => {
    const isCompletingNote = formData.status === 'completed' && (!editingNote || editingNote.status !== 'completed');
    if (editingNote) {
      updateMutation.mutate({ id: editingNote.id, data: formData });
      if (isCompletingNote) setBillingPrompt({ ...formData, id: editingNote.id });
    } else {
      createMutation.mutate(formData, {
        onSuccess: (created) => {
          if (isCompletingNote) setBillingPrompt({ ...formData, id: created.id });
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Audit-Proof Case Note Writer
          </h2>
          <p className="text-slate-500 mt-1">SOAP format with AI refinement</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />
          New Note
        </Button>
      </div>

      {/* Notes Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Practitioner</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notes.map((note) => (
                <TableRow key={note.id}>
                  <TableCell className="font-medium">{note.session_date ? format(new Date(note.session_date), 'MMM d, yyyy') : '-'}</TableCell>
                  <TableCell>{note.client_name || '-'}</TableCell>
                  <TableCell>{note.practitioner_name || '-'}</TableCell>
                  <TableCell className="capitalize">{note.session_type?.replace(/_/g, ' ')}</TableCell>
                  <TableCell>{note.duration_minutes}min</TableCell>
                  <TableCell><Badge className={progressColors[note.progress_rating]}>{note.progress_rating?.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell className="capitalize">{note.status}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(note)}><Edit className="w-4 h-4" /></Button>
                      {!note.ai_summary && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSummarize(note.id)}
                          disabled={isSummarizing === note.id}
                          title="Generate AI Summary"
                        >
                          {isSummarizing === note.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(note.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {notes.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">No case notes created yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing Auto-Prompt Dialog */}
      <Dialog open={!!billingPrompt} onOpenChange={() => setBillingPrompt(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-teal-600" />
              Create Billing Record?
            </DialogTitle>
            <DialogDescription>
              This case note has been marked as <strong>completed</strong>. Would you like to generate a draft billing record pre-filled with session details?
            </DialogDescription>
          </DialogHeader>
          {billingPrompt && (
            <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
              <p><span className="font-medium">Client:</span> {billingPrompt.client_name}</p>
              <p><span className="font-medium">Practitioner:</span> {billingPrompt.practitioner_name}</p>
              <p><span className="font-medium">Date:</span> {billingPrompt.session_date}</p>
              <p><span className="font-medium">Duration:</span> {((billingPrompt.duration_minutes || 60) / 60).toFixed(2)} hrs</p>
              <p><span className="font-medium">Type:</span> {billingPrompt.session_type?.replace(/_/g, ' ')}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBillingPrompt(null)}>Skip</Button>
            <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => handleCreateBillingRecord(billingPrompt)}>
              <DollarSign className="w-4 h-4 mr-2" />
              Create Draft Billing Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Case Note Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingNote ? 'Edit Case Note' : 'New Case Note'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>Client *</Label>
                <Select value={formData.client_id} onValueChange={handleClientChange}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Practitioner *</Label>
                <Select value={formData.practitioner_id} onValueChange={handlePractitionerChange}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{practitioners.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Session Date</Label>
                <Input type="date" value={formData.session_date} onChange={(e) => setFormData({ ...formData, session_date: e.target.value })} />
              </div>
              <div>
                <Label>Duration (min)</Label>
                <Input type="number" value={formData.duration_minutes} onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Session Type</Label>
                <Select value={formData.session_type} onValueChange={(v) => setFormData({ ...formData, session_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct_support">Direct Support</SelectItem>
                    <SelectItem value="assessment">Assessment</SelectItem>
                    <SelectItem value="plan_development">Plan Development</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="consultation">Consultation</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Location</Label>
                <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="Home, school, etc." />
              </div>
              <div>
                <Label>Progress Rating</Label>
                <Select value={formData.progress_rating} onValueChange={(v) => setFormData({ ...formData, progress_rating: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regression">Regression</SelectItem>
                    <SelectItem value="no_change">No Change</SelectItem>
                    <SelectItem value="emerging">Emerging</SelectItem>
                    <SelectItem value="progressing">Progressing</SelectItem>
                    <SelectItem value="achieved">Achieved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* SOAP Format */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-blue-700">S - Subjective</Label>
                <Textarea value={formData.subjective} onChange={(e) => setFormData({ ...formData, subjective: e.target.value })} placeholder="What client/carer reported..." rows={3} />
              </div>
              <div>
                <Label className="text-emerald-700">O - Objective</Label>
                <Textarea value={formData.objective} onChange={(e) => setFormData({ ...formData, objective: e.target.value })} placeholder="Observable data, behaviours, measurements..." rows={3} />
              </div>
              <div>
                <Label className="text-amber-700">A - Assessment</Label>
                <Textarea value={formData.assessment} onChange={(e) => setFormData({ ...formData, assessment: e.target.value })} placeholder="Clinical interpretation, analysis..." rows={3} />
              </div>
              <div>
                <Label className="text-purple-700">P - Plan</Label>
                <Textarea value={formData.plan} onChange={(e) => setFormData({ ...formData, plan: e.target.value })} placeholder="Next steps, goals, actions..." rows={3} />
              </div>
            </div>

            <div>
              <Label>Goals Addressed</Label>
              <Input value={formData.goals_addressed} onChange={(e) => setFormData({ ...formData, goals_addressed: e.target.value })} placeholder="Which BSP/plan goals were worked on?" />
            </div>

            <Button onClick={handleRefineWithAI} disabled={isRefining} className="w-full bg-purple-600 hover:bg-purple-700">
              {isRefining ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {isRefining ? 'Refining...' : 'Refine with AI'}
            </Button>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Refined Professional Note</Label>
                {formData.refined_note && (
                  <Button variant="ghost" size="sm" onClick={handleCopy}>
                    {copied ? <Check className="w-4 h-4 mr-1 text-green-600" /> : <Copy className="w-4 h-4 mr-1" />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                )}
              </div>
              <Textarea
                value={formData.refined_note}
                onChange={(e) => setFormData({ ...formData, refined_note: e.target.value })}
                placeholder="AI-refined note will appear here..."
                rows={6}
                className="font-mono text-sm"
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.client_id || !formData.practitioner_id} className="bg-teal-600 hover:bg-teal-700">
              {editingNote ? 'Update' : 'Save'} Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}