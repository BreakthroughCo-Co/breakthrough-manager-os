import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ClipboardCheck,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const auditCriteria = [
  { id: 'person_centered', label: 'Person-centred approach evident', category: 'Core', weight: 2 },
  { id: 'functional_assessment', label: 'Functional assessment completed', category: 'Assessment', weight: 2 },
  { id: 'behaviour_defined', label: 'Target behaviours operationally defined', category: 'Assessment', weight: 2 },
  { id: 'function_identified', label: 'Function of behaviour identified', category: 'Assessment', weight: 2 },
  { id: 'proactive_strategies', label: 'Proactive strategies included', category: 'Strategies', weight: 2 },
  { id: 'reactive_strategies', label: 'Reactive strategies included', category: 'Strategies', weight: 1 },
  { id: 'skill_building', label: 'Skill building component', category: 'Strategies', weight: 2 },
  { id: 'data_collection', label: 'Data collection plan specified', category: 'Monitoring', weight: 1 },
  { id: 'review_schedule', label: 'Review schedule documented', category: 'Monitoring', weight: 1 },
  { id: 'restrictive_compliant', label: 'Restrictive practices compliant (if applicable)', category: 'Compliance', weight: 2 },
  { id: 'consent_documented', label: 'Consent documented', category: 'Compliance', weight: 2 },
  { id: 'implementer_guidance', label: 'Clear guidance for implementers', category: 'Implementation', weight: 1 },
  { id: 'training_identified', label: 'Training needs identified', category: 'Implementation', weight: 1 },
  { id: 'goals_measurable', label: 'Goals are measurable', category: 'Goals', weight: 2 },
  { id: 'evidence_based', label: 'Evidence-based approaches used', category: 'Quality', weight: 2 },
];

const ratingConfig = {
  excellent: { min: 90, color: 'bg-emerald-100 text-emerald-700' },
  good: { min: 75, color: 'bg-blue-100 text-blue-700' },
  satisfactory: { min: 60, color: 'bg-amber-100 text-amber-700' },
  needs_improvement: { min: 40, color: 'bg-orange-100 text-orange-700' },
  unsatisfactory: { min: 0, color: 'bg-red-100 text-red-700' },
};

export default function BIPQualityAudit() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAudit, setEditingAudit] = useState(null);
  const [scores, setScores] = useState({});
  const [formData, setFormData] = useState({
    audit_type: 'bip_quality',
    audit_date: format(new Date(), 'yyyy-MM-dd'),
    auditor_name: '',
    client_id: '',
    client_name: '',
    document_reviewed: '',
    findings: '',
    recommendations: '',
    corrective_actions: '',
    follow_up_date: '',
    status: 'in_progress',
    notes: ''
  });

  const queryClient = useQueryClient();

  const { data: audits = [] } = useQuery({
    queryKey: ['bipAudits'],
    queryFn: async () => {
      const all = await base44.entities.ComplianceAudit.list('-audit_date');
      return all.filter(a => a.audit_type === 'bip_quality');
    },
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
    mutationFn: (data) => base44.entities.ComplianceAudit.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bipAudits'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ComplianceAudit.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bipAudits'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ComplianceAudit.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bipAudits'] }),
  });

  const calculateScore = () => {
    let earned = 0;
    let total = 0;
    auditCriteria.forEach(c => {
      total += c.weight;
      if (scores[c.id]) earned += c.weight;
    });
    const percentage = total > 0 ? Math.round((earned / total) * 100) : 0;
    let rating = 'unsatisfactory';
    for (const [key, config] of Object.entries(ratingConfig)) {
      if (percentage >= config.min) { rating = key; break; }
    }
    return { earned, total, percentage, rating };
  };

  const handleOpenDialog = (audit = null) => {
    if (audit) {
      setEditingAudit(audit);
      setFormData(audit);
      try {
        const savedScores = JSON.parse(audit.scoring_criteria || '{}');
        setScores(savedScores);
      } catch { setScores({}); }
    } else {
      setEditingAudit(null);
      setFormData({
        audit_type: 'bip_quality',
        audit_date: format(new Date(), 'yyyy-MM-dd'),
        auditor_name: '',
        client_id: '',
        client_name: '',
        document_reviewed: '',
        findings: '',
        recommendations: '',
        corrective_actions: '',
        follow_up_date: '',
        status: 'in_progress',
        notes: ''
      });
      setScores({});
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => { setIsDialogOpen(false); setEditingAudit(null); setScores({}); };

  const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    setFormData({ ...formData, client_id: clientId, client_name: client?.full_name || '' });
  };

  const handleSubmit = () => {
    const { earned, total, percentage, rating } = calculateScore();
    const dataToSave = {
      ...formData,
      scoring_criteria: JSON.stringify(scores),
      total_score: earned,
      max_score: total,
      percentage,
      rating,
    };
    if (editingAudit) updateMutation.mutate({ id: editingAudit.id, data: dataToSave });
    else createMutation.mutate(dataToSave);
  };

  const { percentage, rating } = calculateScore();
  const clientBSPs = bsps.filter(b => b.client_id === formData.client_id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-purple-600" />
            BIP-QEII Quality Audit
          </h2>
          <p className="text-slate-500 mt-1">Behaviour Intervention Plan quality scoring</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />
          New Audit
        </Button>
      </div>

      {/* Audits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {audits.map((audit) => (
          <Card key={audit.id} className="hover:shadow-lg transition-all">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="font-semibold text-slate-900">{audit.client_name || 'Unknown Client'}</h4>
                  <p className="text-xs text-slate-500">{audit.audit_date ? format(new Date(audit.audit_date), 'MMM d, yyyy') : '-'}</p>
                </div>
                <Badge className={ratingConfig[audit.rating]?.color || ratingConfig.unsatisfactory.color}>
                  {audit.rating?.replace(/_/g, ' ')}
                </Badge>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Score</span>
                  <span className="font-medium">{audit.percentage || 0}%</span>
                </div>
                <Progress value={audit.percentage || 0} className="h-2" />
              </div>

              <p className="text-sm text-slate-500 mb-4">Auditor: {audit.auditor_name || '-'}</p>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleOpenDialog(audit)}>
                  <Edit className="w-3 h-3 mr-1" />
                  View/Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(audit.id)} className="text-red-600">
                  <Trash2 className="w-3 h-3 mr-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {audits.length === 0 && (
        <Card className="py-12">
          <div className="text-center">
            <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No BIP audits completed yet</p>
          </div>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAudit ? 'Edit Audit' : 'New BIP Quality Audit'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Client *</Label>
                <Select value={formData.client_id} onValueChange={handleClientChange}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Document Reviewed</Label>
                <Select value={formData.document_reviewed} onValueChange={(v) => setFormData({ ...formData, document_reviewed: v })}>
                  <SelectTrigger><SelectValue placeholder="Select BSP" /></SelectTrigger>
                  <SelectContent>
                    {clientBSPs.map(b => <SelectItem key={b.id} value={b.id}>BSP v{b.plan_version} - {b.start_date}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Audit Date</Label>
                <Input type="date" value={formData.audit_date} onChange={(e) => setFormData({ ...formData, audit_date: e.target.value })} />
              </div>
            </div>

            <div>
              <Label>Auditor Name</Label>
              <Input value={formData.auditor_name} onChange={(e) => setFormData({ ...formData, auditor_name: e.target.value })} />
            </div>

            {/* Scoring Criteria */}
            <div className="bg-purple-50 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-purple-900">Quality Criteria</h4>
                <div className="text-right">
                  <p className="text-2xl font-bold text-purple-600">{percentage}%</p>
                  <Badge className={ratingConfig[rating]?.color}>{rating?.replace(/_/g, ' ')}</Badge>
                </div>
              </div>

              {['Core', 'Assessment', 'Strategies', 'Monitoring', 'Compliance', 'Implementation', 'Goals', 'Quality'].map(category => {
                const items = auditCriteria.filter(c => c.category === category);
                if (items.length === 0) return null;
                return (
                  <div key={category}>
                    <p className="text-sm font-medium text-purple-800 mb-2">{category}</p>
                    <div className="space-y-2">
                      {items.map(criterion => (
                        <div key={criterion.id} className="flex items-center gap-3">
                          <Checkbox
                            id={criterion.id}
                            checked={scores[criterion.id] || false}
                            onCheckedChange={(checked) => setScores({ ...scores, [criterion.id]: checked })}
                          />
                          <label htmlFor={criterion.id} className="text-sm text-slate-700 flex-1">
                            {criterion.label}
                          </label>
                          {scores[criterion.id] ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-300" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              <Label>Findings</Label>
              <Textarea value={formData.findings} onChange={(e) => setFormData({ ...formData, findings: e.target.value })} placeholder="Key findings from the audit..." rows={2} />
            </div>

            <div>
              <Label>Recommendations</Label>
              <Textarea value={formData.recommendations} onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })} placeholder="Recommendations for improvement..." rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Follow-up Date</Label>
                <Input type="date" value={formData.follow_up_date} onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.client_id} className="bg-teal-600 hover:bg-teal-700">
              {editingAudit ? 'Update' : 'Save'} Audit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}