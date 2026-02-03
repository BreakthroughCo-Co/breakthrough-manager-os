import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PractitionerSkillMatrix from '@/components/practitioner/PractitionerSkillMatrix';
import MentorshipProgramManager from '@/components/training/MentorshipProgramManager';
import { AlertCircle } from 'lucide-react';

export default function PractitionerSkillManagement() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Practitioner Skill Matrix & Development</h1>
        <p className="text-slate-600 mt-2">AI-driven skill assessments, personalized training plans, and peer mentorship program management</p>
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700">
          Comprehensive practitioner development platform: skill matrix analysis, AI-generated training recommendations, formal mentorship pairings, and audit-ready progress tracking.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="matrix" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="matrix">Skill Matrix</TabsTrigger>
          <TabsTrigger value="mentorship">Mentorship Program</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix">
          <PractitionerSkillMatrix />
        </TabsContent>

        <TabsContent value="mentorship">
          <MentorshipProgramManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}