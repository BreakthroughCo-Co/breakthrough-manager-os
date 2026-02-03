import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertTriangle, Link2 } from 'lucide-react';
import { EvidenceMapper } from '@/components/domain/EvidenceMapper';

/**
 * BSP Intervention Builder with Evidence Enforcement
 * Requires: ABC clusters + Hypothesis + Outcome metric
 */
export default function BSPInterventionBuilder({ clientId, fbaId, onSave }) {
  const [intervention, setIntervention] = useState({
    description: '',
    category: 'environmental',
    rationale: '',
    linked_hypothesis: '',
    linked_abc_clusters: [],
    outcome_metric: {
      metric_name: '',
      measurement_method: '',
      target_value: '',
      review_frequency: 'weekly',
    },
    evidence_base: '',
  });
  
  const [validation, setValidation] = useState(null);

  const { data: abcRecords = [] } = useQuery({
    queryKey: ['abcRecords', clientId],
    queryFn: () => base44.entities.ABCRecord.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const { data: fba } = useQuery({
    queryKey: ['fba', fbaId],
    queryFn: () => base44.entities.FunctionalBehaviourAssessment.filter({ id: fbaId }).then(r => r[0]),
    enabled: !!fbaId,
  });

  const handleValidate = () => {
    const selectedHypothesis = fba?.functional_hypotheses?.find(
      h => h.hypothesis_id === intervention.linked_hypothesis
    );
    
    const result = EvidenceMapper.validateBSPIntervention(
      intervention,
      abcRecords,
      selectedHypothesis
    );
    
    setValidation(result);
  };

  const handleABCToggle = (abcId) => {
    setIntervention(prev => ({
      ...prev,
      linked_abc_clusters: prev.linked_abc_clusters.includes(abcId)
        ? prev.linked_abc_clusters.filter(id => id !== abcId)
        : [...prev.linked_abc_clusters, abcId],
    }));
  };

  const hypotheses = fba?.functional_hypotheses || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="w-5 h-5" />
          Build Evidence-Based Intervention
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {validation && (
          <Alert className={validation.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
            {validation.valid ? (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600" />
            )}
            <AlertDescription>
              {validation.valid ? (
                <p className="text-green-900 font-medium">Intervention meets evidence requirements</p>
              ) : (
                <div className="text-red-900">
                  <p className="font-medium mb-1">Evidence linkage incomplete:</p>
                  <ul className="list-disc list-inside text-sm">
                    {validation.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div>
          <Label>Intervention Category</Label>
          <Select
            value={intervention.category}
            onValueChange={(value) => setIntervention(prev => ({ ...prev, category: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="environmental">Environmental</SelectItem>
              <SelectItem value="skill_building">Skill Building</SelectItem>
              <SelectItem value="reactive">Reactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Intervention Description</Label>
          <Textarea
            value={intervention.description}
            onChange={(e) => setIntervention(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe the intervention strategy..."
            rows={3}
          />
        </div>

        <div>
          <Label>Rationale</Label>
          <Textarea
            value={intervention.rationale}
            onChange={(e) => setIntervention(prev => ({ ...prev, rationale: e.target.value }))}
            placeholder="Why is this intervention appropriate?"
            rows={2}
          />
        </div>

        <div>
          <Label className="flex items-center gap-2">
            Linked Hypothesis <Badge variant="outline">Required</Badge>
          </Label>
          <Select
            value={intervention.linked_hypothesis}
            onValueChange={(value) => setIntervention(prev => ({ ...prev, linked_hypothesis: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select hypothesis..." />
            </SelectTrigger>
            <SelectContent>
              {hypotheses.map(hyp => (
                <SelectItem key={hyp.hypothesis_id} value={hyp.hypothesis_id}>
                  {hyp.function}: {hyp.statement?.substring(0, 60)}...
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="flex items-center gap-2 mb-2">
            Linked ABC Data Clusters <Badge variant="outline">Required</Badge>
          </Label>
          <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
            {abcRecords.map(abc => (
              <label key={abc.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={intervention.linked_abc_clusters.includes(abc.id)}
                  onChange={() => handleABCToggle(abc.id)}
                  className="rounded"
                />
                <div className="flex-1 text-sm">
                  <p className="font-medium">{abc.date} - {abc.behaviour}</p>
                  <p className="text-xs text-muted-foreground">
                    {abc.antecedent?.substring(0, 50)}...
                  </p>
                </div>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {intervention.linked_abc_clusters.length} records selected
          </p>
        </div>

        <div className="border-t pt-4">
          <Label className="flex items-center gap-2 mb-3">
            Outcome Metric <Badge variant="outline">Required</Badge>
          </Label>
          
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Metric Name</Label>
              <Input
                value={intervention.outcome_metric.metric_name}
                onChange={(e) => setIntervention(prev => ({
                  ...prev,
                  outcome_metric: { ...prev.outcome_metric, metric_name: e.target.value }
                }))}
                placeholder="e.g., Frequency of target behaviour"
              />
            </div>
            
            <div>
              <Label className="text-xs">Measurement Method</Label>
              <Input
                value={intervention.outcome_metric.measurement_method}
                onChange={(e) => setIntervention(prev => ({
                  ...prev,
                  outcome_metric: { ...prev.outcome_metric, measurement_method: e.target.value }
                }))}
                placeholder="e.g., Daily ABC data collection"
              />
            </div>
            
            <div>
              <Label className="text-xs">Target Value</Label>
              <Input
                value={intervention.outcome_metric.target_value}
                onChange={(e) => setIntervention(prev => ({
                  ...prev,
                  outcome_metric: { ...prev.outcome_metric, target_value: e.target.value }
                }))}
                placeholder="e.g., <3 incidents per week"
              />
            </div>
          </div>
        </div>

        <div>
          <Label>Evidence Base (optional)</Label>
          <Input
            value={intervention.evidence_base}
            onChange={(e) => setIntervention(prev => ({ ...prev, evidence_base: e.target.value }))}
            placeholder="Citation or reference"
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={handleValidate}>
            <AlertTriangle className="w-4 h-4 mr-2" />
            Validate Evidence
          </Button>
          <Button
            onClick={() => onSave(intervention)}
            disabled={!validation?.valid}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Save Intervention
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}