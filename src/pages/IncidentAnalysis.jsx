import React from 'react';
import IncidentAnalysisDashboard from '@/components/incidents/IncidentAnalysisDashboard';

export default function IncidentAnalysisPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Incident Analysis & Prevention</h1>
        <p className="text-slate-600">AI-powered incident categorization, root cause analysis, and preventative measures.</p>
      </div>
      <IncidentAnalysisDashboard />
    </div>
  );
}