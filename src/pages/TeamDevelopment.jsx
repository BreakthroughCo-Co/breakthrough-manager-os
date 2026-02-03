import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import TeamDevelopmentDashboard from '@/components/training/TeamDevelopmentDashboard';
import { AlertCircle } from 'lucide-react';

export default function TeamDevelopment() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Team Development</h1>
        <p className="text-slate-600 mt-2">AI-driven team-wide skill gap analysis and professional development planning</p>
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700">
          Analyzes incident patterns, session data, and goal progress across practitioners to identify emerging skill gaps and recommend targeted team-wide training initiatives.
        </AlertDescription>
      </Alert>

      <TeamDevelopmentDashboard />
    </div>
  );
}