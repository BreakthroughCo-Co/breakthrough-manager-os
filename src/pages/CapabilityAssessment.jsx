import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Gauge,
  Plus,
  Edit,
  Trash2,
  User,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
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

const emptyAssessment = {
  staff_id: '',
  staff_name: '',
  assessment_date: format(new Date(), 'yyyy-MM-dd'),
  assessor_name: '',
  assessment_type: 'initial',
  understanding_pbs: 3,
  data_collection: 3,
  strategy_implementation: 3,
  crisis_response: 3,
  documentation: 3,
  communication: 3,
  ethical_practice: 3,
  total_score: 21,
  competency_level: 'competent',
  strengths: '',
  development_areas: '',
  training_recommendations: '',
  notes: ''
};

const competencyColors = {
  developing: 'bg-amber-100 text-amber-700',
  competent: 'bg-blue-100 text-blue-700',
  proficient: 'bg-emerald-100 text-emerald-700',
  expert: 'bg-purple-100 text-purple-700',
};

const scoreLabels = ['N/A', 'Developing', 'Basic', 'Competent', 'Proficient', 'Expert'];

export default function CapabilityAssessment() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [formData, setFormData] = useState(emptyAssessment);

  const queryClient = useQueryClient();

  const { data: assessments = [] } = useQuery({
    queryKey: ['capabilityAssessments'],
    queryFn: () => base44.entities.CapabilityAssessment.list('-created_date'),
  });

  const { data: practitioners = [] } = useQuery({
    queryKey: ['practitioners'],
    queryFn: () => base44.entities.Practitioner.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CapabilityAssessment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capabilityAssessments'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CapabilityAssessment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capabilityAssessments'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CapabilityAssessment.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['capabilityAssessments'] }),
  });

  const calculateTotalAndLevel = (data) => {
    const total = (data.understanding_pbs || 0) + (data.data_collection || 0) + (data.strategy_implementation || 0) +
      (data.crisis_response || 0) + (data.documentation || 0) + (data.communication || 0) + (data.ethical_practice || 0);
    
    let level = 'developing';
    if (total >= 28) level = 'expert';
    else if (total >= 24) level = 'proficient';
    else if (total >= 18) level = 'competent';
    
    return { total_score: total, competency_level: level };
  };

  const handleOpenDialog = (assessment = null) => {
    if (assessment) { setEditingAssessment(assessment); setFormData(assessment); }
    else { setEditingAssessment(null); setFormData(emptyAssessment); }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => { setIsDialogOpen(false); setEditingAssessment(null); setFormData(emptyAssessment); };

  const handleStaffChange = (staffId) => {
    const staff = practitioners.find(p => p.id === staffId);
    setFormData({ ...formData, staff_id: staffId, staff_name: staff?.full_name || '' });
  };

  const handleScoreChange = (field, value) => {
    const updated = { ...formData, [field]: value[0] };
    const calculated = calculateTotalAndLevel(updated);
    setFormData({ ...updated, ...calculated });
  };

  const handleSubmit = () => {
    if (editingAssessment) updateMutation.mutate({ id: editingAssessment.id, data: formData });
    else createMutation.mutate(formData);
  };

  const ScoreSlider = ({ label, field, value }) => (
    <div className="space-y-2">
      <div className="flex justify-between">
        <Label>{label}</Label>
        <span className={cn("text-sm font-medium", value >= 4 ? "text-emerald-600" : value >= 3 ? "text-blue-600" : "text-amber-600")}>
          {scoreLabels[value]} ({value}/5)
        </span>
      </div>
      <Slider value={[value]} onValueChange={(v) => handleScoreChange(field, v)} min={1} max={5} step={1} className="w-full" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Gauge className="w-6 h-6 text-indigo-600" />
            PBS Capability Assessment
          </h2>
          <p className="text-slate-500 mt-1">Assess implementer/staff competency</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />
          New Assessment
        </Button>
      </div>

      {/* Assessments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assessments.map((assessment) => (
          <Card key={assessment.id} className="hover:shadow-lg transition-all">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <User className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">{assessment.staff_name || 'Unknown'}</h4>
                    <p className="text-xs text-slate-500">{assessment.assessment_date ? format(new Date(assessment.assessment_date), 'MMM d, yyyy') : '-'}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <Badge className={competencyColors[assessment.competency_level]}>
                  {assessment.competency_level}
                </Badge>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="font-bold text-slate-900">{assessment.total_score}/35</span>
                </div>
              </div>

              {/* Score Bar */}
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    assessment.total_score >= 28 ? "bg-purple-500" :
                    assessment.total_score >= 24 ? "bg-emerald-500" :
                    assessment.total_score >= 18 ? "bg-blue-500" : "bg-amber-500"
                  )}
                  style={{ width: `${(assessment.total_score / 35) * 100}%` }}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleOpenDialog(assessment)}>
                  <Edit className="w-3 h-3 mr-1" />
                  View/Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(assessment.id)} className="text-red-600">
                  <Trash2 className="w-3 h-3 mr-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {assessments.length === 0 && (
        <Card className="py-12">
          <div className="text-center">
            <Gauge className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No capability assessments created yet</p>
          </div>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAssessment ? 'Edit Assessment' : 'New Capability Assessment'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Staff Member *</Label>
                <Select value={formData.staff_id} onValueChange={handleStaffChange}>
                  <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent>{practitioners.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assessment Type</Label>
                <Select value={formData.assessment_type} onValueChange={(v) => setFormData({ ...formData, assessment_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="initial">Initial</SelectItem>
                    <SelectItem value="annual_review">Annual Review</SelectItem>
                    <SelectItem value="competency_check">Competency Check</SelectItem>
                    <SelectItem value="supervision">Supervision</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assessment Date</Label>
                <Input type="date" value={formData.assessment_date} onChange={(e) => setFormData({ ...formData, assessment_date: e.target.value })} />
              </div>
              <div>
                <Label>Assessor Name</Label>
                <Input value={formData.assessor_name} onChange={(e) => setFormData({ ...formData, assessor_name: e.target.value })} />
              </div>
            </div>

            {/* Competency Sliders */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-4">
              <h4 className="font-semibold text-slate-900">Competency Ratings</h4>
              <ScoreSlider label="Understanding of PBS Principles" field="understanding_pbs" value={formData.understanding_pbs} />
              <ScoreSlider label="Data Collection Skills" field="data_collection" value={formData.data_collection} />
              <ScoreSlider label="Strategy Implementation" field="strategy_implementation" value={formData.strategy_implementation} />
              <ScoreSlider label="Crisis Response" field="crisis_response" value={formData.crisis_response} />
              <ScoreSlider label="Documentation Quality" field="documentation" value={formData.documentation} />
              <ScoreSlider label="Communication" field="communication" value={formData.communication} />
              <ScoreSlider label="Ethical Practice" field="ethical_practice" value={formData.ethical_practice} />
            </div>

            {/* Total Score */}
            <div className="bg-indigo-50 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-indigo-900">Overall Score</p>
                <Badge className={competencyColors[formData.competency_level]}>{formData.competency_level}</Badge>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-indigo-600">{formData.total_score}/35</p>
                <p className="text-sm text-indigo-700">{Math.round((formData.total_score / 35) * 100)}%</p>
              </div>
            </div>

            <div>
              <Label>Strengths</Label>
              <Textarea value={formData.strengths} onChange={(e) => setFormData({ ...formData, strengths: e.target.value })} placeholder="Identified strengths..." rows={2} />
            </div>

            <div>
              <Label>Development Areas</Label>
              <Textarea value={formData.development_areas} onChange={(e) => setFormData({ ...formData, development_areas: e.target.value })} placeholder="Areas for development..." rows={2} />
            </div>

            <div>
              <Label>Training Recommendations</Label>
              <Textarea value={formData.training_recommendations} onChange={(e) => setFormData({ ...formData, training_recommendations: e.target.value })} placeholder="Recommended training..." rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.staff_id} className="bg-teal-600 hover:bg-teal-700">
              {editingAssessment ? 'Update' : 'Save'} Assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}