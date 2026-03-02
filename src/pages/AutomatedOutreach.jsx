import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Zap, Mail, MessageSquare, Play, Plus, RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react';
import DisengagementRiskPanel from '@/components/outreach/DisengagementRiskPanel';

const TRIGGER_LABELS = {
  plan_review_due: 'Plan Review Due',
  overdue_task: 'Overdue Task',
  client_inactivity: 'Client Inactivity',
  funding_threshold: 'Funding Threshold',
  custom: 'Custom'
};

const STATUS_CONFIG = {
  sent: { label: 'Sent', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800', icon: Clock },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-800', icon: XCircle }
};

function WorkflowForm({ workflow, onClose, onSave }) {
  const [form, setForm] = useState(workflow || {
    name: '', description: '', trigger_type: 'plan_review_due', is_active: true,
    condition_days_threshold: 30, channel_email: true, channel_sms: false,
    recipient_type: 'primary_contact', email_subject_template: '',
    email_body_template: '', sms_body_template: '', cooldown_days: 7
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Workflow Name</Label>
          <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g., 30-Day Plan Expiry Alert" />
        </div>
        <div>
          <Label>Trigger Type</Label>
          <Select value={form.trigger_type} onValueChange={v => set('trigger_type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Days Threshold</Label>
          <Input type="number" value={form.condition_days_threshold} onChange={e => set('condition_days_threshold', parseInt(e.target.value))} />
        </div>
        <div>
          <Label>Recipient</Label>
          <Select value={form.recipient_type} onValueChange={v => set('recipient_type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="primary_contact">Primary Contact</SelectItem>
              <SelectItem value="practitioner">Practitioner</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Cooldown (days)</Label>
          <Input type="number" value={form.cooldown_days} onChange={e => set('cooldown_days', parseInt(e.target.value))} />
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex items-center gap-2">
          <Switch checked={form.channel_email} onCheckedChange={v => set('channel_email', v)} />
          <Label>Email (Gmail)</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={form.channel_sms} onCheckedChange={v => set('channel_sms', v)} />
          <Label>SMS (Twilio — configure secrets)</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={form.is_active} onCheckedChange={v => set('is_active', v)} />
          <Label>Active</Label>
        </div>
      </div>

      {form.channel_email && (
        <div className="space-y-2">
          <div>
            <Label>Email Subject Template</Label>
            <Input value={form.email_subject_template} onChange={e => set('email_subject_template', e.target.value)} placeholder="e.g., NDIS Plan Review Due — {{client_name}}" />
          </div>
          <div>
            <Label>Email Body Template</Label>
            <Textarea rows={4} value={form.email_body_template} onChange={e => set('email_body_template', e.target.value)} placeholder="Dear {{contact_name}}, this is a reminder that..." />
          </div>
        </div>
      )}

      {form.channel_sms && (
        <div>
          <Label>SMS Body Template (max 160 chars)</Label>
          <Textarea rows={2} value={form.sms_body_template} onChange={e => set('sms_body_template', e.target.value)} maxLength={160} />
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave(form)} className="bg-teal-600 hover:bg-teal-700 text-white">
          {workflow ? 'Update Workflow' : 'Create Workflow'}
        </Button>
      </div>
    </div>
  );
}

export default function AutomatedOutreach() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [runningTrigger, setRunningTrigger] = useState(null);
  const [runResult, setRunResult] = useState(null);

  const { data: workflows = [] } = useQuery({
    queryKey: ['outreach-workflows'],
    queryFn: () => base44.entities.AutomatedOutreachWorkflow.list('-created_date')
  });

  const { data: commLogs = [] } = useQuery({
    queryKey: ['outreach-logs'],
    queryFn: () => base44.entities.ClientCommunication.filter({ communication_type: 'outreach' }, '-created_date', 50)
  });

  const createMutation = useMutation({
    mutationFn: (data) => data.id
      ? base44.entities.AutomatedOutreachWorkflow.update(data.id, data)
      : base44.entities.AutomatedOutreachWorkflow.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['outreach-workflows'] }); setShowForm(false); setEditTarget(null); }
  });

  const runTrigger = async (fnName, label) => {
    setRunningTrigger(fnName);
    setRunResult(null);
    const res = await base44.functions.invoke(fnName, {});
    setRunResult({ label, data: res.data });
    setRunningTrigger(null);
    qc.invalidateQueries({ queryKey: ['outreach-logs'] });
  };

  const activeCount = workflows.filter(w => w.is_active).length;
  const sentToday = commLogs.filter(l => l.status === 'sent' && l.created_date?.startsWith(new Date().toISOString().split('T')[0])).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Automated Outreach</h2>
          <p className="text-sm text-slate-500 mt-1">Configure trigger-based communication workflows for NDIS client management</p>
        </div>
        <Button onClick={() => { setEditTarget(null); setShowForm(true); }} className="bg-teal-600 hover:bg-teal-700 text-white">
          <Plus className="w-4 h-4" /> New Workflow
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Workflows', value: activeCount, color: 'text-teal-600' },
          { label: 'Total Workflows', value: workflows.length, color: 'text-slate-700' },
          { label: 'Sent Today', value: sentToday, color: 'text-green-600' },
          { label: 'Total Logged', value: commLogs.length, color: 'text-blue-600' }
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Manual Trigger Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Manual Trigger Execution</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {[
            { fn: 'checkPlanReviews', label: 'Check Plan Reviews' },
            { fn: 'checkOverdueTasks', label: 'Check Overdue Tasks' },
            { fn: 'checkClientInactivity', label: 'Check Client Inactivity' }
          ].map(t => (
            <Button
              key={t.fn}
              variant="outline"
              onClick={() => runTrigger(t.fn, t.label)}
              disabled={runningTrigger === t.fn}
              className="gap-2"
            >
              {runningTrigger === t.fn ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {t.label}
            </Button>
          ))}
        </CardContent>
        {runResult && (
          <CardContent className="pt-0">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-xs font-mono">
              <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">{runResult.label} — Result:</p>
              <p className="text-teal-600">Triggered: {runResult.data?.triggered_count ?? 0} communications</p>
              {runResult.data?.triggered?.map((t, i) => (
                <p key={i} className="text-slate-600 dark:text-slate-400">→ {t.client_name || t.task_title} ({t.days_until_expiry ?? t.days_overdue ?? t.days_since_last_session}d)</p>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Workflow List */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-700 dark:text-slate-300">Configured Workflows</h3>
        {workflows.length === 0 && (
          <Card><CardContent className="p-8 text-center text-slate-400">No workflows configured. Create one to begin automated outreach.</CardContent></Card>
        )}
        {workflows.map(w => (
          <Card key={w.id} className={!w.is_active ? 'opacity-60' : ''}>
            <CardContent className="p-4 flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-teal-500" />
                  <span className="font-semibold text-slate-900 dark:text-slate-50">{w.name}</span>
                  <Badge className={w.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'}>
                    {w.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Badge variant="outline">{TRIGGER_LABELS[w.trigger_type]}</Badge>
                </div>
                <div className="flex gap-4 text-xs text-slate-500">
                  <span>Threshold: {w.condition_days_threshold}d</span>
                  <span>Cooldown: {w.cooldown_days}d</span>
                  <span>Recipient: {w.recipient_type}</span>
                  {w.channel_email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />Email</span>}
                  {w.channel_sms && <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />SMS</span>}
                </div>
                {w.last_run_at && <p className="text-xs text-slate-400">Last run: {new Date(w.last_run_at).toLocaleString('en-AU')}</p>}
                <p className="text-xs text-slate-400">Total triggered: {w.total_triggered || 0}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setEditTarget(w); setShowForm(true); }}>Edit</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Communication Logs */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-700 dark:text-slate-300">Communication Audit Log</h3>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    {['Date', 'Client', 'Subject', 'Status', 'Channels'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {commLogs.slice(0, 25).map(log => {
                    const s = STATUS_CONFIG[log.status] || STATUS_CONFIG.pending;
                    const Icon = s.icon;
                    let parsed = {};
                    try { parsed = JSON.parse(log.content || '{}'); } catch {}
                    return (
                      <tr key={log.id} className="border-t border-slate-100 dark:border-slate-700">
                        <td className="px-4 py-2 text-xs text-slate-500">{log.created_date ? new Date(log.created_date).toLocaleDateString('en-AU') : '—'}</td>
                        <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-300">{log.client_name || '—'}</td>
                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400 max-w-xs truncate">{log.subject || '—'}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>
                            <Icon className="w-3 h-3" />{s.label}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-slate-500">
                          {parsed.channels?.email && <span className="mr-1">Email</span>}
                          {parsed.channels?.sms && <span>SMS</span>}
                        </td>
                      </tr>
                    );
                  })}
                  {commLogs.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No communications logged yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Disengagement Risk Engine */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-700 dark:text-slate-300">AI Disengagement Risk Engine</h3>
        <DisengagementRiskPanel />
      </div>

      {/* Workflow Form Dialog */}
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditTarget(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Workflow' : 'New Outreach Workflow'}</DialogTitle>
          </DialogHeader>
          <WorkflowForm
            workflow={editTarget}
            onClose={() => { setShowForm(false); setEditTarget(null); }}
            onSave={(data) => createMutation.mutate(editTarget ? { ...data, id: editTarget.id } : data)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}