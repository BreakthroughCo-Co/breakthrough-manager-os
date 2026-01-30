import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ScrollText,
  Plus,
  Edit,
  Trash2,
  Sparkles,
  Loader2,
  User,
  FileText
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

const emptyAgreement = {
  client_id: '',
  client_name: '',
  ndis_plan_id: '',
  agreement_number: '',
  start_date: format(new Date(), 'yyyy-MM-dd'),
  end_date: '',
  service_type: 'behaviour_support',
  funding_source: 'capacity_building',
  agreed_hours: 0,
  hourly_rate: 0,
  total_value: 0,
  service_description: '',
  service_location: '',
  frequency: '',
  assigned_practitioner_id: '',
  assigned_practitioner_name: '',
  consent_obtained: false,
  consent_date: '',
  signed_by_participant: false,
  signed_by_provider: false,
  status: 'draft',
  document_url: '',
  notes: ''
};

const statusColors = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-700',
  signed: 'bg-purple-100 text-purple-700',
  active: 'bg-emerald-100 text-emerald-700',
  expired: 'bg-amber-100 text-amber-700',
  terminated: 'bg-red-100 text-red-700',
};

export default function ServiceAgreements() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState(null);
  const [formData, setFormData] = useState(emptyAgreement);
  const [isGenerating, setIsGenerating] = useState(false);

  const queryClient = useQueryClient();

  const { data: agreements = [] } = useQuery({
    queryKey: ['serviceAgreements'],
    queryFn: () => base44.entities.ServiceAgreement.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: practitioners = [] } = useQuery({
    queryKey: ['practitioners'],
    queryFn: () => base44.entities.Practitioner.list(),
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['ndisPlans'],
    queryFn: () => base44.entities.NDISPlan.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ServiceAgreement.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceAgreements'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ServiceAgreement.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceAgreements'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ServiceAgreement.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['serviceAgreements'] }),
  });

  const handleOpenDialog = (agreement = null) => {
    if (agreement) { setEditingAgreement(agreement); setFormData(agreement); }
    else { setEditingAgreement(null); setFormData(emptyAgreement); }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => { setIsDialogOpen(false); setEditingAgreement(null); setFormData(emptyAgreement); };

  const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    setFormData({ ...formData, client_id: clientId, client_name: client?.full_name || '' });
  };

  const handlePractitionerChange = (practitionerId) => {
    const practitioner = practitioners.find(p => p.id === practitionerId);
    setFormData({ ...formData, assigned_practitioner_id: practitionerId, assigned_practitioner_name: practitioner?.full_name || '' });
  };

  const calculateTotal = (hours, rate) => {
    return (parseFloat(hours) || 0) * (parseFloat(rate) || 0);
  };

  const handleGenerateDescription = async () => {
    if (!formData.client_id) return;

    setIsGenerating(true);

    const client = clients.find(c => c.id === formData.client_id);
    const plan = plans.find(p => p.id === formData.ndis_plan_id);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a professional NDIS service agreement description for behaviour support services.

Client: ${client?.full_name || 'Client'}
Service Type: ${formData.service_type}
Funding Source: ${formData.funding_source}
Hours: ${formData.agreed_hours}
Frequency: ${formData.frequency || 'As required'}
${plan?.stated_goals ? `Plan Goals: ${plan.stated_goals}` : ''}

Write a concise, professional service description that includes:
1. Services to be provided
2. Service delivery approach
3. Expected outcomes
4. Key responsibilities

Keep it under 300 words and use professional NDIS terminology.`
      });

      setFormData(prev => ({ ...prev, service_description: result }));
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = () => {
    const total = calculateTotal(formData.agreed_hours, formData.hourly_rate);
    const dataToSave = { ...formData, total_value: total };
    if (editingAgreement) updateMutation.mutate({ id: editingAgreement.id, data: dataToSave });
    else createMutation.mutate(dataToSave);
  };

  const clientPlans = plans.filter(p => p.client_id === formData.client_id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-purple-600" />
            Service Agreement Drafter
          </h2>
          <p className="text-slate-500 mt-1">Generate service agreements from NDIS plan data</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />
          New Agreement
        </Button>
      </div>

      {/* Agreements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agreements.map((agreement) => (
          <Card key={agreement.id} className="hover:shadow-lg transition-all">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">{agreement.client_name || 'Unknown'}</h4>
                    <p className="text-xs text-slate-500">{agreement.agreement_number || 'No ref'}</p>
                  </div>
                </div>
                <Badge className={statusColors[agreement.status]}>{agreement.status}</Badge>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">Service</span>
                  <span className="font-medium capitalize">{agreement.service_type?.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Hours</span>
                  <span className="font-medium">{agreement.agreed_hours}hrs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Value</span>
                  <span className="font-medium">${(agreement.total_value || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Period</span>
                  <span className="text-xs">{agreement.start_date ? format(new Date(agreement.start_date), 'MMM d') : '-'} - {agreement.end_date ? format(new Date(agreement.end_date), 'MMM d, yyyy') : '-'}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleOpenDialog(agreement)}>
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(agreement.id)} className="text-red-600">
                  <Trash2 className="w-3 h-3 mr-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {agreements.length === 0 && (
        <Card className="py-12">
          <div className="text-center">
            <ScrollText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No service agreements created yet</p>
          </div>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAgreement ? 'Edit Agreement' : 'New Service Agreement'}</DialogTitle>
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
                <Label>Link to NDIS Plan</Label>
                <Select value={formData.ndis_plan_id} onValueChange={(v) => setFormData({ ...formData, ndis_plan_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                  <SelectContent>
                    {clientPlans.map(p => <SelectItem key={p.id} value={p.id}>Plan {p.plan_number || '-'} ({p.plan_start_date})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Start Date *</Label>
                <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
              </div>
              <div>
                <Label>End Date *</Label>
                <Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
              </div>
              <div>
                <Label>Service Type</Label>
                <Select value={formData.service_type} onValueChange={(v) => setFormData({ ...formData, service_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="behaviour_support">Behaviour Support</SelectItem>
                    <SelectItem value="capacity_building">Capacity Building</SelectItem>
                    <SelectItem value="therapeutic_supports">Therapeutic Supports</SelectItem>
                    <SelectItem value="combined">Combined</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Funding Source</Label>
                <Select value={formData.funding_source} onValueChange={(v) => setFormData({ ...formData, funding_source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="core">Core</SelectItem>
                    <SelectItem value="capacity_building">Capacity Building</SelectItem>
                    <SelectItem value="capital">Capital</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Agreed Hours</Label>
                <Input type="number" value={formData.agreed_hours} onChange={(e) => setFormData({ ...formData, agreed_hours: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Hourly Rate ($)</Label>
                <Input type="number" value={formData.hourly_rate} onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-3 flex justify-between items-center">
              <span className="font-medium text-purple-900">Total Agreement Value:</span>
              <span className="text-xl font-bold text-purple-600">${calculateTotal(formData.agreed_hours, formData.hourly_rate).toLocaleString()}</span>
            </div>

            <div>
              <Label>Assigned Practitioner</Label>
              <Select value={formData.assigned_practitioner_id} onValueChange={handlePractitionerChange}>
                <SelectTrigger><SelectValue placeholder="Select practitioner" /></SelectTrigger>
                <SelectContent>{practitioners.filter(p => p.status === 'active').map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Service Location</Label>
                <Input value={formData.service_location} onChange={(e) => setFormData({ ...formData, service_location: e.target.value })} placeholder="Home, school, community..." />
              </div>
              <div>
                <Label>Frequency</Label>
                <Input value={formData.frequency} onChange={(e) => setFormData({ ...formData, frequency: e.target.value })} placeholder="e.g., Weekly, fortnightly..." />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Service Description</Label>
                <Button variant="ghost" size="sm" onClick={handleGenerateDescription} disabled={!formData.client_id || isGenerating}>
                  {isGenerating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                  {isGenerating ? 'Generating...' : 'Auto-Generate'}
                </Button>
              </div>
              <Textarea value={formData.service_description} onChange={(e) => setFormData({ ...formData, service_description: e.target.value })} placeholder="Description of services to be provided..." rows={4} />
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={formData.consent_obtained} onCheckedChange={(v) => setFormData({ ...formData, consent_obtained: v })} />
                <Label>Consent Obtained</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formData.signed_by_participant} onCheckedChange={(v) => setFormData({ ...formData, signed_by_participant: v })} />
                <Label>Signed by Participant</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formData.signed_by_provider} onCheckedChange={(v) => setFormData({ ...formData, signed_by_provider: v })} />
                <Label>Signed by Provider</Label>
              </div>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="signed">Signed</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.client_id || !formData.start_date} className="bg-teal-600 hover:bg-teal-700">
              {editingAgreement ? 'Update' : 'Save'} Agreement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}