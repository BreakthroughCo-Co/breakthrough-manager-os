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
  Bell,
  Mail,
  RefreshCw,
  ListTodo,
  User
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  screening_expiry: { label: 'Screening Expiry', icon: User, color: 'bg-orange-100 text-orange-700' },
  custom: { label: 'Custom', icon: Settings, color: 'bg-slate-100 text-slate-700' },
};

const actionTypeConfig = {
  create_task: { label: 'Create Task', icon: ListTodo, color: 'bg-teal-100 text-teal-700' },
  send_notification: { label: 'In-App Notification', icon: Bell, color: 'bg-blue-100 text-blue-700' },
  send_email: { label: 'Send Email', icon: Mail, color: 'bg-purple-100 text-purple-700' },
  update_status: { label: 'Update Status', icon: RefreshCw, color: 'bg-amber-100 text-amber-700' },
};

const entityFieldOptions = {
  Client: [
    { value: 'plan_end_date', label: 'Plan End Date', type: 'date' },
    { value: 'status', label: 'Status', type: 'select', options: ['active', 'waitlist', 'on_hold', 'discharged', 'plan_review'] },
    { value: 'risk_level', label: 'Risk Level', type: 'select', options: ['low', 'medium', 'high'] },
    { value: 'funding_utilised', label: 'Funding Utilised %', type: 'number' },
  ],
  ComplianceItem: [
    { value: 'status', label: 'Status', type: 'select', options: ['compliant', 'attention_needed', 'non_compliant', 'pending_review'] },
    { value: 'due_date', label: 'Due Date', type: 'date' },
    { value: 'priority', label: 'Priority', type: 'select', options: ['critical', 'high', 'medium', 'low'] },
  ],
  Task: [
    { value: 'due_date', label: 'Due Date', type: 'date' },
    { value: 'status', label: 'Status', type: 'select', options: ['pending', 'in_progress', 'completed', 'deferred'] },
    { value: 'priority', label: 'Priority', type: 'select', options: ['urgent', 'high', 'medium', 'low'] },
  ],
  Practitioner: [
    { value: 'status', label: 'Status', type: 'select', options: ['active', 'on_leave', 'probation', 'inactive'] },
    { value: 'current_caseload', label: 'Current Caseload', type: 'number' },
  ],
  BillingRecord: [
    { value: 'status', label: 'Status', type: 'select', options: ['draft', 'submitted', 'paid', 'rejected', 'queried'] },
    { value: 'service_date', label: 'Service Date', type: 'date' },
  ],
  WorkerScreening: [
    { value: 'expiry_date', label: 'Expiry Date', type: 'date' },
    { value: 'status', label: 'Status', type: 'select', options: ['valid', 'expiring_soon', 'expired', 'pending'] },
  ],
  NDISPlan: [
    { value: 'plan_end_date', label: 'Plan End Date', type: 'date' },
    { value: 'status', label: 'Status', type: 'select', options: ['active', 'expiring_soon', 'expired', 'under_review'] },
  ],
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
    action_config: JSON.stringify({ title: 'Plan Review Required - {{client_name}}', category: 'Clinical', priority: 'high', description: 'NDIS plan expiring soon. Schedule review meeting.' })
  },
  {
    name: 'Non-Compliance Alert',
    description: 'Notify management when compliance item becomes non-compliant',
    trigger_type: 'compliance_status',
    entity_type: 'ComplianceItem',
    condition_field: 'status',
    condition_operator: 'equals',
    condition_value: 'non_compliant',
    action_type: 'send_notification',
    action_config: JSON.stringify({ title: 'Compliance Alert', message: 'Item {{title}} is now non-compliant', recipient: 'management' })
  },
  {
    name: 'Funding Alert (80%)',
    description: 'Create task when client funding utilization exceeds 80%',
    trigger_type: 'funding_threshold',
    entity_type: 'Client',
    condition_field: 'funding_utilised',
    condition_operator: 'greater_than',
    condition_value: '80',
    action_type: 'create_task',
    action_config: JSON.stringify({ title: 'Funding Review - {{client_name}}', category: 'Finance', priority: 'high' })
  },
  {
    name: 'Task Overdue Alert',
    description: 'Notify when task becomes overdue',
    trigger_type: 'task_overdue',
    entity_type: 'Task',
    condition_field: 'due_date',
    condition_operator: 'days_since',
    condition_value: '1',
    action_type: 'send_notification',
    action_config: JSON.stringify({ title: 'Task Overdue', message: 'Task "{{title}}" is overdue', recipient: 'assigned_to' })
  },
  {
    name: 'Worker Screening Expiry (14 days)',
    description: 'Alert when staff screening expires within 14 days',
    trigger_type: 'screening_expiry',
    entity_type: 'WorkerScreening',
    condition_field: 'expiry_date',
    condition_operator: 'days_until',
    condition_value: '14',
    action_type: 'create_task',
    action_config: JSON.stringify({ title: 'Screening Renewal - {{staff_name}}', category: 'HR', priority: 'urgent' })
  },
];

export default function WorkflowTriggers() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState(null);
  const [formData, setFormData] = useState(emptyTrigger);
  const [actionConfig, setActionConfig] = useState({});

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
      try {
        setActionConfig(JSON.parse(trigger.action_config || '{}'));
      } catch { setActionConfig({}); }
    } else {
      setEditingTrigger(null);
      setFormData(emptyTrigger);
      setActionConfig({});
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTrigger(null);
    setFormData(emptyTrigger);
    setActionConfig({});
  };

  const handleSubmit = () => {
    const dataToSave = {
      ...formData,
      action_config: JSON.stringify(actionConfig)
    };
    if (editingTrigger) {
      updateMutation.mutate({ id: editingTrigger.id, data: dataToSave });
    } else {
      createMutation.mutate(dataToSave);
    }
  };

  const handleToggleActive = (trigger) => {
    updateMutation.mutate({ id: trigger.id, data: { ...trigger, is_active: !trigger.is_active } });
  };

  const handleCreatePreset = (preset) => {
    createMutation.mutate({ ...preset, is_active: true });
  };

  const currentEntityFields = entityFieldOptions[formData.entity_type] || [];

  const renderActionConfig = () => {
    switch (formData.action_type) {
      case 'create_task':
        return (
          <div className="space-y-3 bg-teal-50 p-4 rounded-lg">
            <h4 className="font-medium text-teal-900 text-sm">Task Configuration</h4>
            <div>
              <Label className="text-xs">Task Title</Label>
              <Input
                value={actionConfig.title || ''}
                onChange={(e) => setActionConfig({ ...actionConfig, title: e.target.value })}
                placeholder="e.g., Review {{client_name}}'s plan"
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">Use {'{{field_name}}'} for dynamic values</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={actionConfig.category || ''} onValueChange={(v) => setActionConfig({ ...actionConfig, category: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Compliance">Compliance</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Clinical">Clinical</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Priority</Label>
                <Select value={actionConfig.priority || ''} onValueChange={(v) => setActionConfig({ ...actionConfig, priority: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                value={actionConfig.description || ''}
                onChange={(e) => setActionConfig({ ...actionConfig, description: e.target.value })}
                placeholder="Task description..."
                rows={2}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Assign To</Label>
              <Input
                value={actionConfig.assigned_to || ''}
                onChange={(e) => setActionConfig({ ...actionConfig, assigned_to: e.target.value })}
                placeholder="Email or role"
                className="mt-1"
              />
            </div>
          </div>
        );
      case 'send_notification':
        return (
          <div className="space-y-3 bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 text-sm">Notification Configuration</h4>
            <div>
              <Label className="text-xs">Notification Title</Label>
              <Input
                value={actionConfig.title || ''}
                onChange={(e) => setActionConfig({ ...actionConfig, title: e.target.value })}
                placeholder="Notification title"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Message</Label>
              <Textarea
                value={actionConfig.message || ''}
                onChange={(e) => setActionConfig({ ...actionConfig, message: e.target.value })}
                placeholder="Notification message..."
                rows={2}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Recipient</Label>
              <Select value={actionConfig.recipient || ''} onValueChange={(v) => setActionConfig({ ...actionConfig, recipient: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select recipient" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="management">Management</SelectItem>
                  <SelectItem value="assigned_to">Assigned Person</SelectItem>
                  <SelectItem value="all_practitioners">All Practitioners</SelectItem>
                  <SelectItem value="created_by">Record Creator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case 'send_email':
        return (
          <div className="space-y-3 bg-purple-50 p-4 rounded-lg">
            <h4 className="font-medium text-purple-900 text-sm">Email Configuration</h4>
            <div>
              <Label className="text-xs">Email Subject</Label>
              <Input
                value={actionConfig.subject || ''}
                onChange={(e) => setActionConfig({ ...actionConfig, subject: e.target.value })}
                placeholder="Email subject"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Email Body</Label>
              <Textarea
                value={actionConfig.body || ''}
                onChange={(e) => setActionConfig({ ...actionConfig, body: e.target.value })}
                placeholder="Email body content..."
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Recipient Email</Label>
              <Input
                value={actionConfig.recipient_email || ''}
                onChange={(e) => setActionConfig({ ...actionConfig, recipient_email: e.target.value })}
                placeholder="email@example.com or {{field_name}}"
                className="mt-1"
              />
            </div>
          </div>
        );
      case 'update_status':
        return (
          <div className="space-y-3 bg-amber-50 p-4 rounded-lg">
            <h4 className="font-medium text-amber-900 text-sm">Status Update Configuration</h4>
            <div>
              <Label className="text-xs">Field to Update</Label>
              <Input
                value={actionConfig.field || ''}
                onChange={(e) => setActionConfig({ ...actionConfig, field: e.target.value })}
                placeholder="e.g., status"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">New Value</Label>
              <Input
                value={actionConfig.new_value || ''}
                onChange={(e) => setActionConfig({ ...actionConfig, new_value: e.target.value })}
                placeholder="New status value"
                className="mt-1"
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-500" />
            Workflow Automation
          </h2>
          <p className="text-slate-500 mt-1">Configure automated triggers and actions</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Trigger
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-slate-900">{triggers.length}</p>
            <p className="text-xs text-slate-500">Total Triggers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-emerald-600">{triggers.filter(t => t.is_active).length}</p>
            <p className="text-xs text-slate-500">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-blue-600">{triggers.filter(t => t.action_type === 'create_task').length}</p>
            <p className="text-xs text-slate-500">Task Triggers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-purple-600">{triggers.filter(t => t.action_type === 'send_notification').length}</p>
            <p className="text-xs text-slate-500">Notification Triggers</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Setup Presets */}
      {triggers.length === 0 && (
        <Card className="bg-gradient-to-r from-teal-50 to-blue-50 border-teal-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-5 h-5 text-teal-600" />
              Quick Setup - Recommended Triggers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {presetTriggers.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => handleCreatePreset(preset)}
                  className="p-4 bg-white rounded-xl border border-teal-200 text-left hover:shadow-md transition-all"
                >
                  <p className="font-medium text-slate-900 text-sm">{preset.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{preset.description}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">{preset.entity_type}</Badge>
                    <Badge className={actionTypeConfig[preset.action_type]?.color + " text-xs"}>
                      {actionTypeConfig[preset.action_type]?.label}
                    </Badge>
                  </div>
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
          const actionConf = actionTypeConfig[trigger.action_type] || actionTypeConfig.create_task;
          const Icon = config.icon;
          const ActionIcon = actionConf.icon;
          let parsedAction = {};
          try { parsedAction = JSON.parse(trigger.action_config || '{}'); } catch {}

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
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline">{trigger.entity_type}</Badge>
                        <Badge className={actionConf.color}>
                          <ActionIcon className="w-3 h-3 mr-1" />
                          {actionConf.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={trigger.is_active}
                    onCheckedChange={() => handleToggleActive(trigger)}
                  />
                </div>

                {trigger.description && (
                  <p className="text-sm text-slate-600 mb-3">{trigger.description}</p>
                )}

                <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 space-y-1 mb-4">
                  <p><span className="font-medium">When:</span> {trigger.condition_field} {trigger.condition_operator.replace(/_/g, ' ')} {trigger.condition_value}</p>
                  {parsedAction.title && <p><span className="font-medium">Action:</span> {parsedAction.title}</p>}
                  {trigger.last_triggered && (
                    <p><span className="font-medium">Last triggered:</span> {format(new Date(trigger.last_triggered), 'MMM d, yyyy HH:mm')}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpenDialog(trigger)}>
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(trigger.id)} className="text-red-600">
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
          <p className="text-sm text-slate-400">Use the presets above or create custom triggers</p>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTrigger ? 'Edit Trigger' : 'Create Workflow Trigger'}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="trigger" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="trigger">Trigger Condition</TabsTrigger>
              <TabsTrigger value="action">Action Configuration</TabsTrigger>
            </TabsList>

            <TabsContent value="trigger" className="space-y-4 mt-4">
              <div>
                <Label>Trigger Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Plan Review Reminder"
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
                  <Select value={formData.trigger_type} onValueChange={(v) => setFormData({ ...formData, trigger_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(triggerTypeConfig).map(([key, val]) => (
                        <SelectItem key={key} value={key}>{val.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Entity to Monitor</Label>
                  <Select value={formData.entity_type} onValueChange={(v) => setFormData({ ...formData, entity_type: v, condition_field: '' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(entityFieldOptions).map(entity => (
                        <SelectItem key={entity} value={entity}>{entity}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Field</Label>
                  <Select value={formData.condition_field} onValueChange={(v) => setFormData({ ...formData, condition_field: v })}>
                    <SelectTrigger><SelectValue placeholder="Select field" /></SelectTrigger>
                    <SelectContent>
                      {currentEntityFields.map(f => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Operator</Label>
                  <Select value={formData.condition_operator} onValueChange={(v) => setFormData({ ...formData, condition_operator: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
            </TabsContent>

            <TabsContent value="action" className="space-y-4 mt-4">
              <div>
                <Label>Action Type</Label>
                <Select value={formData.action_type} onValueChange={(v) => { setFormData({ ...formData, action_type: v }); setActionConfig({}); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(actionTypeConfig).map(([key, val]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <val.icon className="w-4 h-4" />
                          {val.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {renderActionConfig()}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.name || !formData.trigger_type} className="bg-teal-600 hover:bg-teal-700">
              {editingTrigger ? 'Update' : 'Create'} Trigger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}