import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Zap,
  Plus,
  Play,
  Pause,
  Edit,
  Trash2,
  Settings,
  Calendar,
  AlertTriangle,
  CheckCircle,
  FileText,
  Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const emptyTrigger = {
  name: '',
  description: '',
  trigger_type: 'plan_expiry',
  entity_type: 'Client',
  condition_field: 'plan_end_date',
  condition_operator: 'days_until',
  condition_value: '30',
  action_type: 'create_task',
  action_config: '',
  is_active: true
};

const triggerTypeConfig = {
  plan_expiry: { label: 'Plan Expiry', icon: Calendar, color: 'bg-blue-100 text-blue-700' },
  compliance_status: { label: 'Compliance Status', icon: AlertTriangle, color: 'bg-amber-100 text-amber-700' },
  funding_threshold: { label: 'Funding Threshold', icon: FileText, color: 'bg-purple-100 text-purple-700' },
  task_overdue: { label: 'Task Overdue', icon: AlertTriangle, color: 'bg-red-100 text-red-700' },
  custom: { label: 'Custom', icon: Settings, color: 'bg-slate-100 text-slate-700' },
};

const presetTriggers = [
  {
    name: 'Plan Review Reminder (30 days)',
    description: 'Create a task when client plan expires within 30 days',
    trigger_type: 'plan_expiry',
    entity_type: 'Client',
    condition_field: 'plan_end_date',
    condition_operator: 'days_until',
    condition_value: '30',
    action_type: 'create_task',
    action_config: JSON.stringify({ title: 'Plan Review Required', category: 'Clinical', priority: 'high' })
  },
  {
    name: 'Non-Compliance Alert',
    description: 'Create compliance review task when item becomes non-compliant',
    trigger_type: 'compliance_status',
    entity_type: 'ComplianceItem',
    condition_field: 'status',
    condition_operator: 'equals',
    condition_value: 'non_compliant',
    action_type: 'create_task',
    action_config: JSON.stringify({ title: 'Compliance Review Required', category: 'Compliance', priority: 'urgent' })
  },
  {
    name: 'Funding Alert (80%)',
    description: 'Notify when client funding utilization exceeds 80%',
    trigger_type: 'funding_threshold',
    entity_type: 'Client',
    condition_field: 'funding_utilised',
    condition_operator: 'greater_than',
    condition_value: '80',
    action_type: 'create_task',
    action_config: JSON.stringify({ title: 'Funding Review Required', category: 'Finance', priority: 'high' })
  }
];

export default function WorkflowTriggers() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState(null);
  const [formData, setFormData] = useState(emptyTrigger);

  const queryClient = useQueryClient();

  const { data: triggers = [], isLoading } = useQuery({
    queryKey: ['triggers'],
    queryFn: () => base44.entities.WorkflowTrigger.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkflowTrigger.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triggers'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WorkflowTrigger.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triggers'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WorkflowTrigger.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['triggers'] }),
  });

  const handleOpenDialog = (trigger = null) => {
    if (trigger) {
      setEditingTrigger(trigger);
      setFormData(trigger);
    } else {
      setEditingTrigger(null);
      setFormData(emptyTrigger);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTrigger(null);
    setFormData(emptyTrigger);
  };

  const handleSubmit = () => {
    if (editingTrigger) {
      updateMutation.mutate({ id: editingTrigger.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleToggleActive = (trigger) => {
    updateMutation.mutate({ id: trigger.id, data: { ...trigger, is_active: !trigger.is_active } });
  };

  const handleCreatePreset = (preset) => {
    createMutation.mutate({ ...preset, is_active: true });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Workflow Triggers</h2>
          <p className="text-slate-500 mt-1">Configure automated actions based on data changes</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Trigger
        </Button>
      </div>

      {/* Quick Setup Presets */}
      {triggers.length === 0 && (
        <Card className="bg-teal-50 border-teal-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-5 h-5 text-teal-600" />
              Quick Setup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">Get started with these recommended workflow triggers:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {presetTriggers.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => handleCreatePreset(preset)}
                  className="p-4 bg-white rounded-xl border border-teal-200 text-left hover:shadow-md transition-all"
                >
                  <p className="font-medium text-slate-900 text-sm">{preset.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{preset.description}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Triggers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {triggers.map((trigger) => {
          const config = triggerTypeConfig[trigger.trigger_type] || triggerTypeConfig.custom;
          const Icon = config.icon;

          return (
            <Card key={trigger.id} className={cn(!trigger.is_active && "opacity-60")}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", config.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{trigger.name}</h3>
                      <Badge variant="outline" className="mt-1">{trigger.entity_type}</Badge>
                    </div>
                  </div>
                  <Switch
                    checked={trigger.is_active}
                    onCheckedChange={() => handleToggleActive(trigger)}
                  />
                </div>

                {trigger.description && (
                  <p className="text-sm text-slate-600 mb-4">{trigger.description}</p>
                )}

                <div className="text-xs text-slate-500 space-y-1 mb-4">
                  <p>
                    <span className="font-medium">When:</span> {trigger.condition_field} {trigger.condition_operator.replace(/_/g, ' ')} {trigger.condition_value}
                  </p>
                  <p>
                    <span className="font-medium">Action:</span> {trigger.action_type.replace(/_/g, ' ')}
                  </p>
                  {trigger.last_triggered && (
                    <p>
                      <span className="font-medium">Last triggered:</span> {format(new Date(trigger.last_triggered), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpenDialog(trigger)}>
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(trigger.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {triggers.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <Zap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No workflow triggers configured</p>
          <p className="text-sm text-slate-400">Create triggers to automate routine tasks</p>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTrigger ? 'Edit Trigger' : 'Create Trigger'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Trigger name"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What does this trigger do?"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Trigger Type</Label>
                <Select
                  value={formData.trigger_type}
                  onValueChange={(v) => setFormData({ ...formData, trigger_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plan_expiry">Plan Expiry</SelectItem>
                    <SelectItem value="compliance_status">Compliance Status</SelectItem>
                    <SelectItem value="funding_threshold">Funding Threshold</SelectItem>
                    <SelectItem value="task_overdue">Task Overdue</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Entity Type</Label>
                <Select
                  value={formData.entity_type}
                  onValueChange={(v) => setFormData({ ...formData, entity_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Client">Client</SelectItem>
                    <SelectItem value="ComplianceItem">Compliance Item</SelectItem>
                    <SelectItem value="Task">Task</SelectItem>
                    <SelectItem value="Practitioner">Practitioner</SelectItem>
                    <SelectItem value="BillingRecord">Billing Record</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Field</Label>
                <Input
                  value={formData.condition_field}
                  onChange={(e) => setFormData({ ...formData, condition_field: e.target.value })}
                  placeholder="e.g., status"
                />
              </div>
              <div>
                <Label>Operator</Label>
                <Select
                  value={formData.condition_operator}
                  onValueChange={(v) => setFormData({ ...formData, condition_operator: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">Equals</SelectItem>
                    <SelectItem value="not_equals">Not Equals</SelectItem>
                    <SelectItem value="greater_than">Greater Than</SelectItem>
                    <SelectItem value="less_than">Less Than</SelectItem>
                    <SelectItem value="days_until">Days Until</SelectItem>
                    <SelectItem value="days_since">Days Since</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Value</Label>
                <Input
                  value={formData.condition_value}
                  onChange={(e) => setFormData({ ...formData, condition_value: e.target.value })}
                  placeholder="e.g., 30"
                />
              </div>
            </div>
            <div>
              <Label>Action</Label>
              <Select
                value={formData.action_type}
                onValueChange={(v) => setFormData({ ...formData, action_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="create_task">Create Task</SelectItem>
                  <SelectItem value="send_notification">Send Notification</SelectItem>
                  <SelectItem value="send_email">Send Email</SelectItem>
                  <SelectItem value="update_status">Update Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name || !formData.trigger_type}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {editingTrigger ? 'Update' : 'Create'} Trigger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}