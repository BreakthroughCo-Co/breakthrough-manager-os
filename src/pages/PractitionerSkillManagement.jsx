import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PractitionerSkillMatrix from '@/components/practitioner/PractitionerSkillMatrix';
import { AlertCircle } from 'lucide-react';

export default function PractitionerSkillManagement() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Practitioner Skill Matrix</h1>
        <p className="text-slate-600 mt-2">Dynamic assessment of practitioner strengths, development areas, and peer mentoring opportunities</p>
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700">
          AI-powered analysis of performance feedback, incident patterns, client goal attainment, and training data to identify strengths, development needs, and optimal peer mentor pairings.
        </AlertDescription>
      </Alert>

      <PractitionerSkillMatrix />
    </div>
  );
}