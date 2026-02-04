import React from 'react';
import { Bot } from 'lucide-react';
import NDISAssistantChat from '@/components/ai/NDISAssistantChat';

export default function AIAssistant() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bot className="h-8 w-8 text-teal-600" />
          AI Compliance Assistant
        </h1>
        <p className="text-slate-600 mt-1">
          Instant guidance on NDIS policies, standards, and operational best practices
        </p>
      </div>

      <div className="max-w-4xl">
        <NDISAssistantChat />
      </div>
    </div>
  );
}