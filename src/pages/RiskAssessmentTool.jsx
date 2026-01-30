import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  Shield
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

const emptyRisk = {
  client_id: '',
  client_name: '',
  assessment_date: format(new Date(), 'yyyy-MM-dd'),
  assessor_name: '',
  risk_title: '',
  risk_category: 'safety',
  risk_description: '',
  likelihood: 'possible',
  consequence: 'moderate',
  inherent_risk_level: 'medium',
  existing_controls: '',
  residual_likelihood: 'unlikely',
  residual_consequence: 'minor',
  residual_risk_level: 'low',
  additional_controls: '',
  responsible_person: '',
  review_date: '',
  status: 'identified',
  notes: ''
};

const riskMatrix = {
  rare: { insignificant: 'low', minor: 'low', moderate: 'low', major: 'medium', catastrophic: 'medium' },
  unlikely: { insignificant: 'low', minor: 'low', moderate: 'medium', major: 'medium', catastrophic: 'high' },
  possible: { insignificant: 'low', minor: 'medium', moderate: 'medium', major: 'high', catastrophic: 'high' },
  likely: { insignificant: 'medium', minor: 'medium', moderate: 'high', major: 'high', catastrophic: 'extreme' },
  almost_certain: { insignificant: 'medium', minor: 'high', moderate: 'high', major: 'extreme', catastrophic: 'extreme' },
};

const riskColors = {
  low: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  extreme: 'bg-red-100 text-red-700',
};

const categoryColors = {
  safety: 'bg-red-100 text-red-700',
  clinical: 'bg-blue-100 text-blue-700',
  operational: 'bg-purple-100 text-purple-700',
  compliance: 'bg-amber-100 text-amber-700',
  reputational: 'bg-pink-100 text-pink-700',
  financial: 'bg-emerald-100 text-emerald-700',
};

export default function RiskAssessmentTool() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState(null);
  const [formData, setFormData] = useState(emptyRisk);

  const queryClient = useQueryClient();

  const { data: risks = [] } = useQuery({
    queryKey: ['riskAssessments'],
    queryFn: () => base44.entities.RiskAssessment.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RiskAssessment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['riskAssessments'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RiskAssessment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['riskAssessments'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RiskAssessment.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['riskAssessments'] }),
  });

  const calculateRiskLevel = (likelihood, consequence) => {
    return riskMatrix[likelihood]?.[consequence] || 'medium';
  };

  const handleOpenDialog = (risk = null) => {
    if (risk) { setEditingRisk(risk); setFormData(risk); }
    else { setEditingRisk(null); setFormData(emptyRisk); }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => { setIsDialogOpen(false); setEditingRisk(null); setFormData(emptyRisk); };

  const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    setFormData({ ...formData, client_id: clientId, client_name: client?.full_name || '' });
  };

  const handleLikelihoodChange = (value, isResidual = false) => {
    if (isResidual) {
      const level = calculateRiskLevel(value, formData.residual_consequence);
      setFormData({ ...formData, residual_likelihood: value, residual_risk_level: level });
    } else {
      const level = calculateRiskLevel(value, formData.consequence);
      setFormData({ ...formData, likelihood: value, inherent_risk_level: level });
    }
  };

  const handleConsequenceChange = (value, isResidual = false) => {
    if (isResidual) {
      const level = calculateRiskLevel(formData.residual_likelihood, value);
      setFormData({ ...formData, residual_consequence: value, residual_risk_level: level });
    } else {
      const level = calculateRiskLevel(formData.likelihood, value);
      setFormData({ ...formData, consequence: value, inherent_risk_level: level });
    }
  };

  const handleSubmit = () => {
    if (editingRisk) updateMutation.mutate({ id: editingRisk.id, data: formData });
    else createMutation.mutate(formData);
  };

  // Stats
  const stats = {
    total: risks.length,
    extreme: risks.filter(r => r.inherent_risk_level === 'extreme').length,
    high: risks.filter(r => r.inherent_risk_level === 'high').length,
    medium: risks.filter(r => r.inherent_risk_level === 'medium').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
            Comprehensive Risk Assessment
          </h2>
          <p className="text-slate-500 mt-1">Matrix-based risk assessment (Likelihood vs Consequence)</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />
          New Assessment
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-xs text-slate-500">Total Risks</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-red-600">{stats.extreme}</p>
            <p className="text-xs text-red-700">Extreme</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-orange-600">{stats.high}</p>
            <p className="text-xs text-orange-700">High</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-amber-600">{stats.medium}</p>
            <p className="text-xs text-amber-700">Medium</p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Risk</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Inherent Risk</TableHead>
                <TableHead>Residual Risk</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {risks.map((risk) => (
                <TableRow key={risk.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">{risk.risk_title}</TableCell>
                  <TableCell>
                    <Badge className={categoryColors[risk.risk_category]}>{risk.risk_category}</Badge>
                  </TableCell>
                  <TableCell>{risk.client_name || 'General'}</TableCell>
                  <TableCell>
                    <Badge className={riskColors[risk.inherent_risk_level]}>{risk.inherent_risk_level}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={riskColors[risk.residual_risk_level]}>{risk.residual_risk_level}</Badge>
                  </TableCell>
                  <TableCell className="capitalize">{risk.status}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(risk)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(risk.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {risks.length === 0 && (
            <div className="text-center py-12">
              <Shield className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">No risk assessments created yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRisk ? 'Edit Risk' : 'New Risk Assessment'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Risk Title *</Label>
                <Input value={formData.risk_title} onChange={(e) => setFormData({ ...formData, risk_title: e.target.value })} placeholder="Brief risk title" />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={formData.risk_category} onValueChange={(v) => setFormData({ ...formData, risk_category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="safety">Safety</SelectItem>
                    <SelectItem value="clinical">Clinical</SelectItem>
                    <SelectItem value="operational">Operational</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="reputational">Reputational</SelectItem>
                    <SelectItem value="financial">Financial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Related Client</Label>
                <Select value={formData.client_id} onValueChange={handleClientChange}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None (General)</SelectItem>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Risk Description</Label>
              <Textarea value={formData.risk_description} onChange={(e) => setFormData({ ...formData, risk_description: e.target.value })} placeholder="Describe the risk in detail..." rows={2} />
            </div>

            {/* Inherent Risk */}
            <div className="bg-orange-50 rounded-xl p-4 space-y-4">
              <h4 className="font-semibold text-orange-900">Inherent Risk (Before Controls)</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Likelihood</Label>
                  <Select value={formData.likelihood} onValueChange={(v) => handleLikelihoodChange(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rare">Rare</SelectItem>
                      <SelectItem value="unlikely">Unlikely</SelectItem>
                      <SelectItem value="possible">Possible</SelectItem>
                      <SelectItem value="likely">Likely</SelectItem>
                      <SelectItem value="almost_certain">Almost Certain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Consequence</Label>
                  <Select value={formData.consequence} onValueChange={(v) => handleConsequenceChange(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="insignificant">Insignificant</SelectItem>
                      <SelectItem value="minor">Minor</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="major">Major</SelectItem>
                      <SelectItem value="catastrophic">Catastrophic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Risk Level</Label>
                  <div className="mt-2">
                    <Badge className={cn("text-sm py-1 px-3", riskColors[formData.inherent_risk_level])}>{formData.inherent_risk_level?.toUpperCase()}</Badge>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label>Existing Controls</Label>
              <Textarea value={formData.existing_controls} onChange={(e) => setFormData({ ...formData, existing_controls: e.target.value })} placeholder="Current controls in place..." rows={2} />
            </div>

            {/* Residual Risk */}
            <div className="bg-emerald-50 rounded-xl p-4 space-y-4">
              <h4 className="font-semibold text-emerald-900">Residual Risk (After Controls)</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Likelihood</Label>
                  <Select value={formData.residual_likelihood} onValueChange={(v) => handleLikelihoodChange(v, true)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rare">Rare</SelectItem>
                      <SelectItem value="unlikely">Unlikely</SelectItem>
                      <SelectItem value="possible">Possible</SelectItem>
                      <SelectItem value="likely">Likely</SelectItem>
                      <SelectItem value="almost_certain">Almost Certain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Consequence</Label>
                  <Select value={formData.residual_consequence} onValueChange={(v) => handleConsequenceChange(v, true)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="insignificant">Insignificant</SelectItem>
                      <SelectItem value="minor">Minor</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="major">Major</SelectItem>
                      <SelectItem value="catastrophic">Catastrophic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Risk Level</Label>
                  <div className="mt-2">
                    <Badge className={cn("text-sm py-1 px-3", riskColors[formData.residual_risk_level])}>{formData.residual_risk_level?.toUpperCase()}</Badge>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label>Additional Controls Required</Label>
              <Textarea value={formData.additional_controls} onChange={(e) => setFormData({ ...formData, additional_controls: e.target.value })} placeholder="Additional controls needed..." rows={2} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Responsible Person</Label>
                <Input value={formData.responsible_person} onChange={(e) => setFormData({ ...formData, responsible_person: e.target.value })} />
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
                    <SelectItem value="identified">Identified</SelectItem>
                    <SelectItem value="mitigated">Mitigated</SelectItem>
                    <SelectItem value="monitoring">Monitoring</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.risk_title} className="bg-teal-600 hover:bg-teal-700">
              {editingRisk ? 'Update' : 'Save'} Assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}