import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, FileUp } from 'lucide-react';

export default function IncidentReportDialog({ clientId, clientName, trigger }) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    incident_date: new Date().toISOString().slice(0, 16),
    category: 'client_behaviour',
    severity: 'medium',
    description: '',
    location: '',
    immediate_action_taken: '',
    injuries_sustained: false,
    restrictive_practice_used: false,
  });

  const queryClient = useQueryClient();

  const createIncidentMutation = useMutation({
    mutationFn: (data) => base44.entities.Incident.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      setIsOpen(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setForm({
      incident_date: new Date().toISOString().slice(0, 16),
      category: 'client_behaviour',
      severity: 'medium',
      description: '',
      location: '',
      immediate_action_taken: '',
      injuries_sustained: false,
      restrictive_practice_used: false,
    });
  };

  const handleSubmit = async () => {
    const user = await base44.auth.me();
    
    const incidentData = {
      ...form,
      client_id: clientId,
      client_name: clientName,
      reported_by: user.email,
      status: 'reported',
      follow_up_required: form.severity === 'high' || form.severity === 'critical',
      ndis_reportable: form.category === 'unauthorized_restrictive_practice' || 
                      form.severity === 'critical' || 
                      form.injuries_sustained,
    };

    await createIncidentMutation.mutateAsync(incidentData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report Incident</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {clientName && (
            <Alert>
              <AlertDescription>
                <strong>Client:</strong> {clientName}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Incident Date/Time</Label>
              <Input
                type="datetime-local"
                value={form.incident_date}
                onChange={(e) => setForm({...form, incident_date: e.target.value})}
              />
            </div>
            <div>
              <Label>Severity</Label>
              <Select value={form.severity} onValueChange={(val) => setForm({...form, severity: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(val) => setForm({...form, category: val})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client_behaviour">Client Behaviour</SelectItem>
                <SelectItem value="safety_concern">Safety Concern</SelectItem>
                <SelectItem value="policy_breach">Policy Breach</SelectItem>
                <SelectItem value="medication_error">Medication Error</SelectItem>
                <SelectItem value="injury">Injury</SelectItem>
                <SelectItem value="property_damage">Property Damage</SelectItem>
                <SelectItem value="unauthorized_restrictive_practice">Unauthorized Restrictive Practice</SelectItem>
                <SelectItem value="complaint">Complaint</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Description *</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({...form, description: e.target.value})}
              placeholder="Provide a detailed description of what occurred..."
              rows={4}
            />
          </div>

          <div>
            <Label>Location</Label>
            <Input
              value={form.location}
              onChange={(e) => setForm({...form, location: e.target.value})}
              placeholder="Where did this occur?"
            />
          </div>

          <div>
            <Label>Immediate Action Taken</Label>
            <Textarea
              value={form.immediate_action_taken}
              onChange={(e) => setForm({...form, immediate_action_taken: e.target.value})}
              placeholder="What action was taken immediately following the incident?"
              rows={3}
            />
          </div>

          <div className="space-y-3 border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <Label>Injuries Sustained</Label>
              <Switch
                checked={form.injuries_sustained}
                onCheckedChange={(val) => setForm({...form, injuries_sustained: val})}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Restrictive Practice Used</Label>
              <Switch
                checked={form.restrictive_practice_used}
                onCheckedChange={(val) => setForm({...form, restrictive_practice_used: val})}
              />
            </div>
          </div>

          {(form.severity === 'high' || form.severity === 'critical' || form.injuries_sustained || form.restrictive_practice_used) && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                This incident will be flagged for immediate management review and may require NDIS reporting.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={!form.description || createIncidentMutation.isPending}
              className="flex-1"
            >
              Submit Incident Report
            </Button>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}