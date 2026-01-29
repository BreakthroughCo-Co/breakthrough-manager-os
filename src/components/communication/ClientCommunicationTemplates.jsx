import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  Calendar, 
  FileText, 
  Bell, 
  Sparkles, 
  Loader2, 
  Copy, 
  Check,
  Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const templates = [
  {
    id: 'appointment_reminder',
    name: 'Appointment Reminder',
    icon: Calendar,
    category: 'Scheduling',
    description: 'Remind about upcoming session'
  },
  {
    id: 'session_summary',
    name: 'Session Summary',
    icon: FileText,
    category: 'Clinical',
    description: 'Summarize completed session'
  },
  {
    id: 'plan_review',
    name: 'Plan Review Notice',
    icon: Bell,
    category: 'Admin',
    description: 'Notify about upcoming plan review'
  },
  {
    id: 'progress_update',
    name: 'Progress Update',
    icon: FileText,
    category: 'Clinical',
    description: 'Share progress with family'
  }
];

export default function ClientCommunicationTemplates({ client, isOpen, onClose }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateTemplate = async (template) => {
    setSelectedTemplate(template);
    setIsGenerating(true);
    setGeneratedContent('');

    const prompts = {
      appointment_reminder: `Generate a friendly appointment reminder email for an NDIS client named ${client?.full_name || '[Client Name]'}. 
        Service type: ${client?.service_type || 'Behaviour Support'}
        Keep it professional, warm, and include a reminder to contact us if they need to reschedule.`,
      session_summary: `Generate a professional session summary email for the family/guardian of ${client?.full_name || '[Client Name]'}.
        Service type: ${client?.service_type || 'Behaviour Support'}
        Include placeholders for: session date, key activities, progress observations, and next steps.
        Keep it positive and strengths-focused.`,
      plan_review: `Generate a notification email about an upcoming NDIS plan review for ${client?.full_name || '[Client Name]'}.
        Current plan end date: ${client?.plan_end_date || '[Plan End Date]'}
        Include: what to expect, how to prepare, and offer to discuss any concerns.`,
      progress_update: `Generate a monthly progress update email for the family of ${client?.full_name || '[Client Name]'}.
        Service type: ${client?.service_type || 'Behaviour Support'}
        Include placeholders for: goals worked on, achievements, challenges, and upcoming focus areas.
        Maintain a positive, professional tone.`
    };

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an NDIS Behaviour Support Practice Manager. ${prompts[template.id]}
        
        Format the email with:
        - Subject line
        - Professional greeting
        - Main content
        - Professional sign-off
        
        Keep it concise but thorough.`
      });
      setGeneratedContent(result);
    } catch (error) {
      setGeneratedContent('Failed to generate template. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEmail = async () => {
    if (!client?.primary_contact_email || !generatedContent) return;
    
    try {
      await base44.integrations.Core.SendEmail({
        to: client.primary_contact_email,
        subject: `Breakthrough Coaching - ${selectedTemplate?.name || 'Update'}`,
        body: generatedContent
      });
      onClose();
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Client Communication Templates</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {/* Template Selection */}
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Select a template to generate</p>
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => generateTemplate(template)}
                className={cn(
                  "w-full p-4 rounded-xl border text-left transition-all hover:shadow-md",
                  selectedTemplate?.id === template.id
                    ? "border-teal-300 bg-teal-50"
                    : "border-slate-200 bg-white hover:border-teal-200"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                    <template.icon className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{template.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{template.description}</p>
                    <Badge variant="outline" className="mt-2 text-xs">{template.category}</Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Generated Content */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-500">Generated Content</p>
              {generatedContent && (
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="w-4 h-4 mr-1 text-green-600" /> : <Copy className="w-4 h-4 mr-1" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              )}
            </div>
            
            {isGenerating ? (
              <div className="h-64 rounded-xl border border-slate-200 flex items-center justify-center bg-slate-50">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Generating template...</p>
                </div>
              </div>
            ) : generatedContent ? (
              <Textarea
                value={generatedContent}
                onChange={(e) => setGeneratedContent(e.target.value)}
                className="min-h-[300px] text-sm"
              />
            ) : (
              <div className="h-64 rounded-xl border border-dashed border-slate-200 flex items-center justify-center bg-slate-50">
                <div className="text-center">
                  <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Select a template to generate content</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {generatedContent && client?.primary_contact_email && (
            <Button onClick={handleSendEmail} className="bg-teal-600 hover:bg-teal-700">
              <Mail className="w-4 h-4 mr-2" />
              Send to {client.primary_contact_name || 'Contact'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}