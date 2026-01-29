import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Loader2, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export default function MessageComposer({ 
  isOpen, 
  onClose, 
  practitioners = [], 
  currentUser,
  defaultRecipient = null 
}) {
  const [formData, setFormData] = useState({
    recipient_id: defaultRecipient?.id || '',
    recipient_name: defaultRecipient?.full_name || '',
    subject: '',
    content: '',
    priority: 'normal'
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const queryClient = useQueryClient();

  const sendMutation = useMutation({
    mutationFn: (data) => base44.entities.Message.create({
      ...data,
      sender_id: currentUser?.id || '',
      sender_name: currentUser?.full_name || 'System'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      onClose();
      setFormData({ recipient_id: '', recipient_name: '', subject: '', content: '', priority: 'normal' });
    },
  });

  const handleRecipientChange = (id) => {
    const practitioner = practitioners.find(p => p.id === id);
    setFormData({
      ...formData,
      recipient_id: id,
      recipient_name: practitioner?.full_name || ''
    });
  };

  const handleAIDraft = async (templateType) => {
    setIsGenerating(true);
    try {
      const prompts = {
        meeting: "Draft a brief professional message to schedule a team meeting to discuss caseload management and upcoming compliance deadlines.",
        update: "Draft a brief professional message requesting an update on current client cases and any concerns that need management attention.",
        reminder: "Draft a brief professional reminder about submitting weekly session notes and billing records before the Friday deadline."
      };
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `${prompts[templateType]} Keep it concise and professional. Output only the message body, no subject line.`
      });
      
      setFormData(prev => ({ ...prev, content: result }));
    } catch (error) {
      console.error('AI draft failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>To</Label>
            <Select value={formData.recipient_id} onValueChange={handleRecipientChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select recipient" />
              </SelectTrigger>
              <SelectContent>
                {practitioners.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name} - {p.role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Subject</Label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Message subject"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Message</Label>
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleAIDraft('meeting')}
                  disabled={isGenerating}
                  className="text-xs h-7"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Meeting
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleAIDraft('update')}
                  disabled={isGenerating}
                  className="text-xs h-7"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Update
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleAIDraft('reminder')}
                  disabled={isGenerating}
                  className="text-xs h-7"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Reminder
                </Button>
              </div>
            </div>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Type your message..."
              rows={6}
            />
          </div>

          <div>
            <Label>Priority</Label>
            <Select 
              value={formData.priority} 
              onValueChange={(v) => setFormData({ ...formData, priority: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => sendMutation.mutate(formData)}
            disabled={!formData.recipient_id || !formData.content || sendMutation.isPending}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {sendMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}