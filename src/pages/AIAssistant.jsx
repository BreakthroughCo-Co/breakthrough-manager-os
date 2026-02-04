import React from 'react';
import { Bot } from 'lucide-react';
import NDISAssistantChat from '@/components/ai/NDISAssistantChat';
import KnowledgeBaseManager from '@/components/ai/KnowledgeBaseManager';

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <NDISAssistantChat />
        </div>
        <div>
          <KnowledgeBaseManager />
        </div>
      </div>
    </div>
  );
}