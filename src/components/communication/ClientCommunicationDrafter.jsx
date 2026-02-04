import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, MessageSquare, Send, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ClientCommunicationDrafter({ clientId, clientName, onSend }) {
  const [draft, setDraft] = useState(null);
  const [editedMessage, setEditedMessage] = useState('');
  const [config, setConfig] = useState({
    communication_type: 'email',
    communication_purpose: 'general_support'
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generateClientCommunication', {
        client_id: clientId,
        ...config
      });
      return response.data;
    },
    onSuccess: (data) => {
      setDraft(data.draft);
      setEditedMessage(data.draft.message_body);
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">AI Communication Drafter</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Select 
            value={config.communication_type} 
            onValueChange={(value) => setConfig({ ...config, communication_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={config.communication_purpose} 
            onValueChange={(value) => setConfig({ ...config, communication_purpose: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="appointment_reminder">Appointment Reminder</SelectItem>
              <SelectItem value="progress_update">Progress Update</SelectItem>
              <SelectItem value="engagement_check">Engagement Check-in</SelectItem>
              <SelectItem value="goal_celebration">Goal Celebration</SelectItem>
              <SelectItem value="plan_review">Plan Review Invitation</SelectItem>
              <SelectItem value="general_support">General Support</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="w-full"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {generateMutation.isPending ? 'Drafting...' : 'Generate AI Draft'}
        </Button>

        {draft && (
          <div className="space-y-3">
            {config.communication_type === 'email' && draft.subject_line && (
              <div>
                <label className="text-sm font-medium">Subject</label>
                <div className="p-2 bg-slate-50 rounded text-sm">{draft.subject_line}</div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={editedMessage}
                onChange={(e) => setEditedMessage(e.target.value)}
                className="min-h-32"
              />
            </div>

            {config.communication_type === 'email' && draft.sms_version && (
              <div className="p-2 bg-blue-50 rounded text-xs">
                <p className="font-medium mb-1">SMS Version:</p>
                <p>{draft.sms_version}</p>
              </div>
            )}

            {draft.personalization_notes?.length > 0 && (
              <div className="p-2 bg-purple-50 rounded">
                <p className="text-xs font-medium mb-1">Personalization Notes:</p>
                <ul className="text-xs space-y-1">
                  {draft.personalization_notes.map((note, i) => (
                    <li key={i}>• {note}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={() => onSend && onSend({ 
                  subject: draft.subject_line, 
                  message: editedMessage,
                  type: config.communication_type 
                })}
                className="flex-1"
              >
                <Send className="h-4 w-4 mr-2" />
                Review & Send
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}