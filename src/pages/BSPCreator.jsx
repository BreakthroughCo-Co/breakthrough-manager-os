import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ScrollText,
  Plus,
  Edit,
  Trash2,
  FileText,
  Sparkles,
  Loader2,
  User,
  Download
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
import { cn } from '@/lib/utils';

const emptyBSP = {
  client_id: '',
  client_name: '',
  fba_id: '',
  plan_version: '1.0',
  status: 'draft',
  start_date: format(new Date(), 'yyyy-MM-dd'),
  review_date: '',
  author_id: '',
  author_name: '',
  participant_profile: '',
  behaviour_summary: '',
  functional_analysis: '',
  environmental_strategies: '',
  skill_building_strategies: '',
  reactive_strategies: '',
  restrictive_practices: '',
  monitoring_evaluation: '',
  implementation_support: '',
  consent_obtained: false,
  consent_date: '',
  notes: ''
};

const statusColors = {
  draft: 'bg-slate-100 text-slate-700',
  pending_approval: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  active: 'bg-emerald-100 text-emerald-700',
  under_review: 'bg-purple-100 text-purple-700',
  archived: 'bg-slate-100 text-slate-500',
};

export default function BSPCreator() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBSP, setEditingBSP] = useState(null);
  const [formData, setFormData] = useState(emptyBSP);
  const [isGenerating, setIsGenerating] = useState(false);

  const queryClient = useQueryClient();

  const { data: bsps = [] } = useQuery({
    queryKey: ['bsps'],
    queryFn: () => base44.entities.BehaviourSupportPlan.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: practitioners = [] } = useQuery({
    queryKey: ['practitioners'],
    queryFn: () => base44.entities.Practitioner.list(),
  });

  const { data: fbas = [] } = useQuery({
    queryKey: ['fbas'],
    queryFn: () => base44.entities.FunctionalBehaviourAssessment.list(),
  });

  const { data: abcRecords = [] } = useQuery({
    queryKey: ['abcRecords'],
    queryFn: () => base44.entities.ABCRecord.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BehaviourSupportPlan.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bsps'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BehaviourSupportPlan.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bsps'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BehaviourSupportPlan.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bsps'] }),
  });

  const handleOpenDialog = (bsp = null) => {
    if (bsp) { setEditingBSP(bsp); setFormData(bsp); }
    else { setEditingBSP(null); setFormData(emptyBSP); }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => { setIsDialogOpen(false); setEditingBSP(null); setFormData(emptyBSP); };

  const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    setFormData({ ...formData, client_id: clientId, client_name: client?.full_name || '' });
  };

  const handleAuthorChange = (authorId) => {
    const author = practitioners.find(p => p.id === authorId);
    setFormData({ ...formData, author_id: authorId, author_name: author?.full_name || '' });
  };

  const handleGenerateFromFBA = async () => {
    if (!formData.fba_id) return;

    const fba = fbas.find(f => f.id === formData.fba_id);
    const clientABCs = abcRecords.filter(r => r.client_id === formData.client_id);

    if (!fba) return;

    setIsGenerating(true);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an NDIS Behaviour Support Practitioner. Based on the following FBA data, generate comprehensive BSP sections.

FBA Data:
- Target Behaviours: ${fba.target_behaviours || 'Not specified'}
- Setting Events: ${fba.setting_events || 'Not specified'}
- Antecedents: ${fba.antecedents || 'Not specified'}
- Consequences: ${fba.consequences || 'Not specified'}
- Hypothesised Function: ${fba.hypothesised_function || 'Not specified'}
- Replacement Behaviours: ${fba.replacement_behaviours || 'Not specified'}
- Recommendations: ${fba.recommendations || 'Not specified'}

ABC Data Summary (${clientABCs.length} records):
${clientABCs.slice(0, 5).map(r => `- ${r.behaviour} (${r.hypothesised_function})`).join('\n')}

Generate the following sections in a professional, clinical format:
1. Behaviour Summary (brief overview of target behaviours)
2. Functional Analysis (summary of behaviour function)
3. Environmental Strategies (proactive modifications)
4. Skill Building Strategies (replacement behaviours)
5. Reactive Strategies (response protocols)
6. Monitoring & Evaluation (data collection plan)
7. Implementation Support (training needs)

Output as JSON with keys: behaviour_summary, functional_analysis, environmental_strategies, skill_building_strategies, reactive_strategies, monitoring_evaluation, implementation_support`,
        response_json_schema: {
          type: "object",
          properties: {
            behaviour_summary: { type: "string" },
            functional_analysis: { type: "string" },
            environmental_strategies: { type: "string" },
            skill_building_strategies: { type: "string" },
            reactive_strategies: { type: "string" },
            monitoring_evaluation: { type: "string" },
            implementation_support: { type: "string" }
          }
        }
      });

      setFormData(prev => ({
        ...prev,
        behaviour_summary: result.behaviour_summary || prev.behaviour_summary,
        functional_analysis: result.functional_analysis || prev.functional_analysis,
        environmental_strategies: result.environmental_strategies || prev.environmental_strategies,
        skill_building_strategies: result.skill_building_strategies || prev.skill_building_strategies,
        reactive_strategies: result.reactive_strategies || prev.reactive_strategies,
        monitoring_evaluation: result.monitoring_evaluation || prev.monitoring_evaluation,
        implementation_support: result.implementation_support || prev.implementation_support,
      }));
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = () => {
    if (editingBSP) updateMutation.mutate({ id: editingBSP.id, data: formData });
    else createMutation.mutate(formData);
  };

  const clientFBAs = fbas.filter(f => f.client_id === formData.client_id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-teal-600" />
            Behaviour Support Plan Creator
          </h2>
          <p className="text-slate-500 mt-1">Generate BSPs from FBA and ABC data</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />
          New BSP
        </Button>
      </div>

      {/* BSP Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bsps.map((bsp) => (
          <Card key={bsp.id} className="hover:shadow-lg transition-all">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">{bsp.client_name || 'Unknown'}</h4>
                    <p className="text-xs text-slate-500">v{bsp.plan_version}</p>
                  </div>
                </div>
                <Badge className={statusColors[bsp.status]}>{bsp.status?.replace(/_/g, ' ')}</Badge>
              </div>

              <div className="text-sm text-slate-600 space-y-1 mb-4">
                <p>Author: {bsp.author_name || '-'}</p>
                <p>Start: {bsp.start_date ? format(new Date(bsp.start_date), 'MMM d, yyyy') : '-'}</p>
                {bsp.review_date && <p>Review: {format(new Date(bsp.review_date), 'MMM d, yyyy')}</p>}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleOpenDialog(bsp)}>
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(bsp.id)} className="text-red-600">
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {bsps.length === 0 && (
        <Card className="py-12">
          <div className="text-center">
            <ScrollText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No Behaviour Support Plans created yet</p>
          </div>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBSP ? 'Edit BSP' : 'Create Behaviour Support Plan'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Client *</Label>
                <Select value={formData.client_id} onValueChange={handleClientChange}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Link to FBA</Label>
                <Select value={formData.fba_id} onValueChange={(v) => setFormData({ ...formData, fba_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select FBA" /></SelectTrigger>
                  <SelectContent>
                    {clientFBAs.map(f => <SelectItem key={f.id} value={f.id}>FBA - {f.assessment_date ? format(new Date(f.assessment_date), 'MMM d, yyyy') : 'No date'}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Author</Label>
                <Select value={formData.author_id} onValueChange={handleAuthorChange}>
                  <SelectTrigger><SelectValue placeholder="Select author" /></SelectTrigger>
                  <SelectContent>{practitioners.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
              </div>
              <div>
                <Label>Review Date</Label>
                <Input type="date" value={formData.review_date} onChange={(e) => setFormData({ ...formData, review_date: e.target.value })} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending_approval">Pending Approval</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* AI Generate Button */}
            {formData.fba_id && (
              <Button onClick={handleGenerateFromFBA} disabled={isGenerating} variant="outline" className="w-full">
                {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {isGenerating ? 'Generating...' : 'Auto-Generate from FBA Data'}
              </Button>
            )}

            {/* Plan Sections */}
            <div className="space-y-4">
              <div>
                <Label>Participant Profile</Label>
                <Textarea value={formData.participant_profile} onChange={(e) => setFormData({ ...formData, participant_profile: e.target.value })} placeholder="Brief summary of participant..." rows={3} />
              </div>
              <div>
                <Label>Behaviour Summary</Label>
                <Textarea value={formData.behaviour_summary} onChange={(e) => setFormData({ ...formData, behaviour_summary: e.target.value })} placeholder="Summary of target behaviours..." rows={3} />
              </div>
              <div>
                <Label>Functional Analysis</Label>
                <Textarea value={formData.functional_analysis} onChange={(e) => setFormData({ ...formData, functional_analysis: e.target.value })} placeholder="Analysis of behaviour function..." rows={3} />
              </div>
              <div>
                <Label>Environmental Strategies</Label>
                <Textarea value={formData.environmental_strategies} onChange={(e) => setFormData({ ...formData, environmental_strategies: e.target.value })} placeholder="Proactive environmental modifications..." rows={3} />
              </div>
              <div>
                <Label>Skill Building Strategies</Label>
                <Textarea value={formData.skill_building_strategies} onChange={(e) => setFormData({ ...formData, skill_building_strategies: e.target.value })} placeholder="Replacement behaviour teaching..." rows={3} />
              </div>
              <div>
                <Label>Reactive Strategies</Label>
                <Textarea value={formData.reactive_strategies} onChange={(e) => setFormData({ ...formData, reactive_strategies: e.target.value })} placeholder="Response protocols..." rows={3} />
              </div>
              <div>
                <Label>Restrictive Practices</Label>
                <Textarea value={formData.restrictive_practices} onChange={(e) => setFormData({ ...formData, restrictive_practices: e.target.value })} placeholder="Any regulated practices (if applicable)..." rows={2} />
              </div>
              <div>
                <Label>Monitoring & Evaluation</Label>
                <Textarea value={formData.monitoring_evaluation} onChange={(e) => setFormData({ ...formData, monitoring_evaluation: e.target.value })} placeholder="Data collection and review plan..." rows={3} />
              </div>
              <div>
                <Label>Implementation Support</Label>
                <Textarea value={formData.implementation_support} onChange={(e) => setFormData({ ...formData, implementation_support: e.target.value })} placeholder="Training and support for implementers..." rows={3} />
              </div>

              <div className="flex items-center gap-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Switch checked={formData.consent_obtained} onCheckedChange={(v) => setFormData({ ...formData, consent_obtained: v })} />
                  <Label>Consent Obtained</Label>
                </div>
                {formData.consent_obtained && (
                  <div>
                    <Label>Consent Date</Label>
                    <Input type="date" value={formData.consent_date} onChange={(e) => setFormData({ ...formData, consent_date: e.target.value })} />
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.client_id} className="bg-teal-600 hover:bg-teal-700">
              {editingBSP ? 'Update' : 'Create'} BSP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}