import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Settings, Save, RotateCcw } from 'lucide-react';

export default function AlertThresholdSettings() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});

  const { data: thresholds, isLoading } = useQuery({
    queryKey: ['alertThresholds'],
    queryFn: async () => {
      try {
        const data = await base44.entities.AlertThresholdConfig.list();
        return data || [];
      } catch (e) {
        return [];
      }
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.AlertThresholdConfig.update(data.id, {
        threshold_value: parseFloat(data.threshold_value),
        severity: data.severity,
        enabled: data.enabled,
        create_task_on_alert: data.create_task_on_alert,
        notify_administrators: data.notify_administrators,
        send_email: data.send_email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertThresholds'] });
      setEditingId(null);
      setEditValues({});
    }
  });

  const handleEdit = (threshold) => {
    setEditingId(threshold.id);
    setEditValues({
      threshold_value: threshold.threshold_value,
      severity: threshold.severity,
      enabled: threshold.enabled,
      create_task_on_alert: threshold.create_task_on_alert,
      notify_administrators: threshold.notify_administrators,
      send_email: threshold.send_email
    });
  };

  const handleSave = (id) => {
    updateMutation.mutate({ id, ...editValues });
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (isLoading) {
    return <Card><CardContent className="flex justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Alert Threshold Configuration
        </CardTitle>
        <CardDescription>
          Customize sensitivity and actions for each compliance alert type
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {thresholds && thresholds.map((threshold) => (
            <div key={threshold.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900 capitalize">
                    {threshold.alert_type.replace(/_/g, ' ')}
                  </h4>
                  <p className="text-sm text-slate-600 mt-1">{threshold.description}</p>
                </div>
                <Badge className={getSeverityColor(threshold.severity)}>
                  {threshold.severity}
                </Badge>
              </div>

              {editingId === threshold.id ? (
                <div className="space-y-3 bg-slate-50 p-3 rounded">
                  {/* Threshold Value */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Threshold Value</label>
                      <Input
                        type="number"
                        value={editValues.threshold_value}
                        onChange={(e) => setEditValues({ ...editValues, threshold_value: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Severity</label>
                      <Select value={editValues.severity} onValueChange={(val) => setEditValues({ ...editValues, severity: val })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="critical">Critical</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Enable this alert</span>
                      <Switch
                        checked={editValues.enabled}
                        onCheckedChange={(val) => setEditValues({ ...editValues, enabled: val })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Auto-create task</span>
                      <Switch
                        checked={editValues.create_task_on_alert}
                        onCheckedChange={(val) => setEditValues({ ...editValues, create_task_on_alert: val })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Notify admins</span>
                      <Switch
                        checked={editValues.notify_administrators}
                        onCheckedChange={(val) => setEditValues({ ...editValues, notify_administrators: val })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Send email</span>
                      <Switch
                        checked={editValues.send_email}
                        onCheckedChange={(val) => setEditValues({ ...editValues, send_email: val })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      onClick={() => handleSave(threshold.id)}
                      disabled={updateMutation.isPending}
                      className="flex-1"
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between text-sm">
                  <div className="space-y-1">
                    <div>
                      <span className="text-slate-600">Threshold:</span>
                      <span className="font-semibold ml-2">
                        {threshold.threshold_value} {threshold.threshold_unit}
                      </span>
                    </div>
                    <div className="flex gap-3 text-xs">
                      {threshold.enabled && <Badge variant="secondary">Enabled</Badge>}
                      {threshold.create_task_on_alert && <Badge variant="secondary">Auto-task</Badge>}
                      {threshold.notify_administrators && <Badge variant="secondary">Admin notify</Badge>}
                      {threshold.send_email && <Badge variant="secondary">Email</Badge>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(threshold)}
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}