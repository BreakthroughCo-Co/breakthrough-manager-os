import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ClientTransitionManager from '@/components/client/ClientTransitionManager';
import { AlertCircle } from 'lucide-react';

export default function ClientTransitions() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Client Transitions</h1>
        <p className="text-slate-600 mt-2">Manage practitioner changes and service transitions with AI-generated handover summaries</p>
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700">
          AI analyzes client progress, risk profile, and current support to generate comprehensive handover summaries ensuring continuity of care during transitions.
        </AlertDescription>
      </Alert>

      <ClientTransitionManager />
    </div>
  );
}