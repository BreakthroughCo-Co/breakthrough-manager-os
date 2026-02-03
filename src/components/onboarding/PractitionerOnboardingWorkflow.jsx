import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle2, Calendar, BookOpen } from 'lucide-react';

export default function PractitionerOnboardingWorkflow({ practitionerId }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: practitioner } = useQuery({
    queryKey: ['practitioner', practitionerId],
    queryFn: async () => {
      const practitioners = await base44.entities.Practitioner.list();
      return practitioners?.find(p => p.id === practitionerId);
    }
  });

  const { data: onboardingPlan, refetch } = useQuery({
    queryKey: ['onboardingPlan', practitionerId],
    queryFn: async () => {
      const plans = await base44.entities.PractitionerOnboardingPlan.filter({ practitioner_id: practitionerId });
      return plans?.[0];
    }
  });

  const { data: relatedTasks } = useQuery({
    queryKey: ['onboardingTasks', onboardingPlan?.id],
    enabled: !!onboardingPlan?.id,
    queryFn: async () => {
      const tasks = await base44.entities.Task.filter({ 
        related_entity_id: onboardingPlan.id,
        related_entity_type: 'PractitionerOnboardingPlan'
      });
      return tasks || [];
    }
  });

  const handleGeneratePlan = async () => {
    if (!practitioner?.role || !practitioner?.start_date) {
      alert('Practitioner role and start date required');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await base44.functions.invoke('generatePractitionerOnboardingPlan', {
        practitioner_id: practitionerId,
        role: practitioner.role,
        start_date: practitioner.start_date
      });
      refetch();
    } catch (err) {
      alert('Error generating plan: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!practitioner) {
    return <Card><CardContent className="py-4">Practitioner not found</CardContent></Card>;
  }

  if (!onboardingPlan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Generate Onboarding Plan</CardTitle>
          <CardDescription>{practitioner.full_name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50">
            <BookOpen className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700">
              Generate a personalized onboarding plan based on the practitioner's role and identified skill gaps.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-600 font-semibold">Role</p>
              <p className="text-slate-900">{practitioner.role}</p>
            </div>
            <div>
              <p className="text-slate-600 font-semibold">Start Date</p>
              <p className="text-slate-900">{practitioner.start_date}</p>
            </div>
          </div>

          <Button
            onClick={handleGeneratePlan}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Onboarding Plan'
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const completionPercentage = relatedTasks?.length > 0
    ? Math.round((relatedTasks.filter(t => t.status === 'completed').length / relatedTasks.length) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Plan Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Onboarding Plan</CardTitle>
              <CardDescription>{practitioner.full_name} - {onboardingPlan.role}</CardDescription>
            </div>
            <Badge className={
              onboardingPlan.status === 'completed' ? 'bg-green-600' :
              onboardingPlan.status === 'in_progress' ? 'bg-blue-600' :
              'bg-slate-600'
            }>
              {onboardingPlan.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-600 font-semibold">Start Date</p>
              <p className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                {onboardingPlan.start_date}
              </p>
            </div>
            <div>
              <p className="text-slate-600 font-semibold">Target Completion</p>
              <p className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                {onboardingPlan.completion_target_date}
              </p>
            </div>
          </div>

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">Overall Progress</span>
              <span className="text-sm font-bold">{completionPercentage}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="objectives">Objectives</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-3 mt-4">
          {onboardingPlan.initial_assessment && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Initial Assessment</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-700">
                {onboardingPlan.initial_assessment}
              </CardContent>
            </Card>
          )}

          {onboardingPlan.identified_skill_gaps?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Identified Skill Gaps</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {onboardingPlan.identified_skill_gaps.map((gap, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="text-orange-600">•</span>
                      <span>{gap}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {onboardingPlan.mentorship_focus_areas?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mentorship Focus Areas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {onboardingPlan.mentorship_focus_areas.map((area, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-3 w-3 text-blue-600" />
                      <span>{area}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Objectives */}
        <TabsContent value="objectives" className="space-y-3 mt-4">
          {onboardingPlan.week_1_objectives?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Week 1 Objectives</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {onboardingPlan.week_1_objectives.map((obj, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold mt-0.5">→</span>
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {onboardingPlan.month_1_objectives?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Month 1 Objectives</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {onboardingPlan.month_1_objectives.map((obj, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold mt-0.5">→</span>
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Training */}
        <TabsContent value="training" className="space-y-3 mt-4">
          {onboardingPlan.critical_training_modules?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Critical Training Modules</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {onboardingPlan.critical_training_modules.map((module, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                      <span className="text-red-600 font-bold text-xs">CRITICAL</span>
                      <span className="text-sm flex-1">{module}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Checklist */}
        <TabsContent value="checklist" className="space-y-3 mt-4">
          {onboardingPlan.compliance_checklist?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Compliance Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {onboardingPlan.compliance_checklist.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <input type="checkbox" className="w-4 h-4" id={`check-${idx}`} />
                      <label htmlFor={`check-${idx}`} className="cursor-pointer">{item}</label>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}