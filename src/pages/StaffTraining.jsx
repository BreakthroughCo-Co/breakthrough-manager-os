import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { GraduationCap, Users, Calendar, TrendingUp, AlertCircle, CheckCircle, Clock, Plus, Zap, Brain, UserPlus } from 'lucide-react';

export default function StaffTraining() {
  const [selectedPractitioner, setSelectedPractitioner] = useState('all');
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isPolicyDialogOpen, setIsPolicyDialogOpen] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    practitioner_id: '',
    module_id: '',
    due_date: '',
    assignment_reason: 'manual',
  });
  const [policyForm, setPolicyForm] = useState({ 
    title: '', 
    category: 'NDIS Compliance', 
    roles: '' 
  });
  const [isAssigning, setIsAssigning] = useState(false);
  const [skillGapResults, setSkillGapResults] = useState(null);
  const [isAnalyzingSkills, setIsAnalyzingSkills] = useState(false);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({
    requested_module_name: '',
    training_category: 'NDIS Compliance',
    justification: '',
    priority: 'medium',
  });

  const queryClient = useQueryClient();

  const { data: practitioners = [] } = useQuery({
    queryKey: ['practitioners'],
    queryFn: () => base44.entities.Practitioner.list(),
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['trainingModules'],
    queryFn: () => base44.entities.TrainingModule.list(),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['trainingAssignments'],
    queryFn: () => base44.entities.TrainingAssignment.list('-assigned_date'),
  });

  const { data: trainingRequests = [] } = useQuery({
    queryKey: ['trainingRequests'],
    queryFn: () => base44.entities.TrainingRequest.list('-requested_date'),
  });

  const createAssignmentMutation = useMutation({
    mutationFn: (data) => base44.entities.TrainingAssignment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingAssignments'] });
      setIsAssignDialogOpen(false);
      setAssignmentForm({
        practitioner_id: '',
        module_id: '',
        due_date: '',
        assignment_reason: 'manual',
      });
    },
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TrainingAssignment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingAssignments'] });
    },
  });

  const handleCreateAssignment = async () => {
    const practitioner = practitioners.find(p => p.id === assignmentForm.practitioner_id);
    const module = modules.find(m => m.id === assignmentForm.module_id);
    const user = await base44.auth.me();

    await createAssignmentMutation.mutateAsync({
      ...assignmentForm,
      practitioner_name: practitioner?.full_name,
      practitioner_email: practitioner?.email,
      module_name: module?.module_name,
      assigned_date: new Date().toISOString().split('T')[0],
      assigned_by: user.email,
    });
  };

  const handleMarkCompleted = async (assignment) => {
    await updateAssignmentMutation.mutateAsync({
      id: assignment.id,
      data: {
        completion_status: 'completed',
        completed_date: new Date().toISOString(),
        passed: true,
      },
    });
  };

  const handleAutoAssignPolicy = async () => {
    setIsAssigning(true);
    try {
      const rolesArray = policyForm.roles.split(',').map(r => r.trim()).filter(r => r);
      const result = await base44.functions.invoke('autoAssignPolicyTraining', {
        policy_title: policyForm.title,
        policy_category: policyForm.category,
        affected_roles: rolesArray.length > 0 ? rolesArray : null,
      });
      queryClient.invalidateQueries({ queryKey: ['trainingAssignments'] });
      alert(`Assigned "${result.data.module_assigned}" to ${result.data.practitioners_assigned} practitioners`);
      setIsPolicyDialogOpen(false);
      setPolicyForm({ title: '', category: 'NDIS Compliance', roles: '' });
    } catch (error) {
      alert('Failed to assign training: ' + error.message);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleAnalyzeSkillGaps = async (practitionerId) => {
    setIsAnalyzingSkills(true);
    try {
      const result = await base44.functions.invoke('analyzeSkillGaps', {
        practitioner_id: practitionerId,
      });
      setSkillGapResults(result.data);
      setSelectedPractitioner(practitionerId);
    } catch (error) {
      alert('Failed to analyze skill gaps: ' + error.message);
    } finally {
      setIsAnalyzingSkills(false);
    }
  };

  const handleSubmitRequest = async () => {
    try {
      const user = await base44.auth.me();
      const practitioner = practitioners.find(p => p.email === user.email);
      
      await base44.entities.TrainingRequest.create({
        ...requestForm,
        practitioner_id: practitioner.id,
        practitioner_name: practitioner.full_name,
        practitioner_email: practitioner.email,
        requested_date: new Date().toISOString().split('T')[0],
      });
      
      queryClient.invalidateQueries({ queryKey: ['trainingRequests'] });
      setIsRequestDialogOpen(false);
      setRequestForm({
        requested_module_name: '',
        training_category: 'NDIS Compliance',
        justification: '',
        priority: 'medium',
      });
      alert('Training request submitted successfully');
    } catch (error) {
      alert('Failed to submit request: ' + error.message);
    }
  };

  const filteredAssignments = selectedPractitioner === 'all'
    ? assignments
    : assignments.filter(a => a.practitioner_id === selectedPractitioner);

  const practitionerStats = practitioners.map(p => {
    const practAssignments = assignments.filter(a => a.practitioner_id === p.id);
    const completed = practAssignments.filter(a => a.completion_status === 'completed').length;
    const total = practAssignments.length;
    const overdue = practAssignments.filter(a => 
      a.completion_status !== 'completed' && 
      new Date(a.due_date) < new Date()
    ).length;

    return {
      ...p,
      total_assignments: total,
      completed: completed,
      completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
      overdue: overdue,
    };
  });

  const overallStats = {
    total_modules: modules.length,
    total_assignments: assignments.length,
    completed: assignments.filter(a => a.completion_status === 'completed').length,
    overdue: assignments.filter(a => 
      a.completion_status !== 'completed' && 
      new Date(a.due_date) < new Date()
    ).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Staff Training Dashboard</h1>
          <p className="text-muted-foreground">Manage training modules and track staff progress</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UserPlus className="w-4 h-4 mr-2" />
                Request Training
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Training</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Training Module Name</Label>
                  <Input
                    value={requestForm.requested_module_name}
                    onChange={(e) => setRequestForm({...requestForm, requested_module_name: e.target.value})}
                    placeholder="e.g., Advanced Behaviour Intervention"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select
                    value={requestForm.training_category}
                    onValueChange={(v) => setRequestForm({...requestForm, training_category: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NDIS Compliance">NDIS Compliance</SelectItem>
                      <SelectItem value="Behaviour Support">Behaviour Support</SelectItem>
                      <SelectItem value="Clinical Skills">Clinical Skills</SelectItem>
                      <SelectItem value="Policy & Procedure">Policy & Procedure</SelectItem>
                      <SelectItem value="Safety & Risk">Safety & Risk</SelectItem>
                      <SelectItem value="Professional Development">Professional Development</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select
                    value={requestForm.priority}
                    onValueChange={(v) => setRequestForm({...requestForm, priority: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Justification</Label>
                  <Textarea
                    value={requestForm.justification}
                    onChange={(e) => setRequestForm({...requestForm, justification: e.target.value})}
                    placeholder="Explain why you need this training..."
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleSubmitRequest}
                  disabled={!requestForm.requested_module_name || !requestForm.justification}
                  className="w-full"
                >
                  Submit Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isPolicyDialogOpen} onOpenChange={setIsPolicyDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Zap className="w-4 h-4 mr-2" />
                Auto-Assign Policy Training
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Auto-Assign Training for New Policy</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Policy Title</Label>
                  <Input
                    value={policyForm.title}
                    onChange={(e) => setPolicyForm({...policyForm, title: e.target.value})}
                    placeholder="e.g., Updated Restrictive Practice Guidelines"
                  />
                </div>
                <div>
                  <Label>Training Category</Label>
                  <Select
                    value={policyForm.category}
                    onValueChange={(v) => setPolicyForm({...policyForm, category: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NDIS Compliance">NDIS Compliance</SelectItem>
                      <SelectItem value="Behaviour Support">Behaviour Support</SelectItem>
                      <SelectItem value="Policy & Procedure">Policy & Procedure</SelectItem>
                      <SelectItem value="Safety & Risk">Safety & Risk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Affected Roles (comma-separated, leave empty for all)</Label>
                  <Input
                    value={policyForm.roles}
                    onChange={(e) => setPolicyForm({...policyForm, roles: e.target.value})}
                    placeholder="e.g., Behaviour Support Practitioner, Senior Practitioner"
                  />
                </div>
                <Button
                  onClick={handleAutoAssignPolicy}
                  disabled={!policyForm.title || isAssigning}
                  className="w-full"
                >
                  {isAssigning ? 'Assigning...' : 'Auto-Assign Training'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Assign Training
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Training Module</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Practitioner</Label>
                <Select
                  value={assignmentForm.practitioner_id}
                  onValueChange={(val) => setAssignmentForm({...assignmentForm, practitioner_id: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select practitioner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {practitioners.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Training Module</Label>
                <Select
                  value={assignmentForm.module_id}
                  onValueChange={(val) => setAssignmentForm({...assignmentForm, module_id: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select module..." />
                  </SelectTrigger>
                  <SelectContent>
                    {modules.filter(m => m.status === 'active').map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.module_name} ({m.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={assignmentForm.due_date}
                  onChange={(e) => setAssignmentForm({...assignmentForm, due_date: e.target.value})}
                />
              </div>

              <div>
                <Label>Assignment Reason</Label>
                <Select
                  value={assignmentForm.assignment_reason}
                  onValueChange={(val) => setAssignmentForm({...assignmentForm, assignment_reason: val})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="role_requirement">Role Requirement</SelectItem>
                    <SelectItem value="new_policy">New Policy</SelectItem>
                    <SelectItem value="compliance_gap">Compliance Gap</SelectItem>
                    <SelectItem value="skill_development">Skill Development</SelectItem>
                    <SelectItem value="renewal">Renewal</SelectItem>
                    <SelectItem value="manual">Manual Assignment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleCreateAssignment}
                disabled={!assignmentForm.practitioner_id || !assignmentForm.module_id || !assignmentForm.due_date}
                className="w-full"
              >
                Assign Module
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overallStats.total_modules}</p>
                <p className="text-xs text-muted-foreground">Training Modules</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overallStats.completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overallStats.total_assignments - overallStats.completed}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{overallStats.overdue}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Practitioner Training Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {practitionerStats.map(p => (
              <div key={p.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-semibold">{p.full_name}</h4>
                    <p className="text-sm text-muted-foreground">{p.role}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{p.completed} / {p.total_assignments} modules</p>
                    {p.overdue > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {p.overdue} overdue
                      </Badge>
                    )}
                  </div>
                </div>
                <Progress value={p.completion_rate} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="skill-gaps">AI Skill Analysis</TabsTrigger>
          <TabsTrigger value="requests">Training Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Practitioner Training Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {practitionerStats.map(p => (
                  <div key={p.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">{p.full_name}</h4>
                        <p className="text-sm text-muted-foreground">{p.role}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-sm font-medium">{p.completed} / {p.total_assignments}</p>
                          {p.overdue > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {p.overdue} overdue
                            </Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAnalyzeSkillGaps(p.id)}
                          disabled={isAnalyzingSkills}
                        >
                          <Brain className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <Progress value={p.completion_rate} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Training Assignments</CardTitle>
                <Select value={selectedPractitioner} onValueChange={setSelectedPractitioner}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Practitioners</SelectItem>
                    {practitioners.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredAssignments.map(assignment => {
                  const isOverdue = new Date(assignment.due_date) < new Date() && assignment.completion_status !== 'completed';
                  return (
                    <div key={assignment.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold">{assignment.module_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Assigned to: {assignment.practitioner_name} • Due: {new Date(assignment.due_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            assignment.completion_status === 'completed' ? 'default' :
                            isOverdue ? 'destructive' : 'outline'
                          }>
                            {assignment.completion_status}
                          </Badge>
                          {assignment.completion_status !== 'completed' && (
                            <Button size="sm" variant="outline" onClick={() => handleMarkCompleted(assignment)}>
                              Mark Complete
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Reason: {assignment.assignment_reason.replace(/_/g, ' ')}</span>
                        {assignment.completed_date && (
                          <span>Completed: {new Date(assignment.completed_date).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredAssignments.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No training assignments found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skill-gaps" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI-Powered Skill Gap Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Select Practitioner</Label>
                  <div className="flex gap-2">
                    <Select value={selectedPractitioner} onValueChange={setSelectedPractitioner}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose practitioner" />
                      </SelectTrigger>
                      <SelectContent>
                        {practitioners.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => selectedPractitioner && selectedPractitioner !== 'all' && handleAnalyzeSkillGaps(selectedPractitioner)}
                      disabled={!selectedPractitioner || selectedPractitioner === 'all' || isAnalyzingSkills}
                    >
                      {isAnalyzingSkills ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Brain className="w-4 h-4 mr-2" />
                      )}
                      Analyze
                    </Button>
                  </div>
                </div>

                {skillGapResults && (
                  <div className="space-y-4 mt-6">
                    <Card className="border-blue-200 bg-blue-50">
                      <CardContent className="pt-6">
                        <h4 className="font-semibold text-blue-900 mb-2">Overall Assessment</h4>
                        <p className="text-sm text-blue-800">{skillGapResults.analysis.overall_assessment}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Identified Skill Gaps</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {skillGapResults.analysis.identified_gaps.map((gap, idx) => (
                            <div key={idx} className="border-l-4 border-l-orange-500 pl-3 py-2">
                              <div className="flex items-center justify-between mb-1">
                                <p className="font-medium text-sm">{gap.gap_area}</p>
                                <Badge variant={gap.severity === 'high' ? 'destructive' : 'secondary'}>
                                  {gap.severity}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{gap.evidence}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Recommended Training</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {skillGapResults.analysis.recommended_modules.map((rec, idx) => (
                            <div key={idx} className="flex items-start justify-between p-3 border rounded">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{rec.module_name}</p>
                                <p className="text-xs text-muted-foreground mt-1">{rec.justification}</p>
                              </div>
                              <Badge variant={rec.priority === 'urgent' ? 'destructive' : 'outline'}>
                                {rec.priority}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Development Priorities</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {skillGapResults.analysis.development_priorities.map((priority, idx) => (
                            <li key={idx} className="text-sm flex items-start gap-2">
                              <span className="text-teal-600 font-bold">{idx + 1}.</span>
                              {priority}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-4 p-3 bg-slate-50 rounded">
                          <p className="text-xs text-slate-600">
                            <strong>Timeline:</strong> {skillGapResults.analysis.suggested_timeline}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Training Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {trainingRequests.map(request => (
                  <div key={request.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{request.requested_module_name}</h4>
                          <Badge variant={
                            request.request_status === 'approved' ? 'default' :
                            request.request_status === 'rejected' ? 'destructive' :
                            request.request_status === 'assigned' ? 'secondary' : 'outline'
                          }>
                            {request.request_status}
                          </Badge>
                          <Badge variant={request.priority === 'urgent' ? 'destructive' : 'outline'}>
                            {request.priority}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">
                          <p>By: {request.practitioner_name} • {request.training_category}</p>
                          <p>Date: {new Date(request.requested_date).toLocaleDateString()}</p>
                        </div>
                        <p className="text-sm">{request.justification}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {trainingRequests.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No training requests</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}