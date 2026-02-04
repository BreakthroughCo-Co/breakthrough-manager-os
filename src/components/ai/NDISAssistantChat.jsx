import React, { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Bot, Send, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import DOMPurify from 'dompurify';

export default function NDISAssistantChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const queryMutation = useMutation({
    mutationFn: async (query) => {
      const response = await base44.functions.invoke('ndisAssistantQuery', { query });
      return response.data;
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    }
  });

  const handleSend = () => {
    if (!input.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    queryMutation.mutate(input);
    setInput('');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-5 w-5 text-teal-600" />
          NDIS Compliance Assistant
        </CardTitle>
        <p className="text-xs text-slate-600">
          Ask about NDIS policies, best practices, or app functionality
        </p>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-4 space-y-4 overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <Bot className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-600">
                Ask me about NDIS Practice Standards, compliance requirements, or best practices.
              </p>
              <div className="mt-4 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setInput('What are the worker screening requirements?');
                    setTimeout(() => handleSend(), 100);
                  }}
                >
                  Worker screening requirements
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setInput('When must I report incidents to NDIS Commission?');
                    setTimeout(() => handleSend(), 100);
                  }}
                >
                  Incident reporting obligations
                </Button>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 text-slate-900'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="text-sm">{msg.content}</p>
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="text-sm mb-2">{children}</p>,
                        ul: ({ children }) => <ul className="text-sm mb-2 ml-4">{children}</ul>,
                        ol: ({ children }) => <ol className="text-sm mb-2 ml-4">{children}</ol>,
                        li: ({ children }) => <li className="mb-1">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        html: ({ value }) => {
                          const sanitized = DOMPurify.sanitize(value);
                          return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
                        }
                      }}
                    >
                      {DOMPurify.sanitize(msg.content)}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}

          {queryMutation.isPending && (
            <div className="flex justify-start">
              <div className="bg-slate-100 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <div className="animate-pulse">Analyzing...</div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t pt-4">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask about NDIS compliance, policies, or app features..."
              className="min-h-[60px]"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || queryMutation.isPending}
              size="icon"
              className="self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
            <AlertCircle className="h-3 w-3" />
            AI-generated guidance. Verify critical compliance matters with official NDIS documentation.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}