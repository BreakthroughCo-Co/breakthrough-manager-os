import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';

export default function SchedulingRulesManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({
    rule_name: '',
    trigger_type: 'date_based',
    client_criteria: '{"status": "active"}',
    message_template: '',
    message_type: 'general_checkin',
    frequency_days: 30,
    auto_schedule: true,
    is_active: true,
    priority: 'medium'
  });

  const queryClient = useQueryClient();

  const { data: rules = [] } = useQuery({
    queryKey: ['outreachRules'],
    queryFn: () => base44.entities.OutreachSchedulingRule.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.OutreachSchedulingRule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outreachRules'] });
      setIsDialogOpen(false);
      resetForm();
      toast.success('Rule created successfully');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OutreachSchedulingRule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outreachRules'] });
      setIsDialogOpen(false);
      resetForm();
      toast.success('Rule updated successfully');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.OutreachSchedulingRule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outreachRules'] });
      toast.success('Rule deleted');
    },
  });

  const resetForm = () => {
    setFormData({
      rule_name: '',
      trigger_type: 'date_based',
      client_criteria: '{"status": "active"}',
      message_template: '',
      message_type: 'general_checkin',
      frequency_days: 30,
      auto_schedule: true,
      is_active: true,
      priority: 'medium'
    });
    setEditingRule(null);
  };

  const handleOpenDialog = (rule = null) => {
    if (rule) {
      setEditingRule(rule);
      setFormData(rule);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleToggleActive = (rule) => {
    updateMutation.mutate({
      id: rule.id,
      data: { is_active: !rule.is_active }
    });
  };

  const triggerTypes = [
    { value: 'date_based', label: 'Date-Based (Regular Intervals)' },
    { value: 'inactivity', label: 'Inactivity Detection' },
    { value: 'milestone', label: 'Milestone (e.g., Plan Review)' },
    { value: 'behavioral', label: 'Behavioral Trigger' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Automated Scheduling Rules</h3>
          <p className="text-sm text-muted-foreground">Define rules to automatically schedule client outreach</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              New Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Edit Rule' : 'Create Scheduling Rule'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Rule Name *</Label>
                <Input
                  value={formData.rule_name}
                  onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                  placeholder="e.g., Monthly Check-in for Active Clients"
                />
              </div>

              <div>
                <Label>Trigger Type *</Label>
                <Select
                  value={formData.trigger_type}
                  onValueChange={(value) => setFormData({ ...formData, trigger_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {triggerTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Client Criteria (JSON) *</Label>
                <Textarea
                  value={formData.client_criteria}
                  onChange={(e) => setFormData({ ...formData, client_criteria: e.target.value })}
                  placeholder='{"status": "active", "risk_level": "high"}'
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Filter criteria to match clients (e.g., status, risk_level, service_type)
                </p>
              </div>

              <div>
                <Label>Message Template *</Label>
                <Textarea
                  value={formData.message_template}
                  onChange={(e) => setFormData({ ...formData, message_template: e.target.value })}
                  placeholder="Hi {client_name}, checking in to see how things are going..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use {'{client_name}'} as placeholder - AI will personalize further
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Message Type</Label>
                  <Select
                    value={formData.message_type}
                    onValueChange={(value) => setFormData({ ...formData, message_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general_checkin">General Check-in</SelectItem>
                      <SelectItem value="progress_celebration">Progress Celebration</SelectItem>
                      <SelectItem value="goal_review">Goal Review</SelectItem>
                      <SelectItem value="support_offer">Support Offer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Frequency (Days)</Label>
                  <Input
                    type="number"
                    value={formData.frequency_days}
                    onChange={(e) => setFormData({ ...formData, frequency_days: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    checked={formData.auto_schedule}
                    onCheckedChange={(checked) => setFormData({ ...formData, auto_schedule: checked })}
                  />
                  <Label>Auto-schedule messages</Label>
                </div>
              </div>

              <Button onClick={handleSubmit} className="w-full">
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {rules.map((rule) => (
          <Card key={rule.id} className={rule.is_active ? '' : 'opacity-60'}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base">{rule.rule_name}</CardTitle>
                  <CardDescription className="mt-1">
                    {triggerTypes.find(t => t.value === rule.trigger_type)?.label} • 
                    Every {rule.frequency_days} days
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                    {rule.is_active ? 'Active' : 'Paused'}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {rule.priority}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm">
                  <p className="text-muted-foreground mb-1">Message Template:</p>
                  <div className="bg-slate-50 rounded p-2 text-xs">
                    {rule.message_template.substring(0, 150)}
                    {rule.message_template.length > 150 && '...'}
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="capitalize text-xs">
                      {rule.message_type.replace(/_/g, ' ')}
                    </Badge>
                    {rule.auto_schedule && <span>• Auto-scheduling enabled</span>}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleActive(rule)}
                    >
                      {rule.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenDialog(rule)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(rule.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {rules.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No scheduling rules defined yet</p>
              <p className="text-sm text-muted-foreground mt-1">Create rules to automate client outreach</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}