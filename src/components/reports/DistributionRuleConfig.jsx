import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Plus, Trash2 } from 'lucide-react';

export default function DistributionRuleConfig() {
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    rule_name: '',
    report_type: '',
    report_status: 'approved',
    recipient_emails: '',
    frequency: 'immediate',
    include_attachments: true,
    include_summary_text: true
  });

  const queryClient = useQueryClient();

  const { data: rules } = useQuery({
    queryKey: ['distributionRules'],
    queryFn: async () => {
      const data = await base44.entities.DistributionRule.list();
      return data || [];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (ruleData) => {
      const emails = ruleData.recipient_emails.split(',').map(e => e.trim());
      return base44.entities.DistributionRule.create({
        ...ruleData,
        recipient_emails: emails
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distributionRules'] });
      setFormData({
        rule_name: '',
        report_type: '',
        report_status: 'approved',
        recipient_emails: '',
        frequency: 'immediate',
        include_attachments: true,
        include_summary_text: true
      });
      setIsCreating(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (ruleId) => base44.entities.DistributionRule.delete(ruleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['distributionRules'] })
  });

  const handleCreate = () => {
    if (!formData.rule_name || !formData.report_type || !formData.recipient_emails) {
      alert('Please fill in all required fields');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <Tabs defaultValue="basic" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="basic">Basic Rules</TabsTrigger>
        <TabsTrigger value="advanced">Advanced Config</TabsTrigger>
      </TabsList>

      <TabsContent value="basic" className="space-y-4 mt-4">
        {!isCreating ? (
          <div className="flex gap-2 mb-4">
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Distribution Rule
            </Button>
          </div>
        ) : (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-base">Create Distribution Rule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-semibold">Rule Name</label>
              <Input
                placeholder="e.g., Weekly Compliance to Managers"
                value={formData.rule_name}
                onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold">Report Type</label>
                <Select value={formData.report_type} onValueChange={(v) => setFormData({ ...formData, report_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Report Types</SelectItem>
                    <SelectItem value="practitioner_performance">Practitioner Performance</SelectItem>
                    <SelectItem value="compliance_summary">Compliance Summary</SelectItem>
                    <SelectItem value="financial_operations">Financial Operations</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-semibold">When Report Status</label>
                <Select value={formData.report_status} onValueChange={(v) => setFormData({ ...formData, report_status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Status</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold">Recipients (comma-separated emails)</label>
              <Input
                placeholder="manager1@example.com, manager2@example.com"
                value={formData.recipient_emails}
                onChange={(e) => setFormData({ ...formData, recipient_emails: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-semibold">Frequency</label>
              <Select value={formData.frequency} onValueChange={(v) => setFormData({ ...formData, frequency: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediately</SelectItem>
                  <SelectItem value="on_approval">On Approval</SelectItem>
                  <SelectItem value="weekly_summary">Weekly Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="flex-1"
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Create Rule
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsCreating(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {rules && rules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Rules</CardTitle>
            <CardDescription>{rules.length} rule(s) configured</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rules.map(rule => (
                <div key={rule.id} className="flex items-start justify-between p-3 border rounded hover:bg-slate-50">
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{rule.rule_name}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {rule.report_type === 'all' ? 'All reports' : rule.report_type.replace(/_/g, ' ')} • 
                      {rule.recipient_emails?.length || 0} recipient(s)
                    </p>
                    <div className="flex gap-1 mt-2">
                      {rule.is_active ? (
                        <Badge variant="outline" className="text-xs">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-slate-500">Inactive</Badge>
                      )}
                      <Badge variant="outline" className="text-xs">{rule.frequency}</Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(rule.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}