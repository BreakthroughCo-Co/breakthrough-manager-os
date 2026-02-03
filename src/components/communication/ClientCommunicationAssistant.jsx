import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles, AlertTriangle, Copy, Send } from 'lucide-react';

const COMMUNICATION_TYPES = {
  'general_checkin': 'General Check-in',
  'progress_celebration': 'Progress Celebration',
  'goal_review': 'Goal Review',
  'support_offer': 'Support Offer',
  'incident_followup': 'Incident Follow-up',
  'concern_address': 'Address Concerns'
};

export default function ClientCommunicationAssistant({ clientId, clientName, onClose }) {
  const [selectedType, setSelectedType] = useState('general_checkin');
  const [additionalContext, setAdditionalContext] = useState('');
  const [draft, setDraft] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editedMessage, setEditedMessage] = useState('');

  const { data: sentimentAlerts } = useQuery({
    queryKey: ['sentimentAlerts'],
    queryFn: () => base44.functions.invoke('analyzeCommunicationSentiment', {})
  });

  const handleGenerateDraft = async () => {
    setIsGenerating(true);
    try {
      const result = await base44.functions.invoke('draftClientCommunication', {
        client_id: clientId,
        communication_type: selectedType,
        additional_context: additionalContext
      });
      setDraft(result.data.draft);
      setEditedMessage(result.data.draft.message_draft);
    } catch (error) {
      alert('Failed to generate draft: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendMessage = async () => {
    try {
      await base44.entities.ClientCommunication.create({
        client_id: clientId,
        client_name: clientName,
        subject: draft.subject_line,
        message_body: editedMessage,
        communication_type: selectedType,
        sent_date: new Date().toISOString(),
        sent_by: 'Manager',
        message_status: 'sent'
      });
      alert('Message sent successfully');
      onClose?.();
    } catch (error) {
      alert('Failed to send message: ' + error.message);
    }
  };

  const flaggedAlerts = sentimentAlerts?.data?.flagged_communications?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      {/* Sentiment Alerts */}
      {flaggedAlerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Flagged Communications Requiring Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {flaggedAlerts.map((comm, idx) => (
              <div key={idx} className="p-2 bg-white rounded border border-red-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{comm.client_name}</span>
                  <Badge variant={comm.urgency === 'critical' ? 'destructive' : 'secondary'}>
                    {comm.urgency}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 mb-1">{comm.subject}</p>
                <p className="text-xs text-red-700"><strong>Action:</strong> {comm.recommended_action}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Draft Generator */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Communication Draft</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Communication Type</label>
            <select 
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full mt-2 px-3 py-2 border rounded-md"
            >
              {Object.entries(COMMUNICATION_TYPES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Additional Context</label>
            <Textarea
              placeholder="Any specific points to address or context for the message..."
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              className="mt-2"
              rows={2}
            />
          </div>

          <Button
            onClick={handleGenerateDraft}
            disabled={isGenerating}
            className="w-full bg-teal-600 hover:bg-teal-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Draft...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate AI Draft
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Draft Review & Edit */}
      {draft && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Edit Draft</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject Line</label>
              <p className="p-2 bg-slate-50 rounded text-sm">{draft.subject_line}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={editedMessage}
                onChange={(e) => setEditedMessage(e.target.value)}
                rows={6}
                className="font-mono text-xs"
              />
            </div>

            {draft.sensitivities.length > 0 && (
              <Alert>
                <AlertDescription>
                  <strong>Sensitivities to consider:</strong>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    {draft.sensitivities.map((s, idx) => (
                      <li key={idx} className="text-sm">{s}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-blue-50 rounded">
                <p className="font-medium text-blue-900">Tone</p>
                <p className="text-blue-800">{draft.tone}</p>
              </div>
              <div className="p-2 bg-emerald-50 rounded">
                <p className="font-medium text-emerald-900">Next Steps</p>
                <p className="text-emerald-800 text-xs">{draft.next_steps}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(editedMessage);
                  alert('Copied to clipboard');
                }}
                variant="outline"
                size="sm"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              <Button
                onClick={handleSendMessage}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                size="sm"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Message
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}