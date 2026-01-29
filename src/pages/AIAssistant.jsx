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
  TrendingUp
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
    icon: FileText,
    title: 'Draft Behaviour Support Plan',
    prompt: 'Help me draft a behaviour support plan outline for a participant with the following characteristics:',
    category: 'Clinical'
  },
  {
    icon: Mail,
    title: 'Parent Communication',
    prompt: 'Help me write a professional email to a parent/guardian about:',
    category: 'Communication'
  },
  {
    icon: ClipboardCheck,
    title: 'Compliance Checklist',
    prompt: 'Create a compliance checklist for NDIS behaviour support practitioners covering:',
    category: 'Compliance'
  },
  {
    icon: Calculator,
    title: 'Service Agreement',
    prompt: 'Help me draft a service agreement section explaining:',
    category: 'Admin'
  },
  {
    icon: PenTool,
    title: 'Progress Notes',
    prompt: 'Help me write professional progress notes for a session where:',
    category: 'Clinical'
  },
  {
    icon: FileText,
    title: 'NDIS Report Section',
    prompt: 'Help me write a section of an NDIS report covering:',
    category: 'Clinical'
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

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    setResponse('');
    
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert NDIS Practice Manager and Behaviour Support specialist at Breakthrough Coaching & Consulting. You help with clinical documentation, compliance requirements, parent communications, and operational tasks. Be professional, thorough, and ensure all responses align with NDIS Practice Standards and the Behaviour Support Competency Framework.

User Request:
${prompt}

Provide a helpful, professional response. Use markdown formatting where appropriate.`,
      });
      setResponse(result);
    } catch (error) {
      setResponse('Sorry, there was an error processing your request. Please try again.');
    } finally {
      setIsLoading(false);
    }
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

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <Button
          variant={activeTab === 'assistant' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('assistant')}
          className={activeTab === 'assistant' ? 'bg-purple-600 hover:bg-purple-700' : ''}
        >
          General Assistant
        </Button>
        <Button
          variant={activeTab === 'reports' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('reports')}
          className={activeTab === 'reports' ? 'bg-purple-600 hover:bg-purple-700' : ''}
        >
          Auto-Generate Reports
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

            {/* Response Area */}
            {(response || isLoading) && (
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    AI Response
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
                        <p className="text-sm text-slate-500">Generating response...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="prose prose-sm prose-slate max-w-none">
                      <ReactMarkdown>{response}</ReactMarkdown>
                    </div>
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