import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Clock, AlertTriangle, Loader2, RefreshCw, Calendar, Users, BookOpen } from 'lucide-react';

export default function PractitionerOnboarding() {
  const [selectedPractitioner, setSelectedPractitioner] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const queryClient = useQueryClient();

  // Fetch practitioners
  const { data: practitioners = [] } = useQuery({
    queryKey: ['practitioners'],
    queryFn: () => base44.entities.Practitioner.list()
  });

  // Fetch onboarding for selected practitioner
  const { data: onboarding } = useQuery({
    queryKey: ['onboarding', selectedPractitioner],
    queryFn: () => base44.entities.PractitionerOnboarding.filter({ practitioner_id: selectedPractitioner }),
    enabled: !!selectedPractitioner,
    select: data => data[0]
  });

  // Fetch training assignments
  const { data: trainingAssignments = [] } = useQuery({
    queryKey: ['trainingAssignments', selectedPractitioner],
    queryFn: () => base44.entities.TrainingAssignment.filter({ practitioner_id: selectedPractitioner }),
    enabled: !!selectedPractitioner
  });

  // Fetch tasks for practitioner
  const { data: tasks = [] } = useQuery({
    queryKey: ['practitionerTasks', selectedPractitioner],
    queryFn: () => base44.entities.Task.filter({ assigned_to: practitioners.find(p => p.id === selectedPractitioner)?.email }),
    enabled: !!selectedPractitioner
  });

  const generateChecklist = async () => {
    if (!selectedPractitioner) {
      alert('Please select a practitioner');
      return;
    }

    const practitioner = practitioners.find(p => p.id === selectedPractitioner);
    setIsGenerating(true);

    try {
      const result = await base44.functions.invoke('generateOnboardingChecklist', {
        practitioner_id: selectedPractitioner,
        role: practitioner.role,
        service_types: [practitioner.service_type]
      });

      alert('Onboarding checklist generated successfully!');
      queryClient.invalidateQueries({ queryKey: ['onboarding', selectedPractitioner] });
    } catch (error) {
      alert('Failed to generate checklist: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const scheduleTraining = async () => {
    if (!selectedPractitioner || !onboarding?.id) {
      alert('Please generate checklist first');
      return;
    }

    setIsScheduling(true);

    try {
      const result = await base44.functions.invoke('scheduleOnboardingTraining', {
        practitioner_id: selectedPractitioner,
        onboarding_id: onboarding.id
      });

      alert(`${result.data.total_modules_scheduled} training modules scheduled!`);
      queryClient.invalidateQueries({ queryKey: ['trainingAssignments', selectedPractitioner] });
    } catch (error) {
      alert('Failed to schedule training: ' + error.message);
    } finally {
      setIsScheduling(false);
    }
  };

  // Parse checklist items
  let checklistItems = [];
  if (onboarding?.checklist_items) {
    try {
      checklistItems = JSON.parse(onboarding.checklist_items);
    } catch (e) {
      console.error('Failed to parse checklist items:', e);
    }
  }

  const completedItems = checklistItems.filter(item => item.status === 'completed').length;
  const completionPercentage = checklistItems.length > 0 
    ? (completedItems / checklistItems.length) * 100 
    : 0;

  const selectedPractitionerData = practitioners.find(p => p.id === selectedPractitioner);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Practitioner Onboarding</h1>
        <p className="text-muted-foreground mt-1">AI-driven onboarding checklists and training scheduling</p>
      </div>

      {/* Practitioner Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Select Practitioner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <select 
            value={selectedPractitioner || ''}
            onChange={(e) => setSelectedPractitioner(e.target.value || null)}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="">-- Choose practitioner --</option>
            {practitioners.map(p => (
              <option key={p.id} value={p.id}>
                {p.full_name} ({p.role})
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {selectedPractitioner && selectedPractitionerData && (
        <>
          {/* Practitioner Overview */}
          <Card className="bg-gradient-to-r from-teal-50 to-blue-50">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="text-lg font-semibold">{selectedPractitionerData.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <p className="text-lg font-semibold">{selectedPractitionerData.role}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className="mt-1">
                    {onboarding?.status || 'not_started'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progress Overview */}
          {onboarding && (
            <Card>
              <CardHeader>
                <CardTitle>Onboarding Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Checklist Completion</span>
                    <span className="text-sm text-muted-foreground">
                      {completedItems}/{checklistItems.length}
                    </span>
                  </div>
                  <Progress value={completionPercentage} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {completionPercentage.toFixed(0)}% complete
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="p-2 bg-blue-50 rounded">
                    <p className="text-muted-foreground text-xs">Total Items</p>
                    <p className="font-bold text-lg">{checklistItems.length}</p>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded">
                    <p className="text-muted-foreground text-xs">Completed</p>
                    <p className="font-bold text-lg text-emerald-600">{completedItems}</p>
                  </div>
                  <div className="p-2 bg-amber-50 rounded">
                    <p className="text-muted-foreground text-xs">Pending</p>
                    <p className="font-bold text-lg text-amber-600">{checklistItems.length - completedItems}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={generateChecklist}
              disabled={isGenerating || !!onboarding}
              className="flex-1 bg-teal-600 hover:bg-teal-700"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {onboarding ? 'Checklist Generated' : 'Generate Onboarding Checklist'}
            </Button>
            <Button 
              onClick={scheduleTraining}
              disabled={isScheduling || !onboarding}
              variant="outline"
              className="flex-1"
            >
              {isScheduling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calendar className="w-4 h-4 mr-2" />}
              Schedule Training
            </Button>
          </div>

          {/* Tabs for Details */}
          {onboarding && (
            <Tabs defaultValue="checklist" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="checklist">Checklist</TabsTrigger>
                <TabsTrigger value="training">Training</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
              </TabsList>

              {/* Checklist Tab */}
              <TabsContent value="checklist" className="space-y-3">
                {checklistItems.length === 0 ? (
                  <Alert>
                    <AlertDescription>No checklist items. Generate a checklist first.</AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {checklistItems.reduce((groups, item) => {
                      const section = item.section || 'Other';
                      if (!groups[section]) groups[section] = [];
                      groups[section].push(item);
                      return groups;
                    }, {}) && Object.entries(
                      checklistItems.reduce((groups, item) => {
                        const section = item.section || 'Other';
                        if (!groups[section]) groups[section] = [];
                        groups[section].push(item);
                        return groups;
                      }, {})
                    ).map(([section, items]) => (
                      <Card key={section}>
                        <CardHeader>
                          <CardTitle className="text-base">{section}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {items.map((item, idx) => (
                            <div key={idx} className="p-3 border rounded flex items-start gap-3">
                              <div className={`mt-1 ${item.status === 'completed' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                <CheckCircle2 className="w-5 h-5" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-1">
                                  <h4 className="font-medium text-sm">{item.task_name}</h4>
                                  <Badge variant="outline" className="text-xs">
                                    {item.priority}
                                  </Badge>
                                </div>
                                <p className="text-xs text-slate-600 mb-2">
                                  {item.success_criteria}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span>Responsible: {item.responsible_party}</span>
                                  <span>Est: {item.estimated_days}d</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Training Tab */}
              <TabsContent value="training" className="space-y-3">
                {trainingAssignments.length === 0 ? (
                  <Alert>
                    <AlertDescription>No training scheduled. Click "Schedule Training" to assign modules.</AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {trainingAssignments.map(assignment => (
                      <Card key={assignment.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold">{assignment.module_name}</h4>
                              <p className="text-sm text-muted-foreground">
                                Scheduled: {assignment.scheduled_start_date}
                              </p>
                            </div>
                            <Badge className={
                              assignment.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                              assignment.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-slate-100 text-slate-800'
                            }>
                              {assignment.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 mt-2">{assignment.notes}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Timeline Tab */}
              <TabsContent value="timeline" className="space-y-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Onboarding Timeline</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        First Day Priorities
                      </h4>
                      <ul className="space-y-1 text-sm">
                        {onboarding.first_day_priorities && JSON.parse(onboarding.first_day_priorities).map((item, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-slate-700">
                            <span className="text-teal-600">→</span> {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        First Week Goals
                      </h4>
                      <ul className="space-y-1 text-sm">
                        {onboarding.first_week_goals && JSON.parse(onboarding.first_week_goals).map((item, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-slate-700">
                            <span className="text-teal-600">→</span> {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        First Month Milestones
                      </h4>
                      <ul className="space-y-1 text-sm">
                        {onboarding.first_month_milestones && JSON.parse(onboarding.first_month_milestones).map((item, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-slate-700">
                            <span className="text-teal-600">→</span> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </>
      )}
    </div>
  );
}