import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { GraduationCap, CheckCircle, Clock, AlertCircle, BookOpen, FileCheck, Video } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function PractitionerOnboardingWorkflow({ practitionerId }) {
  const [activePhase, setActivePhase] = useState('induction');
  const queryClient = useQueryClient();

  const { data: onboardingPlan, isLoading } = useQuery({
    queryKey: ['onboardingPlan', practitionerId],
    queryFn: async () => {
      const response = await base44.functions.invoke('generatePractitionerOnboardingPlan', {
        practitioner_id: practitionerId
      });
      return response.data;
    },
    enabled: !!practitionerId
  });

  const { data: practitioner } = useQuery({
    queryKey: ['practitioner', practitionerId],
    queryFn: () => base44.entities.Practitioner.get(practitionerId),
    enabled: !!practitionerId
  });

  const updateProgressMutation = useMutation({
    mutationFn: async (updateData) => {
      await base44.entities.PractitionerOnboardingPlan.update(
        onboardingPlan.onboarding_plan_id,
        updateData
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboardingPlan', practitionerId] });
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-slate-500">Loading personalized onboarding plan...</p>
        </CardContent>
      </Card>
    );
  }

  if (!onboardingPlan?.success) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Unable to load onboarding plan. Please contact your manager.
        </AlertDescription>
      </Alert>
    );
  }

  const plan = onboardingPlan.onboarding_plan;

  const getStatusBadge = (status) => {
    const variants = {
      draft: 'bg-slate-100 text-slate-800',
      active: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-amber-100 text-amber-800',
      completed: 'bg-green-100 text-green-800'
    };
    return variants[status] || variants.draft;
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-teal-600" />
              {practitioner?.full_name}'s Onboarding Journey
            </CardTitle>
            <Badge className={getStatusBadge(plan.status)}>
              {plan.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-slate-600">Role</p>
              <p className="font-semibold">{plan.role}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Start Date</p>
              <p className="font-semibold">{new Date(plan.start_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Target Completion</p>
              <p className="font-semibold">
                {plan.completion_target_date 
                  ? new Date(plan.completion_target_date).toLocaleDateString()
                  : 'Not set'}
              </p>
            </div>
          </div>

          {plan.assigned_mentor && (
            <Alert className="bg-blue-50 border-blue-200">
              <BookOpen className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700">
                Your assigned mentor: <strong>{plan.assigned_mentor}</strong>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Learning Path Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personalized Learning Path</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activePhase} onValueChange={setActivePhase}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="induction">Week 1</TabsTrigger>
              <TabsTrigger value="shadowing">Month 1</TabsTrigger>
              <TabsTrigger value="supervised">Month 3</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
            </TabsList>

            <TabsContent value="induction" className="space-y-4">
              <h3 className="font-semibold">Week 1 Objectives</h3>
              {plan.week_1_objectives?.map((objective, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <span className="text-sm">{objective}</span>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="shadowing" className="space-y-4">
              <h3 className="font-semibold">Month 1 Objectives</h3>
              {plan.month_1_objectives?.map((objective, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded">
                  <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
                  <span className="text-sm">{objective}</span>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="supervised" className="space-y-4">
              <h3 className="font-semibold">Month 3 Milestones</h3>
              {plan.month_3_objectives?.map((objective, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <span className="text-sm">{objective}</span>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="compliance" className="space-y-4">
              <h3 className="font-semibold">NDIS Compliance Requirements</h3>
              {plan.compliance_checklist?.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded">
                  <FileCheck className="h-5 w-5 text-teal-600 mt-0.5" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Critical Training Modules */}
      {plan.critical_training_modules?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Required Training Modules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {plan.critical_training_modules.map((module, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <Video className="h-5 w-5 text-slate-400" />
                    <span className="text-sm font-medium">{module}</span>
                  </div>
                  <Button size="sm" variant="outline">
                    Start Module
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skill Gaps & Focus Areas */}
      {plan.identified_skill_gaps?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Development Focus Areas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {plan.identified_skill_gaps.map((gap, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span>{gap}</span>
                </div>
              ))}
            </div>
            {plan.mentorship_focus_areas && (
              <div className="mt-4 p-3 bg-blue-50 rounded">
                <p className="text-sm font-medium text-blue-900">Mentorship Focus:</p>
                <ul className="mt-2 text-sm text-blue-700 space-y-1">
                  {plan.mentorship_focus_areas.map((area, idx) => (
                    <li key={idx}>• {area}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Career Pathway Preview */}
      {plan.initial_career_pathway && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Career Progression Pathway</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700">{plan.initial_career_pathway}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}