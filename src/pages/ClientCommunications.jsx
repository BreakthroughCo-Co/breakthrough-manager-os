import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageSquare, Send, FileText, Sparkles, Loader2, Mail, MessageCircle, CheckCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';

export default function ClientCommunications() {
  const [selectedClient, setSelectedClient] = useState('');
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [communicationType, setCommunicationType] = useState('portal_message');
  const [isDrafting, setIsDrafting] = useState(false);
  const [activeView, setActiveView] = useState('draft');
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);

  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: communications = [] } = useQuery({
    queryKey: ['clientCommunications'],
    queryFn: () => base44.entities.ClientCommunication.list('-sent_date'),
  });

  const { data: caseNotes = [] } = useQuery({
    queryKey: ['caseNotes', selectedClient],
    queryFn: () => selectedClient ? base44.entities.CaseNote.filter({ client_id: selectedClient }) : [],
    enabled: !!selectedClient,
  });

  const { data: bsps = [] } = useQuery({
    queryKey: ['bsps', selectedClient],
    queryFn: () => selectedClient ? base44.entities.BehaviourSupportPlan.filter({ client_id: selectedClient }) : [],
    enabled: !!selectedClient,
  });

  const createCommunicationMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientCommunication.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientCommunications'] });
      setSubject('');
      setMessageBody('');
      setSelectedClient('');
    },
  });

  const handleDraftWithAI = async () => {
    if (!selectedClient) {
      alert('Please select a client first');
      return;
    }

    setIsDrafting(true);
    try {
      const client = clients.find(c => c.id === selectedClient);
      const recentNotes = caseNotes.slice(0, 3);
      const activeBSP = bsps.find(b => b.status === 'active');

      const context = {
        client_name: client?.full_name,
        recent_notes: recentNotes.map(n => ({
          date: n.session_date,
          summary: n.summary,
          progress: n.progress_summary,
        })),
        bsp_goals: activeBSP ? {
          behaviour_summary: activeBSP.behaviour_summary,
          current_strategies: activeBSP.skill_building_strategies,
        } : null,
      };

      const prompt = `You are a professional NDIS behaviour support practitioner drafting a personalized progress update message for a client/family.

Client: ${client?.full_name}

Recent Progress Notes (last 3 sessions):
${recentNotes.map(n => `- ${n.session_date}: ${n.summary || n.progress_summary || 'Session completed'}`).join('\n')}

${activeBSP ? `Current BSP Goals:\n- Behaviour focus: ${activeBSP.behaviour_summary}\n- Strategies: ${activeBSP.skill_building_strategies}` : ''}

Draft a warm, professional, and personalized message (200-300 words) that:
1. Acknowledges recent progress or efforts
2. Highlights specific positive developments
3. Mentions any strategies being worked on
4. Encourages continued engagement
5. Offers availability for questions

Tone: Encouraging, professional, person-centered, strengths-based.
Do NOT use placeholder text. Be specific based on the data provided.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
      });

      setSubject(`Progress Update - ${client?.full_name}`);
      setMessageBody(result);
    } catch (error) {
      alert('Failed to draft message: ' + error.message);
    } finally {
      setIsDrafting(false);
    }
  };

  const handleDraftFollowUp = async () => {
    if (!selectedClient) {
      alert('Please select a client first');
      return;
    }

    setIsDrafting(true);
    try {
      const client = clients.find(c => c.id === selectedClient);
      const clientComms = communications.filter(c => c.client_id === selectedClient);
      const recentComms = clientComms.slice(0, 3);
      const unanswered = recentComms.filter(c => !c.recipient_response);

      const prompt = `Draft a follow-up message for a client/family based on recent communication history.

Client: ${client?.full_name}

Recent Communications:
${recentComms.map(c => `
- ${new Date(c.sent_date).toLocaleDateString()}: ${c.subject}
- Message: ${c.message_body.substring(0, 150)}...
- Response received: ${c.recipient_response ? 'Yes' : 'No'}
`).join('\n')}

${unanswered.length > 0 ? `There are ${unanswered.length} unanswered message(s).` : ''}

Draft a brief, friendly follow-up message (100-150 words) that:
1. References the previous communication(s)
2. Gently checks in without being pushy
3. Offers assistance or clarification
4. Provides an easy way to respond

Tone: Supportive, understanding, professional.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
      });

      setSubject(`Following up - ${client?.full_name}`);
      setMessageBody(result);
    } catch (error) {
      alert('Failed to draft follow-up: ' + error.message);
    } finally {
      setIsDrafting(false);
    }
  };

  const handleQueryClient = async () => {
    if (!selectedClient || !aiQuery) {
      alert('Please select a client and enter a query');
      return;
    }

    setIsQuerying(true);
    try {
      const result = await base44.functions.invoke('queryClientData', {
        client_id: selectedClient,
        query: aiQuery,
      });
      setAiResponse(result.data.response);
    } catch (error) {
      alert('Failed to query client data: ' + error.message);
    } finally {
      setIsQuerying(false);
    }
  };

  const handleSend = async () => {
    if (!selectedClient || !subject || !messageBody) {
      alert('Please fill in all required fields');
      return;
    }

    const client = clients.find(c => c.id === selectedClient);
    const user = await base44.auth.me();

    const communicationData = {
      client_id: selectedClient,
      client_name: client?.full_name,
      communication_type: communicationType,
      subject: subject,
      message_body: messageBody,
      drafted_by_ai: isDrafting,
      sent_by: user.email,
      sent_date: new Date().toISOString(),
      delivery_status: 'sent',
      recipient_email: client?.primary_contact_email,
      ai_context_used: JSON.stringify({
        case_notes: caseNotes.slice(0, 3).map(n => n.id),
        bsp_id: bsps.find(b => b.status === 'active')?.id,
      }),
    };

    try {
      await createCommunicationMutation.mutateAsync(communicationData);

      if (communicationType === 'email' && client?.primary_contact_email) {
        await base44.integrations.Core.SendEmail({
          to: client.primary_contact_email,
          subject: subject,
          body: messageBody,
          from_name: 'Breakthrough Coaching & Consulting',
        });
      }

      alert('Message sent successfully!');
    } catch (error) {
      alert('Failed to send message: ' + error.message);
    }
  };

  const selectedClientData = clients.find(c => c.id === selectedClient);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Client Communications</h1>
        <p className="text-muted-foreground">AI-assisted personalized messaging to clients and families</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <Button
          variant={activeView === 'draft' ? 'default' : 'ghost'}
          onClick={() => setActiveView('draft')}
          size="sm"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Draft New Message
        </Button>
        <Button
          variant={activeView === 'history' ? 'default' : 'ghost'}
          onClick={() => setActiveView('history')}
          size="sm"
        >
          <FileText className="w-4 h-4 mr-2" />
          Communication History
        </Button>
      </div>

      {activeView === 'draft' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Compose Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Select Client</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.filter(c => c.status === 'active').map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Communication Type</Label>
                <Select value={communicationType} onValueChange={setCommunicationType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portal_message">
                      <MessageCircle className="w-4 h-4 inline mr-2" />
                      Client Portal Message
                    </SelectItem>
                    <SelectItem value="email">
                      <Mail className="w-4 h-4 inline mr-2" />
                      Email
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Subject</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Message subject..."
                />
              </div>

              <div>
                <Label>Message</Label>
                <Textarea
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Type your message here..."
                  rows={10}
                  className="min-h-[200px]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    onClick={handleDraftWithAI}
                    disabled={!selectedClient || isDrafting}
                    variant="outline"
                    className="flex-1"
                  >
                    {isDrafting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Draft Progress Update
                  </Button>
                  <Button
                    onClick={handleDraftFollowUp}
                    disabled={!selectedClient || isDrafting}
                    variant="outline"
                    className="flex-1"
                  >
                    {isDrafting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Draft Follow-up
                  </Button>
                </div>
                <Button
                  onClick={handleSend}
                  disabled={!selectedClient || !subject || !messageBody || createCommunicationMutation.isPending}
                  className="w-full"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
              </div>

              {selectedClient && (
                <Alert>
                  <AlertDescription>
                    <strong>Recipient:</strong> {selectedClientData?.full_name}
                    {communicationType === 'email' && (
                      <span> ({selectedClientData?.primary_contact_email})</span>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>AI Client Query Assistant</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedClient ? (
                  <>
                    <div>
                      <Label>Ask about this client</Label>
                      <Input
                        value={aiQuery}
                        onChange={(e) => setAiQuery(e.target.value)}
                        placeholder="e.g., What are the active BSP goals? Summarize progress last month"
                        onKeyPress={(e) => e.key === 'Enter' && handleQueryClient()}
                      />
                    </div>
                    <Button
                      onClick={handleQueryClient}
                      disabled={!aiQuery || isQuerying}
                      variant="outline"
                      className="w-full"
                      size="sm"
                    >
                      {isQuerying ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      Query Client Data
                    </Button>
                    {aiResponse && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm">
                        <p className="font-medium text-blue-900 mb-1">AI Response:</p>
                        <p className="text-blue-800 whitespace-pre-wrap">{aiResponse}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Select a client to use AI assistant</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Context & Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedClient ? (
                  <>
                    <div>
                      <h4 className="font-medium text-sm mb-2">Recent Case Notes ({caseNotes.length})</h4>
                      {caseNotes.slice(0, 3).map(note => (
                        <div key={note.id} className="text-sm border-l-2 border-teal-200 pl-3 mb-2">
                          <p className="font-medium">{note.session_date}</p>
                          <p className="text-muted-foreground text-xs">{note.summary?.substring(0, 100)}...</p>
                        </div>
                      ))}
                    </div>

                    <div>
                      <h4 className="font-medium text-sm mb-2">Active BSP</h4>
                      {bsps.find(b => b.status === 'active') ? (
                        <div className="text-sm border-l-2 border-blue-200 pl-3">
                          <p className="font-medium">BSP Version {bsps.find(b => b.status === 'active')?.plan_version}</p>
                          <p className="text-muted-foreground text-xs">{bsps.find(b => b.status === 'active')?.behaviour_summary?.substring(0, 100)}...</p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No active BSP</p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Select a client to view context</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Communication History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {communications.map(comm => (
                <div key={comm.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{comm.subject}</h4>
                        <Badge variant={comm.delivery_status === 'sent' ? 'default' : 'outline'}>
                          {comm.delivery_status}
                        </Badge>
                        {comm.drafted_by_ai && (
                          <Badge variant="secondary" className="text-xs">
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI-Drafted
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        To: {comm.client_name} • {new Date(comm.sent_date).toLocaleDateString()} • via {comm.communication_type}
                      </p>
                    </div>
                    {comm.delivery_status === 'sent' && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <p className="text-sm border-l-2 border-slate-200 pl-3">{comm.message_body.substring(0, 200)}...</p>
                </div>
              ))}
              {communications.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No communications sent yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}