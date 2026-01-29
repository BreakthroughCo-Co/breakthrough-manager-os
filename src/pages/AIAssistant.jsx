import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
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
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

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

export default function AIAssistant() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

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

  const handleCopy = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setPrompt('');
    setResponse('');
    setSelectedTemplate(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-600" />
          AI Assistant
        </h2>
        <p className="text-slate-500 mt-1">Get help with documentation, communications, and operational tasks</p>
      </div>

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
          {/* Input Area */}
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
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-lg font-semibold mt-4 mb-2">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-base font-semibold mt-3 mb-1">{children}</h3>,
                        p: ({ children }) => <p className="mb-2 text-slate-700">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="text-slate-700">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-purple-200 pl-4 italic text-slate-600 my-3">
                            {children}
                          </blockquote>
                        ),
                        code: ({ inline, children }) => 
                          inline ? (
                            <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm">{children}</code>
                          ) : (
                            <pre className="bg-slate-100 p-3 rounded-lg overflow-x-auto">
                              <code>{children}</code>
                            </pre>
                          ),
                      }}
                    >
                      {response}
                    </ReactMarkdown>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tips */}
          {!response && !isLoading && (
            <Card className="bg-purple-50 border-purple-100">
              <CardContent className="pt-6">
                <h4 className="font-medium text-purple-900 mb-2">Tips for Better Results</h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• Be specific about the context (participant details, situation, goals)</li>
                  <li>• Mention the intended audience (parents, NDIS, team members)</li>
                  <li>• Specify the format you need (email, report section, dot points)</li>
                  <li>• Include relevant NDIS terminology or requirements</li>
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}