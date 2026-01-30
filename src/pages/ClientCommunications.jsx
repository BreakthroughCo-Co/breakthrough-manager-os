import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Mail,
  Calendar,
  FileText,
  Bell,
  TrendingUp,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Send,
  User,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const communicationTypes = [
  {
    id: 'appointment_reminder',
    name: 'Appointment Reminder',
    icon: Calendar,
    category: 'Scheduling',
    description: 'Remind clients about upcoming sessions',
    color: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'session_summary',
    name: 'Session Summary',
    icon: FileText,
    category: 'Clinical',
    description: 'Summarise a completed session for families',
    color: 'bg-emerald-100 text-emerald-700',
  },
  {
    id: 'plan_review',
    name: 'Plan Review Notice',
    icon: Bell,
    category: 'Admin',
    description: 'Notify about upcoming NDIS plan review',
    color: 'bg-amber-100 text-amber-700',
  },
  {
    id: 'progress_update',
    name: 'Progress Update',
    icon: TrendingUp,
    category: 'Clinical',
    description: 'Share monthly progress with family/carers',
    color: 'bg-purple-100 text-purple-700',
  },
  {
    id: 'service_agreement',
    name: 'Service Agreement',
    icon: FileText,
    category: 'Admin',
    description: 'Send service agreement for review',
    color: 'bg-teal-100 text-teal-700',
  },
  {
    id: 'welcome_email',
    name: 'Welcome Email',
    icon: Mail,
    category: 'Onboarding',
    description: 'Welcome new clients to services',
    color: 'bg-pink-100 text-pink-700',
  },
];

export default function ClientCommunications() {
  const [selectedType, setSelectedType] = useState(null);
  const [selectedClient, setSelectedClient] = useState('');
  const [additionalPoints, setAdditionalPoints] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [generatedSubject, setGeneratedSubject] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: caseNotes = [] } = useQuery({
    queryKey: ['caseNotes'],
    queryFn: () => base44.entities.CaseNote.list('-session_date', 10),
  });

  const selectedClientData = clients.find(c => c.id === selectedClient);

  const generateCommunication = async () => {
    if (!selectedType || !selectedClient) return;

    setIsGenerating(true);
    setGeneratedContent('');
    setGeneratedSubject('');
    setSent(false);

    const client = selectedClientData;
    const recentNotes = caseNotes.filter(n => n.client_id === selectedClient).slice(0, 3);

    const prompts = {
      appointment_reminder: `Generate a friendly appointment reminder email for ${client?.full_name || '[Client Name]'}.
Service type: ${client?.service_type || 'Behaviour Support'}
${additionalPoints ? `Additional points to include: ${additionalPoints}` : ''}

Include:
- Friendly greeting
- Reminder about upcoming session
- What to prepare/bring
- How to reschedule if needed
- Contact details`,

      session_summary: `Generate a session summary email for the family/guardian of ${client?.full_name || '[Client Name]'}.
Service type: ${client?.service_type || 'Behaviour Support'}
${recentNotes.length > 0 ? `Recent session notes:
${recentNotes.map(n => `- Date: ${n.session_date}, Type: ${n.session_type}, Progress: ${n.progress_rating}`).join('\n')}` : ''}
${additionalPoints ? `Specific points to include: ${additionalPoints}` : ''}

Include:
- Summary of what was worked on
- Key observations and progress
- Strategies practiced
- Next steps and recommendations
Keep it positive and strengths-focused.`,

      plan_review: `Generate a notification about upcoming NDIS plan review for ${client?.full_name || '[Client Name]'}.
Current plan end date: ${client?.plan_end_date || '[Plan End Date]'}
${additionalPoints ? `Additional information: ${additionalPoints}` : ''}

Include:
- Notice about plan review timeline
- What to expect in the process
- How we can support them
- Documents they may need
- Invitation to discuss goals`,

      progress_update: `Generate a monthly progress update email for the family of ${client?.full_name || '[Client Name]'}.
Service type: ${client?.service_type || 'Behaviour Support'}
${recentNotes.length > 0 ? `Recent progress notes:
${recentNotes.map(n => `- ${n.session_date}: ${n.progress_rating} - ${n.goals_addressed || 'General support'}`).join('\n')}` : ''}
${additionalPoints ? `Key points to highlight: ${additionalPoints}` : ''}

Include:
- Overview of the month's work
- Progress towards goals
- Achievements to celebrate
- Any challenges and how we're addressing them
- Focus areas for next month`,

      service_agreement: `Generate an email to accompany a service agreement for ${client?.full_name || '[Client Name]'}.
Service type: ${client?.service_type || 'Behaviour Support'}
${additionalPoints ? `Additional details: ${additionalPoints}` : ''}

Include:
- Brief introduction to services
- What's included in the agreement
- Request to review and sign
- How to ask questions
- Next steps after signing`,

      welcome_email: `Generate a welcome email for new client ${client?.full_name || '[Client Name]'}.
Service type: ${client?.service_type || 'Behaviour Support'}
${additionalPoints ? `Personal notes: ${additionalPoints}` : ''}

Include:
- Warm welcome to our services
- Brief introduction to our practice
- What to expect in the first few sessions
- Key team members they'll work with
- How to contact us with questions`,
    };

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an NDIS Behaviour Support Practice Manager at Breakthrough Coaching & Consulting. 
Generate a professional, warm, and NDIS-appropriate communication.

${prompts[selectedType.id]}

Format the output as:
SUBJECT: [Email subject line]
---
[Email body with greeting, content, and sign-off]

Sign off as "Breakthrough Coaching & Consulting Team"
Keep the tone professional but warm and supportive.`
      });

      // Parse subject and body
      const parts = result.split('---');
      const subjectMatch = parts[0]?.match(/SUBJECT:\s*(.+)/i);
      setGeneratedSubject(subjectMatch ? subjectMatch[1].trim() : `${selectedType.name} - ${client?.full_name}`);
      setGeneratedContent(parts[1]?.trim() || parts[0]?.replace(/SUBJECT:.*\n?/i, '').trim());
    } catch (error) {
      console.error('Generation failed:', error);
      setGeneratedContent('Failed to generate communication. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${generatedSubject}\n\n${generatedContent}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    if (!selectedClientData?.primary_contact_email || !generatedContent) return;

    setIsSending(true);
    try {
      await base44.integrations.Core.SendEmail({
        to: selectedClientData.primary_contact_email,
        subject: generatedSubject,
        body: generatedContent,
      });
      setSent(true);
    } catch (error) {
      console.error('Failed to send:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-teal-600" />
          AI Communication Drafting
        </h2>
        <p className="text-slate-500 mt-1">Generate client-facing communications with AI assistance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Communication Type */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">Communication Type</h3>
            <div className="space-y-2">
              {communicationTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => { setSelectedType(type); setGeneratedContent(''); setSent(false); }}
                  className={cn(
                    "w-full p-3 rounded-xl border text-left transition-all hover:shadow-md",
                    selectedType?.id === type.id
                      ? "border-teal-300 bg-teal-50"
                      : "border-slate-200 bg-white hover:border-teal-200"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", type.color)}>
                      <type.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{type.name}</p>
                      <p className="text-xs text-slate-500">{type.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Drafting Panel */}
        <div className="lg:col-span-2 space-y-4">
          {selectedType ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <selectedType.icon className="w-5 h-5 text-teal-600" />
                    {selectedType.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Client Selection */}
                  <div>
                    <Label>Select Client *</Label>
                    <Select value={selectedClient} onValueChange={(v) => { setSelectedClient(v); setGeneratedContent(''); setSent(false); }}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choose a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.filter(c => c.status === 'active').map(client => (
                          <SelectItem key={client.id} value={client.id}>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-slate-400" />
                              {client.full_name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Client Info Preview */}
                  {selectedClientData && (
                    <div className="bg-slate-50 rounded-lg p-3 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-slate-500">Service:</span>
                          <span className="ml-2 font-medium">{selectedClientData.service_type || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Contact:</span>
                          <span className="ml-2">{selectedClientData.primary_contact_name || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Email:</span>
                          <span className="ml-2">{selectedClientData.primary_contact_email || 'Not set'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Plan End:</span>
                          <span className="ml-2">{selectedClientData.plan_end_date ? format(new Date(selectedClientData.plan_end_date), 'MMM d, yyyy') : '-'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Additional Points */}
                  <div>
                    <Label>Additional Points to Include (Optional)</Label>
                    <Textarea
                      value={additionalPoints}
                      onChange={(e) => setAdditionalPoints(e.target.value)}
                      placeholder="e.g., Mention great progress on waiting skills, include homework for this week..."
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  <Button 
                    onClick={generateCommunication} 
                    disabled={!selectedClient || isGenerating}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    {isGenerating ? 'Generating...' : 'Generate with AI'}
                  </Button>
                </CardContent>
              </Card>

              {/* Generated Content */}
              {generatedContent && (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Generated Communication</CardTitle>
                      <Button variant="ghost" size="sm" onClick={handleCopy}>
                        {copied ? <Check className="w-4 h-4 mr-1 text-green-600" /> : <Copy className="w-4 h-4 mr-1" />}
                        {copied ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs">Subject</Label>
                      <Input
                        value={generatedSubject}
                        onChange={(e) => setGeneratedSubject(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Body</Label>
                      <Textarea
                        value={generatedContent}
                        onChange={(e) => setGeneratedContent(e.target.value)}
                        rows={12}
                        className="mt-1 font-mono text-sm"
                      />
                    </div>

                    {selectedClientData?.primary_contact_email ? (
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-sm text-slate-500">
                          Recipient: {selectedClientData.primary_contact_email}
                        </span>
                        <Button 
                          onClick={handleSend} 
                          disabled={isSending || sent}
                          className={sent ? "bg-emerald-600" : "bg-teal-600 hover:bg-teal-700"}
                        >
                          {isSending ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
                          ) : sent ? (
                            <><Check className="w-4 h-4 mr-2" />Sent!</>
                          ) : (
                            <><Send className="w-4 h-4 mr-2" />Send Email</>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                        No contact email set for this client. Copy the content to send manually.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 h-96 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Select a communication type to get started</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}