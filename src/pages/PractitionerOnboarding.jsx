import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PractitionerOnboardingWorkflow from '@/components/onboarding/PractitionerOnboardingWorkflow';
import { Users, CheckCircle2, Clock } from 'lucide-react';

export default function PractitionerOnboarding() {
  const [selectedPractitionerId, setSelectedPractitionerId] = useState(null);

  // Fetch practitioners
  const { data: practitioners } = useQuery({
    queryKey: ['practitioners_all'],
    queryFn: async () => {
      const data = await base44.entities.Practitioner.list();
      return data?.sort((a, b) => a.full_name.localeCompare(b.full_name)) || [];
    }
  });

  // Fetch onboarding plans
  const { data: onboardingPlans } = useQuery({
    queryKey: ['onboardingPlans'],
    queryFn: async () => {
      const data = await base44.entities.PractitionerOnboardingPlan.list();
      return data?.sort((a, b) => new Date(b.plan_created_date) - new Date(a.plan_created_date)) || [];
    }
  });

  // Fetch career pathways
  const { data: careerPathways } = useQuery({
    queryKey: ['careerPathways'],
    queryFn: async () => {
      const data = await base44.entities.CareerPathway.list();
      return data || [];
    }
  });

  const statusColors = {
    draft: 'bg-slate-100 text-slate-800',
    active: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800'
  };

  const onboardingStats = {
    active: onboardingPlans?.filter(p => p.status === 'active' || p.status === 'in_progress').length || 0,
    completed: onboardingPlans?.filter(p => p.status === 'completed').length || 0,
    total: onboardingPlans?.length || 0
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Practitioner Onboarding</h1>
        <p className="text-slate-600 mt-2">AI-driven personalized onboarding plans and career pathways</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600 mb-1">Active Onboarding</p>
            <p className="text-3xl font-bold text-slate-900">{onboardingStats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600 mb-1">Completed</p>
            <p className="text-3xl font-bold text-slate-900">{onboardingStats.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600 mb-1">Total Plans</p>
            <p className="text-3xl font-bold text-slate-900">{onboardingStats.total}</p>
          </CardContent>
        </Card>
      </div>

      {/* Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <Users className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700">
          AI-generated onboarding plans include personalized training paths, compliance checklists, mentorship focus areas, and career progression roadmaps based on role and skill gaps.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="select" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="select">Select Practitioner</TabsTrigger>
          <TabsTrigger value="overview">All Plans Overview</TabsTrigger>
        </TabsList>

        {/* Select Practitioner Tab */}
        <TabsContent value="select" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Choose Practitioner</CardTitle>
              <CardDescription>Select to view or create onboarding plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedPractitionerId || ''} onValueChange={setSelectedPractitionerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Search practitioners..." />
                </SelectTrigger>
                <SelectContent>
                  {practitioners?.map(p => {
                    const hasOnboarding = onboardingPlans?.some(op => op.practitioner_id === p.id);
                    return (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name} - {p.role} {hasOnboarding ? '✓' : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedPractitionerId && (
            <PractitionerOnboardingWorkflow practitionerId={selectedPractitionerId} />
          )}
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {onboardingPlans && onboardingPlans.length > 0 ? (
            <div className="space-y-2">
              {onboardingPlans.map(plan => {
                const practitioner = practitioners?.find(p => p.id === plan.practitioner_id);
                const careerPath = careerPathways?.find(cp => cp.practitioner_id === plan.practitioner_id);
                
                return (
                  <Card
                    key={plan.id}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setSelectedPractitionerId(plan.practitioner_id)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold">{practitioner?.full_name}</h4>
                            <Badge className={statusColors[plan.status]}>
                              {plan.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-xs text-slate-600 mb-2">
                            <div>
                              <p className="font-semibold text-slate-900">{plan.role}</p>
                              <p>Role</p>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{plan.start_date}</p>
                              <p>Start Date</p>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{plan.completion_target_date}</p>
                              <p>Target Completion</p>
                            </div>
                          </div>

                          {careerPath && (
                            <div className="text-xs text-slate-600">
                              <p><strong>Career Path:</strong> {plan.role} → {careerPath.recommended_next_role}</p>
                            </div>
                          )}
                        </div>
                        <div className="text-right text-xs">
                          {plan.status === 'completed' && (
                            <div className="flex items-center gap-1 text-green-600 font-semibold">
                              <CheckCircle2 className="h-4 w-4" />
                              Completed
                            </div>
                          )}
                          {(plan.status === 'active' || plan.status === 'in_progress') && (
                            <div className="flex items-center gap-1 text-blue-600 font-semibold">
                              <Clock className="h-4 w-4" />
                              In Progress
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12 text-slate-500">
                <p>No onboarding plans created yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}