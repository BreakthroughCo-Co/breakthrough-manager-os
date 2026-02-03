import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Shield, Brain, FileEdit, Workflow, BarChart3, Lock, PlayCircle, StopCircle, MessageSquare, Activity, AlertTriangle, CheckCircle, TrendingUp, Settings } from 'lucide-react';

export default function AgentManagement() {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [permissionForm, setPermissionForm] = useState({
    agent_name: '',
    entity_type: '',
    can_read: true,
    can_create: false,
    can_update: false,
    can_delete: false,
  });

  const queryClient = useQueryClient();

  const { data: performanceLogs = [] } = useQuery({
    queryKey: ['agentPerformanceLogs'],
    queryFn: () => base44.entities.AgentPerformanceLog.list('-execution_date', 100),
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ['agentPermissions'],
    queryFn: () => base44.entities.AgentPermission.list(),
  });

  const createPermissionMutation = useMutation({
    mutationFn: (data) => base44.entities.AgentPermission.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agentPermissions'] });
      setIsPermissionDialogOpen(false);
    },
  });

  const updatePermissionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AgentPermission.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agentPermissions'] });
    },
  });

  const agents = [
    {
      name: 'Clinical Governance',
      id: 'clinical_governance',
      icon: Shield,
      color: 'bg-red-100 text-red-800',
      status: 'active',
      authority: 'Validation & Compliance',
      deny: ['Create clinical content', 'Modify decisions', 'Access patient identifiers'],
      capabilities: ['Validate BSPs', 'Enforce standards', 'Block non-compliant documents'],
    },
    {
      name: 'Behavioural Intelligence',
      id: 'behavioural_intelligence',
      icon: Brain,
      color: 'bg-purple-100 text-purple-800',
      status: 'active',
      authority: 'Pattern Analysis Only',
      deny: ['Recommend interventions', 'Modify plans', 'Make clinical judgements'],
      capabilities: ['Analyze ABC data', 'Calculate risk scores', 'Flag trends'],
    },
    {
      name: 'BSP Authoring Assistant',
      id: 'bsp_authoring_assistant',
      icon: FileEdit,
      color: 'bg-blue-100 text-blue-800',
      status: 'active',
      authority: 'Suggest Only',
      deny: ['Publish documents', 'Invent evidence', 'Approve plans'],
      capabilities: ['Suggest text improvements', 'Flag compliance gaps', 'Quality scoring'],
    },
    {
      name: 'Compliance Automation',
      id: 'compliance_automation',
      icon: Workflow,
      color: 'bg-green-100 text-green-800',
      status: 'active',
      authority: 'Full Automation Within Rules',
      deny: ['Clinical judgements', 'Override approvals', 'Skip mandatory steps'],
      capabilities: ['Monitor timelines', 'Trigger reviews', 'Generate audit packs'],
    },
    {
      name: 'Executive Intelligence',
      id: 'executive_intelligence',
      icon: BarChart3,
      color: 'bg-orange-100 text-orange-800',
      status: 'active',
      authority: 'Read-Only Strategic Insight',
      deny: ['Access participant details', 'Make operational changes', 'View clinical content'],
      capabilities: ['Aggregate metrics', 'Generate board reports', 'Strategic alerts'],
    },
    {
      name: 'System Integrity',
      id: 'system_integrity',
      icon: Lock,
      color: 'bg-slate-100 text-slate-800',
      status: 'active',
      authority: 'Monitor & Validate All Agents',
      deny: ['Execute agent tasks', 'Modify configurations', 'Suppress violations'],
      capabilities: ['Validate outputs', 'Enforce policies', 'Maintain audit logs'],
    },
    {
      name: 'Compliance Auditor',
      id: 'compliance_auditor',
      icon: Shield,
      color: 'bg-indigo-100 text-indigo-800',
      status: 'active',
      authority: 'Proactive Compliance Scanning',
      deny: ['Modify records', 'Access clinical details', 'Approve documents'],
      capabilities: ['Scan for gaps', 'Simulate audits', 'Generate compliance reports'],
    },
    {
      name: 'Client Outreach',
      id: 'client_outreach',
      icon: MessageSquare,
      color: 'bg-teal-100 text-teal-800',
      status: 'active',
      authority: 'Automated Communication',
      deny: ['Share clinical details', 'Make service decisions', 'Contact opt-out clients'],
      capabilities: ['Send scheduled messages', 'Trigger reminders', 'Log all communications'],
    },
    {
      name: 'Clinical Decision Support',
      id: 'clinical_decision_support',
      icon: Brain,
      color: 'bg-pink-100 text-pink-800',
      status: 'active',
      authority: 'Evidence-Based Suggestions Only',
      deny: ['Make final decisions', 'Modify plans', 'Override practitioners'],
      capabilities: ['Analyze patterns', 'Suggest interventions', 'Cite research'],
    },
  ];

  const getAgentStats = (agentId) => {
    const logs = performanceLogs.filter(log => log.agent_name === agentId);
    const total = logs.length;
    const successful = logs.filter(log => log.status === 'success').length;
    const failed = logs.filter(log => log.status === 'failed' || log.status === 'error').length;
    const avgExecutionTime = total > 0 
      ? Math.round(logs.reduce((sum, log) => sum + (log.execution_time_ms || 0), 0) / total)
      : 0;
    
    const feedbacks = logs.filter(log => log.user_feedback);
    const helpfulCount = feedbacks.filter(log => log.user_feedback === 'helpful').length;
    const feedbackScore = feedbacks.length > 0 
      ? Math.round((helpfulCount / feedbacks.length) * 100)
      : 0;

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
      avgExecutionTime,
      feedbackScore,
      totalFeedbacks: feedbacks.length,
    };
  };

  const agentPermissions = (agentId) => {
    return permissions.filter(p => p.agent_name === agentId && p.is_active);
  };

  const handleSavePermission = async () => {
    const user = await base44.auth.me();
    await createPermissionMutation.mutateAsync({
      ...permissionForm,
      configured_by: user.email,
      configured_date: new Date().toISOString(),
    });
    setPermissionForm({
      agent_name: '',
      entity_type: '',
      can_read: true,
      can_create: false,
      can_update: false,
      can_delete: false,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Agent Management</h1>
        <p className="text-muted-foreground">Configure, monitor, and control the intelligent agent suite</p>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <Shield className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <p className="font-medium">Agent Design Principles</p>
          <p className="text-sm">One agent = one authority • Structured inputs/outputs • Explicit boundaries • Event-triggered • Logged & reviewable</p>
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="performance">Performance Analytics</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agents.map(agent => {
              const Icon = agent.icon;
              const stats = getAgentStats(agent.id);
              return (
                <Card key={agent.id} className="border-l-4 border-l-teal-500">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg ${agent.color} flex items-center justify-center`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{agent.name}</CardTitle>
                          <Badge className={agent.color}>{agent.authority}</Badge>
                        </div>
                      </div>
                      <Badge variant={agent.status === 'active' ? 'default' : 'outline'}>
                        {agent.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 rounded-lg p-3">
                      <div>
                        <p className="text-muted-foreground">Success Rate</p>
                        <p className="font-semibold text-green-600">{stats.successRate}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Tasks</p>
                        <p className="font-semibold">{stats.total}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg Time</p>
                        <p className="font-semibold">{stats.avgExecutionTime}ms</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">User Rating</p>
                        <p className="font-semibold text-blue-600">{stats.feedbackScore}%</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-1">Capabilities:</p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {agent.capabilities.map((cap, i) => (
                          <li key={i} className="text-muted-foreground">{cap}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium mb-1 text-red-900">Explicit Deny-List:</p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {agent.deny.map((item, i) => (
                          <li key={i} className="text-red-700">{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setSelectedAgent(agent.id)}
                      >
                        <Activity className="w-4 h-4 mr-1" />
                        View Logs
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setPermissionForm({ ...permissionForm, agent_name: agent.id });
                          setIsPermissionDialogOpen(true);
                        }}
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        Permissions
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {agents.map(agent => {
                  const stats = getAgentStats(agent.id);
                  const Icon = agent.icon;
                  return (
                    <div key={agent.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg ${agent.color} flex items-center justify-center`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{agent.name}</h4>
                            <p className="text-xs text-muted-foreground">{stats.total} total executions</p>
                          </div>
                        </div>
                        <Badge variant={stats.successRate >= 90 ? 'default' : stats.successRate >= 70 ? 'secondary' : 'destructive'}>
                          {stats.successRate}% success
                        </Badge>
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        <div className="text-center">
                          <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-1" />
                          <p className="text-sm font-semibold">{stats.successful}</p>
                          <p className="text-xs text-muted-foreground">Successful</p>
                        </div>
                        <div className="text-center">
                          <AlertTriangle className="w-6 h-6 text-red-600 mx-auto mb-1" />
                          <p className="text-sm font-semibold">{stats.failed}</p>
                          <p className="text-xs text-muted-foreground">Failed</p>
                        </div>
                        <div className="text-center">
                          <Activity className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                          <p className="text-sm font-semibold">{stats.avgExecutionTime}ms</p>
                          <p className="text-xs text-muted-foreground">Avg Time</p>
                        </div>
                        <div className="text-center">
                          <TrendingUp className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                          <p className="text-sm font-semibold">{stats.feedbackScore}%</p>
                          <p className="text-xs text-muted-foreground">User Rating</p>
                        </div>
                      </div>

                      <Progress value={stats.successRate} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {selectedAgent && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Logs - {agents.find(a => a.id === selectedAgent)?.name}</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setSelectedAgent(null)}>
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {performanceLogs
                    .filter(log => log.agent_name === selectedAgent)
                    .slice(0, 10)
                    .map(log => (
                      <div key={log.id} className="border rounded p-3 text-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{log.task_type}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                              {log.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(log.execution_date).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        {log.error_message && (
                          <p className="text-xs text-red-600 mt-1">{log.error_message}</p>
                        )}
                        {log.user_feedback && (
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-xs text-muted-foreground">
                              User Feedback: <span className="font-medium">{log.user_feedback}</span>
                            </p>
                            {log.feedback_comment && (
                              <p className="text-xs mt-1">{log.feedback_comment}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Configure granular data access permissions for each agent</p>
            <Dialog open={isPermissionDialogOpen} onOpenChange={setIsPermissionDialogOpen}>
              <DialogTrigger asChild>
                <Button>Add Permission</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Configure Agent Permission</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Agent</Label>
                    <Select
                      value={permissionForm.agent_name}
                      onValueChange={(val) => setPermissionForm({...permissionForm, agent_name: val})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select agent..." />
                      </SelectTrigger>
                      <SelectContent>
                        {agents.map(agent => (
                          <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Entity Type</Label>
                    <Select
                      value={permissionForm.entity_type}
                      onValueChange={(val) => setPermissionForm({...permissionForm, entity_type: val})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select entity..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Client">Client</SelectItem>
                        <SelectItem value="BehaviourSupportPlan">Behaviour Support Plan</SelectItem>
                        <SelectItem value="FunctionalBehaviourAssessment">FBA</SelectItem>
                        <SelectItem value="CaseNote">Case Note</SelectItem>
                        <SelectItem value="ComplianceItem">Compliance Item</SelectItem>
                        <SelectItem value="RiskAssessment">Risk Assessment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Can Read</Label>
                      <Switch
                        checked={permissionForm.can_read}
                        onCheckedChange={(val) => setPermissionForm({...permissionForm, can_read: val})}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Can Create</Label>
                      <Switch
                        checked={permissionForm.can_create}
                        onCheckedChange={(val) => setPermissionForm({...permissionForm, can_create: val})}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Can Update</Label>
                      <Switch
                        checked={permissionForm.can_update}
                        onCheckedChange={(val) => setPermissionForm({...permissionForm, can_update: val})}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Can Delete</Label>
                      <Switch
                        checked={permissionForm.can_delete}
                        onCheckedChange={(val) => setPermissionForm({...permissionForm, can_delete: val})}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleSavePermission}
                    disabled={!permissionForm.agent_name || !permissionForm.entity_type}
                    className="w-full"
                  >
                    Save Permission
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {agents.map(agent => {
              const agentPerms = agentPermissions(agent.id);
              const Icon = agent.icon;
              return (
                <Card key={agent.id}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${agent.color} flex items-center justify-center`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{agent.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{agentPerms.length} permissions configured</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {agentPerms.length > 0 ? (
                      <div className="space-y-2">
                        {agentPerms.map(perm => (
                          <div key={perm.id} className="border rounded p-3 text-sm">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{perm.entity_type}</span>
                              <Switch
                                checked={perm.is_active}
                                onCheckedChange={(val) => 
                                  updatePermissionMutation.mutate({
                                    id: perm.id,
                                    data: { is_active: val }
                                  })
                                }
                              />
                            </div>
                            <div className="flex gap-2">
                              {perm.can_read && <Badge variant="secondary">Read</Badge>}
                              {perm.can_create && <Badge variant="secondary">Create</Badge>}
                              {perm.can_update && <Badge variant="secondary">Update</Badge>}
                              {perm.can_delete && <Badge variant="destructive">Delete</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No permissions configured</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}