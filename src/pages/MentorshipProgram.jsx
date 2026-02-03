import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import MentorshipProgramManager from '@/components/mentorship/MentorshipProgramManager';
import { Users, AlertCircle } from 'lucide-react';

export default function MentorshipProgram() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Mentorship Program</h1>
        <p className="text-slate-600 mt-2">Manage practitioner mentor-mentee pairings, track progress, and record feedback</p>
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <Users className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700">
          Assign peer mentors from AI-suggested pairings based on skill gaps and practitioner strengths. Track sessions, record feedback from both mentor and mentee, and log audit trails for professional development.
        </AlertDescription>
      </Alert>

      <MentorshipProgramManager />
    </div>
  );
}