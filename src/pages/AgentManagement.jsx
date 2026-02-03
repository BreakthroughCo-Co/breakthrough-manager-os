import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Brain, FileEdit, Workflow, BarChart3, Lock, PlayCircle, StopCircle, MessageSquare } from 'lucide-react';

export default function AgentManagement() {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Agent Management</h1>
        <p className="text-muted-foreground">Configure and monitor the intelligent agent suite</p>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <Shield className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <p className="font-medium">Agent Design Principles</p>
          <p className="text-sm">One agent = one authority • Structured inputs/outputs • Explicit boundaries • Event-triggered • Logged & reviewable</p>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map(agent => {
          const Icon = agent.icon;
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
                  <Button size="sm" variant="outline" disabled>
                    <PlayCircle className="w-4 h-4 mr-1" />
                    Test
                  </Button>
                  <Button size="sm" variant="outline" disabled>
                    View Logs
                  </Button>
                  <Button size="sm" variant="outline" disabled>
                    <StopCircle className="w-4 h-4 mr-1" />
                    Disable
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agent Interaction Architecture</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>Clinical Governance</strong> validates documents before publication</p>
            <p><strong>Behavioural Intelligence</strong> analyzes data and raises risk alerts</p>
            <p><strong>BSP Authoring Assistant</strong> helps practitioners write better plans</p>
            <p><strong>Compliance Automation</strong> executes workflows automatically</p>
            <p><strong>Executive Intelligence</strong> aggregates insights for leadership</p>
            <p><strong>System Integrity</strong> monitors all agents for correctness</p>
            <hr className="my-3" />
            <p className="text-muted-foreground">All agents are logged, reviewable, and can be disabled per tenant. No agent has unrestricted access.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}