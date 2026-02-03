import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Calendar, MessageSquare, Sparkles, CheckCircle, Clock, TrendingUp } from 'lucide-react';

export default function ClientOutreach() {
  const [selectedClient, setSelectedClient] = useState('all');
  const [messageType, setMessageType] = useState('general_checkin');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState(null);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');

  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.filter({ status: 'active' }),
  });

  const { data: scheduledOutreach = [] } = useQuery({
    queryKey: ['scheduledOutreach'],
    queryFn: () => base44.entities.ScheduledOutreach.list('-scheduled_date'),
  });

  const createOutreachMutation = useMutation({
    mutationFn: (data) => base44.entities.ScheduledOutreach.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledOutreach'] });
      setIsScheduleDialogOpen(false);
      setGeneratedMessage(null);
    },
  });

  const handleGenerateMessage = async () => {
    if (selectedClient === 'all') {
      alert('Please select a specific client');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await base44.functions.invoke('generatePersonalizedOutreach', {
        client_id: selectedClient,
        message_type: messageType,
      });
      setGeneratedMessage(result.data);
    } catch (error) {
      alert('Failed to generate message: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleScheduleOutreach = async () => {
    if (!scheduleDate) {
      alert('Please select a date and time');
      return;
    }

    const user = await base44.auth.me();
    await createOutreachMutation.mutateAsync({
      client_id: generatedMessage.client_id,
      client_name: generatedMessage.client_name,
      message_type: messageType,
      subject: generatedMessage.personalized_message.subject,
      message_body: generatedMessage.personalized_message.message_body,
      scheduled_date: new Date(scheduleDate).toISOString(),
      send_status: 'scheduled',
      created_by: user.email,
    });
  };

  const messageTypes = [
    { value: 'general_checkin', label: 'General Check-in', icon: MessageSquare },
    { value: 'progress_celebration', label: 'Progress Celebration', icon: TrendingUp },
    { value: 'goal_review', label: 'Goal Review', icon: CheckCircle },
    { value: 'support_offer', label: 'Support Offer', icon: Send },
  ];

  const pendingOutreach = scheduledOutreach.filter(o => o.send_status === 'scheduled');
  const sentOutreach = scheduledOutreach.filter(o => o.send_status === 'sent');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Client Outreach</h1>
          <p className="text-muted-foreground">AI-powered personalized client communications</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingOutreach.length}</p>
                <p className="text-xs text-muted-foreground">Scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Send className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{sentOutreach.length}</p>
                <p className="text-xs text-muted-foreground">Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {sentOutreach.filter(o => o.replied).length}
                </p>
                <p className="text-xs text-muted-foreground">Responses</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Personalized Message</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Select Client</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Message Type</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {messageTypes.map(type => (
                  <Button
                    key={type.value}
                    variant={messageType === type.value ? 'default' : 'outline'}
                    onClick={() => setMessageType(type.value)}
                    className="justify-start"
                  >
                    <type.icon className="w-4 h-4 mr-2" />
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleGenerateMessage}
              disabled={selectedClient === 'all' || isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating AI Message...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Personalized Message
                </>
              )}
            </Button>

            {generatedMessage && (
              <div className="mt-6 space-y-4">
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">AI-Generated Message</CardTitle>
                      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Calendar className="w-4 h-4 mr-2" />
                            Schedule
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Schedule Outreach</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <Label>Send Date & Time</Label>
                              <Input
                                type="datetime-local"
                                value={scheduleDate}
                                onChange={(e) => setScheduleDate(e.target.value)}
                              />
                            </div>
                            <Button
                              onClick={handleScheduleOutreach}
                              disabled={!scheduleDate}
                              className="w-full"
                            >
                              Schedule Message
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-blue-700 font-medium">To:</p>
                        <p className="text-sm text-blue-900">{generatedMessage.client_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-700 font-medium">Subject:</p>
                        <p className="text-sm text-blue-900">{generatedMessage.personalized_message.subject}</p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-700 font-medium">Message:</p>
                        <div className="bg-white p-3 rounded border border-blue-200 mt-1">
                          <p className="text-sm whitespace-pre-wrap">{generatedMessage.personalized_message.message_body}</p>
                        </div>
                      </div>
                      <div className="p-3 bg-white rounded border border-blue-200">
                        <p className="text-xs text-blue-700 font-medium mb-2">Context Summary:</p>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">Recent Sessions</p>
                            <p className="font-medium">{generatedMessage.context_summary.recent_sessions}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Progress Trend</p>
                            <p className="font-medium">{generatedMessage.context_summary.progress_trend}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Last Contact</p>
                            <p className="font-medium">
                              {generatedMessage.context_summary.last_communication 
                                ? new Date(generatedMessage.context_summary.last_communication).toLocaleDateString()
                                : 'None'}
                            </p>
                          </div>
                        </div>
                      </div>
                      {generatedMessage.personalized_message.engagement_tips && (
                        <div>
                          <p className="text-xs text-blue-700 font-medium mb-1">Engagement Tips:</p>
                          <ul className="space-y-1">
                            {generatedMessage.personalized_message.engagement_tips.map((tip, idx) => (
                              <li key={idx} className="text-xs text-blue-800 flex items-start gap-1">
                                <span>•</span>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scheduled & Sent Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {scheduledOutreach.slice(0, 10).map(outreach => (
              <div key={outreach.id} className="flex items-start justify-between border rounded-lg p-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">{outreach.client_name}</p>
                    <Badge variant={
                      outreach.send_status === 'sent' ? 'default' :
                      outreach.send_status === 'scheduled' ? 'secondary' : 'destructive'
                    }>
                      {outreach.send_status}
                    </Badge>
                    {outreach.replied && <Badge variant="outline">Replied</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{outreach.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {outreach.send_status === 'scheduled' 
                      ? `Scheduled: ${new Date(outreach.scheduled_date).toLocaleString()}`
                      : `Sent: ${new Date(outreach.sent_date).toLocaleString()}`}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {outreach.message_type.replace(/_/g, ' ')}
                </Badge>
              </div>
            ))}
            {scheduledOutreach.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No scheduled outreach yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}