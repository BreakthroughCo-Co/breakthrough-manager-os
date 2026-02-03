import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Sparkles,
  Send,
  Loader2,
  FileText,
  Calculator,
  ClipboardCheck,
  Mail,
  PenTool,
  RefreshCw,
  Copy,
  Check,
  Users,
  DollarSign,
  Shield,
  TrendingUp,
  Calendar,
  BookOpen,
  BarChart3,
  Zap,
  Target,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const quickPrompts = [
  {
    icon: PenTool,
    title: 'Draft Case Note',
    prompt: 'Draft a case note for today\'s session with a client who:',
    category: 'Clinical',
    action: 'draft_case_note'
  },
  {
    icon: Calendar,
    title: 'Schedule Appointment',
    prompt: 'I need to schedule an appointment for:',
    category: 'Scheduling',
    action: 'schedule_appointment'
  },
  {
    icon: Activity,
    title: 'Analyze Client Progress',
    prompt: 'Analyze progress patterns and identify any concerns for:',
    category: 'Analysis',
    action: 'analyze_client_progress'
  },
  {
    icon: Target,
    title: 'Prioritize My Tasks',
    prompt: 'Help me prioritize my pending tasks considering:',
    category: 'Productivity',
    action: 'prioritize_tasks'
  },
  {
    icon: BookOpen,
    title: 'Draft BSP Section',
    prompt: 'Draft the environmental strategies section for:',
    category: 'Clinical',
    action: 'draft_bsp_section'
  },
  {
    icon: Mail,
    title: 'Generate Email',
    prompt: 'Write a professional email to a parent about:',
    category: 'Communication',
    action: 'generate_email'
  },
  {
    icon: BarChart3,
    title: 'Summarize Caseload',
    prompt: 'Provide a summary of my current caseload status and any urgent items',
    category: 'Overview',
    action: null
  },
  {
    icon: ClipboardCheck,
    title: 'Compliance Check',
    prompt: 'Review compliance status and highlight any items needing immediate attention',
    category: 'Compliance',
    action: null
  },
];

const reportTemplates = [
  {
    id: 'compliance_report',
    name: 'NDIS Compliance Report',
    icon: Shield,
    description: 'Generate compliance status summary with recommendations'
  },
  {
    id: 'client_progress',
    name: 'Client Progress Summary',
    icon: Users,
    description: 'Summarize client progress and plan utilization'
  },
  {
    id: 'financial_overview',
    name: 'Financial Overview',
    icon: DollarSign,
    description: 'Revenue and billing summary report'
  },
  {
    id: 'practitioner_performance',
    name: 'Practitioner Performance',
    icon: TrendingUp,
    description: 'Team caseload and performance summary'
  },
];

export default function AIAssistant() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [activeTab, setActiveTab] = useState('assistant');
  const [selectedClient, setSelectedClient] = useState('');
  const [actionMode, setActionMode] = useState(null);
  const [actionResult, setActionResult] = useState(null);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: practitioners = [] } = useQuery({
    queryKey: ['practitioners'],
    queryFn: () => base44.entities.Practitioner.list(),
  });

  const { data: complianceItems = [] } = useQuery({
    queryKey: ['compliance'],
    queryFn: () => base44.entities.ComplianceItem.list(),
  });

  const { data: billingRecords = [] } = useQuery({
    queryKey: ['billing'],
    queryFn: () => base44.entities.BillingRecord.list(),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
  });

  const { data: caseNotes = [] } = useQuery({
    queryKey: ['casenotes'],
    queryFn: () => base44.entities.CaseNote.list('-created_date', 50),
  });

  const { data: bsps = [] } = useQuery({
    queryKey: ['bsps'],
    queryFn: () => base44.entities.BehaviourSupportPlan.list('-created_date', 20),
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => base44.entities.Appointment.list('-appointment_date', 100),
  });

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    setResponse('');
    setActionResult(null);
    
    try {
      // Detect if this is an actionable request
      const actionDetection = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this request and determine if it requires system actions.

Request: "${prompt}"

Available Actions:
- draft_case_note: Create a case note summary
- schedule_appointment: Schedule or suggest appointments  
- analyze_client_progress: Analyze client data patterns
- prioritize_tasks: Analyze and prioritize pending tasks
- draft_bsp_section: Draft BSP content
- generate_email: Create email communication

Return JSON:
{
  "requires_action": boolean,
  "action_type": "one of the above or null",
  "confidence": "high/medium/low"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            requires_action: { type: "boolean" },
            action_type: { type: "string" },
            confidence: { type: "string" }
          }
        }
      });

      if (actionDetection.requires_action && actionDetection.confidence !== 'low') {
        setActionMode(actionDetection.action_type);
        await executeAction(actionDetection.action_type, prompt);
      } else {
        // Standard response
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `You are an expert NDIS Practice Manager and Behaviour Support specialist at Breakthrough Coaching & Consulting. You help with clinical documentation, compliance requirements, parent communications, and operational tasks. Be professional, thorough, and ensure all responses align with NDIS Practice Standards and the Behaviour Support Competency Framework.

User Request:
${prompt}

Provide a helpful, professional response. Use markdown formatting where appropriate.`,
        });
        setResponse(result);
      }
    } catch (error) {
      setResponse('Sorry, there was an error processing your request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const executeAction = async (actionType, userPrompt) => {
    let result;
    
    switch (actionType) {
      case 'draft_case_note':
        result = await draftCaseNote(userPrompt);
        break;
      case 'schedule_appointment':
        result = await scheduleAppointment(userPrompt);
        break;
      case 'analyze_client_progress':
        result = await analyzeClientProgress(userPrompt);
        break;
      case 'prioritize_tasks':
        result = await prioritizeTasks(userPrompt);
        break;
      case 'draft_bsp_section':
        result = await draftBSPSection(userPrompt);
        break;
      case 'generate_email':
        result = await generateEmail(userPrompt);
        break;
      default:
        result = { summary: 'Action not implemented', details: '' };
    }
    
    setActionResult(result);
    setResponse(result.details);
  };

  const draftCaseNote = async (userPrompt) => {
    const clientInfo = selectedClient ? clients.find(c => c.id === selectedClient) : null;
    const recentNotes = clientInfo ? caseNotes.filter(n => n.client_id === selectedClient).slice(0, 5) : [];
    
    const draft = await base44.integrations.Core.InvokeLLM({
      prompt: `Draft a professional case note based on this request: "${userPrompt}"

Client Context: ${clientInfo ? `${clientInfo.full_name} - ${clientInfo.service_type}` : 'General'}
Recent Notes Pattern: ${recentNotes.map(n => n.session_type).join(', ')}

Format the case note with:
1. Session Type & Duration
2. Observations
3. Interventions Applied
4. Client Response
5. Goals Progress
6. Next Steps

Use professional NDIS-compliant language.`
    });

    return {
      summary: '📝 Case Note Draft Created',
      details: draft,
      action: 'draft_case_note'
    };
  };

  const scheduleAppointment = async (userPrompt) => {
    const upcomingAppts = appointments.filter(a => a.status === 'confirmed').slice(0, 10);
    
    const suggestion = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this scheduling request: "${userPrompt}"

Current Schedule Context:
${upcomingAppts.map(a => `- ${a.practitioner_name}: ${a.appointment_date} ${a.appointment_time}`).join('\n')}

Practitioners Available:
${practitioners.filter(p => p.status === 'active').map(p => `- ${p.full_name} (${p.current_caseload}/${p.caseload_capacity} capacity)`).join('\n')}

Provide:
1. Suggested appointment slots (avoid conflicts)
2. Best practitioner match
3. Session type recommendation
4. Duration suggestion

Format as actionable scheduling guidance.`
    });

    return {
      summary: '📅 Appointment Scheduling Analysis',
      details: suggestion,
      action: 'schedule_appointment'
    };
  };

  const analyzeClientProgress = async (userPrompt) => {
    const clientInfo = selectedClient ? clients.find(c => c.id === selectedClient) : null;
    const clientNotes = clientInfo ? caseNotes.filter(n => n.client_id === selectedClient) : [];
    const clientBSPs = clientInfo ? bsps.filter(b => b.client_id === selectedClient) : [];
    
    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze client progress for: "${userPrompt}"

Client: ${clientInfo?.full_name || 'All Clients'}
Service Type: ${clientInfo?.service_type}
Funding Utilization: ${clientInfo ? Math.round((clientInfo.funding_utilised / clientInfo.funding_allocated) * 100) : 0}%
Recent Sessions: ${clientNotes.length} notes in system
Active BSPs: ${clientBSPs.filter(b => b.status === 'active').length}

Provide:
1. Progress Summary
2. Pattern Analysis
3. Red Flags or Concerns
4. Recommendations
5. Next Review Suggestions`
    });

    return {
      summary: '📊 Client Progress Analysis',
      details: analysis,
      action: 'analyze_client_progress'
    };
  };

  const prioritizeTasks = async (userPrompt) => {
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    const urgentTasks = pendingTasks.filter(t => t.priority === 'urgent');
    
    const prioritization = await base44.integrations.Core.InvokeLLM({
      prompt: `Prioritize tasks based on: "${userPrompt}"

Current Task Load:
- Total Pending: ${pendingTasks.length}
- Urgent: ${urgentTasks.length}
- High Priority: ${pendingTasks.filter(t => t.priority === 'high').length}

Tasks:
${pendingTasks.slice(0, 20).map(t => `- [${t.priority}] ${t.title} - Due: ${t.due_date || 'No date'}`).join('\n')}

Provide:
1. Priority Rankings
2. Time Estimates
3. Dependencies
4. Recommended Sequence
5. Delegation Suggestions`
    });

    return {
      summary: '🎯 Task Prioritization',
      details: prioritization,
      action: 'prioritize_tasks'
    };
  };

  const draftBSPSection = async (userPrompt) => {
    const clientInfo = selectedClient ? clients.find(c => c.id === selectedClient) : null;
    const clientBSP = clientInfo ? bsps.find(b => b.client_id === selectedClient && b.is_latest_version) : null;
    
    const draft = await base44.integrations.Core.InvokeLLM({
      prompt: `Draft BSP section for: "${userPrompt}"

Client: ${clientInfo?.full_name}
Existing BSP Context: ${clientBSP ? 'Active BSP exists' : 'New BSP'}

Draft content using:
- Evidence-based strategies
- NDIS Practice Standards alignment
- PBS framework principles
- Functional analysis approach

Format professionally for practitioner review.`
    });

    return {
      summary: '📋 BSP Section Drafted',
      details: draft,
      action: 'draft_bsp_section'
    };
  };

  const generateEmail = async (userPrompt) => {
    const email = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate professional email for: "${userPrompt}"

Style: Professional, empathetic, NDIS-appropriate
Include: Subject line, body, signature placeholder

Ensure communication is clear and family-friendly.`
    });

    return {
      summary: '✉️ Email Draft Generated',
      details: email,
      action: 'generate_email'
    };
  };

  const handleTemplateClick = (template) => {
    setSelectedTemplate(template);
    setPrompt(template.prompt + '\n\n');
  };

  const handleGenerateReport = async (reportType) => {
    setIsLoading(true);
    setResponse('');

    let dataContext = '';
    let reportPrompt = '';

    switch (reportType.id) {
      case 'compliance_report':
        const compliant = complianceItems.filter(c => c.status === 'compliant').length;
        const nonCompliant = complianceItems.filter(c => c.status === 'non_compliant').length;
        const attention = complianceItems.filter(c => c.status === 'attention_needed').length;
        
        dataContext = `
Compliance Data:
- Total Items: ${complianceItems.length}
- Compliant: ${compliant}
- Non-Compliant: ${nonCompliant}
- Attention Needed: ${attention}

Items requiring attention:
${complianceItems.filter(c => c.status !== 'compliant').map(c => `- ${c.title} (${c.category}): ${c.status}`).join('\n')}
`;
        reportPrompt = 'Generate a professional NDIS compliance status report with executive summary, current status breakdown, items requiring immediate attention, recommendations, and next steps.';
        break;

      case 'client_progress':
        const client = selectedClient ? clients.find(c => c.id === selectedClient) : null;
        if (client) {
          const utilization = client.funding_allocated ? Math.round((client.funding_utilised / client.funding_allocated) * 100) : 0;
          dataContext = `
Client: ${client.full_name}
NDIS Number: ${client.ndis_number}
Service Type: ${client.service_type}
Status: ${client.status}
Funding Allocated: $${(client.funding_allocated || 0).toLocaleString()}
Funding Utilised: $${(client.funding_utilised || 0).toLocaleString()}
Utilization: ${utilization}%
Plan End Date: ${client.plan_end_date || 'Not set'}
Risk Level: ${client.risk_level}
`;
          reportPrompt = 'Generate a professional client progress summary report suitable for sharing with families/guardians. Include current service status, funding utilization, recommendations for plan review, and suggested next steps.';
        } else {
          const activeClients = clients.filter(c => c.status === 'active');
          const totalFunding = clients.reduce((sum, c) => sum + (c.funding_allocated || 0), 0);
          const totalUsed = clients.reduce((sum, c) => sum + (c.funding_utilised || 0), 0);
          
          dataContext = `
Client Portfolio Summary:
- Total Clients: ${clients.length}
- Active Clients: ${activeClients.length}
- Total Funding Allocated: $${totalFunding.toLocaleString()}
- Total Funding Utilised: $${totalUsed.toLocaleString()}
- Overall Utilization: ${totalFunding ? Math.round((totalUsed / totalFunding) * 100) : 0}%

Clients by Status:
${Object.entries(clients.reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {})).map(([s, n]) => `- ${s}: ${n}`).join('\n')}
`;
          reportPrompt = 'Generate a portfolio-wide client progress summary report. Include overall metrics, status breakdown, clients requiring attention (high funding utilization or approaching plan end), and strategic recommendations.';
        }
        break;

      case 'financial_overview':
        const totalBilled = billingRecords.reduce((sum, r) => sum + (r.total_amount || 0), 0);
        const paidAmount = billingRecords.filter(r => r.status === 'paid').reduce((sum, r) => sum + (r.total_amount || 0), 0);
        const pendingAmount = billingRecords.filter(r => r.status !== 'paid').reduce((sum, r) => sum + (r.total_amount || 0), 0);
        
        dataContext = `
Billing Summary:
- Total Records: ${billingRecords.length}
- Total Billed: $${totalBilled.toLocaleString()}
- Paid: $${paidAmount.toLocaleString()}
- Pending/Draft: $${pendingAmount.toLocaleString()}

By Status:
${Object.entries(billingRecords.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + (r.total_amount || 0); return acc; }, {})).map(([s, a]) => `- ${s}: $${a.toLocaleString()}`).join('\n')}

By Service Type:
${Object.entries(billingRecords.reduce((acc, r) => { acc[r.service_type] = (acc[r.service_type] || 0) + (r.total_amount || 0); return acc; }, {})).map(([s, a]) => `- ${s}: $${a.toLocaleString()}`).join('\n')}
`;
        reportPrompt = 'Generate a professional financial overview report. Include revenue summary, billing status breakdown, service type analysis, and recommendations for improving cash flow and billing efficiency.';
        break;

      case 'practitioner_performance':
        const activePractitioners = practitioners.filter(p => p.status === 'active');
        const avgCaseload = activePractitioners.reduce((sum, p) => sum + (p.current_caseload || 0), 0) / (activePractitioners.length || 1);
        const avgBillableHours = activePractitioners.reduce((sum, p) => sum + (p.billable_hours_actual || 0), 0) / (activePractitioners.length || 1);
        
        dataContext = `
Team Overview:
- Total Practitioners: ${practitioners.length}
- Active: ${activePractitioners.length}
- Average Caseload: ${avgCaseload.toFixed(1)} clients
- Average Billable Hours: ${avgBillableHours.toFixed(1)} hours

Individual Performance:
${practitioners.map(p => `- ${p.full_name} (${p.role}): ${p.current_caseload || 0}/${p.caseload_capacity || 0} clients, ${p.billable_hours_actual || 0}/${p.billable_hours_target || 0} billable hours`).join('\n')}
`;
        reportPrompt = 'Generate a professional practitioner performance report. Include team metrics, individual performance analysis, capacity utilization, and recommendations for workload optimization and professional development.';
        break;
    }

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an NDIS Practice Manager generating reports for Breakthrough Coaching & Consulting.

${dataContext}

${reportPrompt}

Format the report professionally with:
- Executive Summary
- Key Metrics
- Detailed Analysis
- Recommendations
- Next Steps

Use markdown formatting for clear structure.`
      });
      setResponse(result);
    } catch (error) {
      setResponse('Failed to generate report. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setPrompt('');
    setResponse('');
    setSelectedTemplate(null);
    setSelectedClient('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-600" />
          AI Assistant
        </h2>
        <p className="text-slate-500 mt-1">Get help with documentation, reports, and operational tasks</p>
      </div>

      {/* Capabilities Overview */}
      <Card className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <CardContent className="pt-4">
          <div className="flex items-start gap-4">
            <Sparkles className="w-6 h-6 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-lg">Enhanced AI Capabilities</h3>
              <p className="text-sm text-purple-100 mt-1">
                This assistant can draft case notes, schedule appointments, analyze client progress, 
                prioritize tasks, generate emails, and provide strategic insights—all automatically.
              </p>
              <div className="flex gap-2 mt-3 flex-wrap">
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-white/30">Automated Actions</Badge>
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-white/30">Context-Aware</Badge>
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-white/30">Data Analysis</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <Button
          variant={activeTab === 'assistant' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('assistant')}
          className={activeTab === 'assistant' ? 'bg-purple-600 hover:bg-purple-700' : ''}
        >
          <Zap className="w-4 h-4 mr-2" />
          AI Assistant
        </Button>
        <Button
          variant={activeTab === 'reports' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('reports')}
          className={activeTab === 'reports' ? 'bg-purple-600 hover:bg-purple-700' : ''}
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Reports
        </Button>
      </div>

      {activeTab === 'assistant' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Prompts */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="font-semibold text-slate-900">Quick Templates</h3>
            <div className="space-y-2">
              {quickPrompts.map((template, index) => (
                <button
                  key={index}
                  onClick={() => handleTemplateClick(template)}
                  className={cn(
                    "w-full p-4 rounded-xl border text-left transition-all hover:shadow-md",
                    selectedTemplate?.title === template.title
                      ? "border-purple-300 bg-purple-50"
                      : "border-slate-200 bg-white hover:border-purple-200"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <template.icon className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{template.title}</p>
                      <Badge variant="outline" className="mt-1 text-xs">{template.category}</Badge>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Your Request</CardTitle>
                <CardDescription>
                  Describe what you need help with. Be specific for better results.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="E.g., Help me write progress notes for a session where the participant demonstrated improved regulation during a group activity..."
                  className="min-h-[150px] resize-none"
                />
                <div className="flex justify-between items-center mt-4">
                  <Button variant="ghost" onClick={handleReset} className="text-slate-500">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!prompt.trim() || isLoading}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Client Selector */}
            <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
              <CardContent className="pt-4">
                <Label className="text-sm font-medium">Context: Select Client (Optional)</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger className="mt-2 bg-white">
                    <SelectValue placeholder="All clients / General" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>All Clients / General</SelectItem>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.full_name} - {c.service_type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-2">Selected client context will enhance AI responses</p>
              </CardContent>
            </Card>

            {/* Response Area */}
            {(response || isLoading) && (
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {actionResult ? (
                      <>
                        <Zap className="w-4 h-4 text-purple-600" />
                        {actionResult.summary}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        AI Response
                      </>
                    )}
                  </CardTitle>
                  {response && (
                    <Button variant="ghost" size="sm" onClick={handleCopy}>
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 mr-1 text-green-600" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
                        <p className="text-sm text-slate-500">
                          {actionMode ? 'Executing action...' : 'Generating response...'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {actionResult && (
                        <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                          <p className="text-sm text-purple-900 font-medium">✨ Action Completed</p>
                          <p className="text-xs text-purple-700 mt-1">The AI assistant performed an automated action based on your request</p>
                        </div>
                      )}
                      <div className="prose prose-sm prose-slate max-w-none">
                        <ReactMarkdown>{response}</ReactMarkdown>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report Templates */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="font-semibold text-slate-900">Report Templates</h3>
            <div className="space-y-2">
              {reportTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleGenerateReport(template)}
                  disabled={isLoading}
                  className="w-full p-4 rounded-xl border border-slate-200 bg-white text-left transition-all hover:shadow-md hover:border-purple-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <template.icon className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{template.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{template.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Client selector for progress report */}
            <div className="mt-6">
              <Label className="text-sm">For Client Progress Report:</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All clients (summary)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All Clients (Summary)</SelectItem>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Generated Report */}
          <div className="lg:col-span-2">
            {(response || isLoading) ? (
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-600" />
                    Generated Report
                  </CardTitle>
                  {response && (
                    <Button variant="ghost" size="sm" onClick={handleCopy}>
                      {copied ? <Check className="w-4 h-4 mr-1 text-green-600" /> : <Copy className="w-4 h-4 mr-1" />}
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
                        <p className="text-sm text-slate-500">Generating report...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="prose prose-sm prose-slate max-w-none">
                      <ReactMarkdown>{response}</ReactMarkdown>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-purple-50 border-purple-100">
                <CardContent className="pt-6">
                  <h4 className="font-medium text-purple-900 mb-2">AI-Powered Report Generation</h4>
                  <ul className="text-sm text-purple-700 space-y-1">
                    <li>• Select a report template from the left</li>
                    <li>• Reports are generated using your actual data</li>
                    <li>• For client progress, optionally select a specific client</li>
                    <li>• Review and finalize the generated content</li>
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}