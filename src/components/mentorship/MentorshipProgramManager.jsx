import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Plus, Check, Calendar, MessageSquare } from 'lucide-react';
import MentorshipSessionForm from './MentorshipSessionForm';

export default function MentorshipProgramManager() {
  const [showNewAssignment, setShowNewAssignment] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState('');
  const [selectedMentee, setSelectedMentee] = useState('');
  const [focusArea, setFocusArea] = useState('');

  const queryClient = useQueryClient();

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['mentorshipAssignments'],
    queryFn: () => base44.entities.MentorshipAssignment.list('-start_date', 50)
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['mentorshipSessions'],
    queryFn: () => base44.entities.MentorshipSession.list('-session_date', 100)
  });

  const { data: practitioners = [] } = useQuery({
    queryKey: ['practitioners'],
    queryFn: () => base44.entities.Practitioner.list()
  });

  const { data: skillMatrix } = useQuery({
    queryKey: ['skillMatrix'],
    enabled: showNewAssignment,
    queryFn: async () => {
      const result = await base44.functions.invoke('generatePractitionerSkillMatrix', {});
      return result.data;
    }
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async () => {
      const mentor = practitioners.find(p => p.id === selectedMentor);
      const mentee = practitioners.find(p => p.id === selectedMentee);

      if (!mentor || !mentee) throw new Error('Invalid practitioner selection');

      const assignment = await base44.entities.MentorshipAssignment.create({
        mentor_id: selectedMentor,
        mentor_name: mentor.full_name,
        mentee_id: selectedMentee,
        mentee_name: mentee.full_name,
        focus_area: focusArea,
        start_date: new Date().toISOString().split('T')[0],
        assigned_by: (await base44.auth.me()).email,
        assignment_date: new Date().toISOString(),
        status: 'active'
      });

      // Audit log
      await base44.entities.AuditLog.create({
        event_type: 'mentorship_assignment_created',
        entity_type: 'MentorshipAssignment',
        entity_id: assignment.id,
        document_name: `Mentorship: ${mentee.full_name} - ${mentor.full_name}`,
        extracted_data: JSON.stringify({ focus_area: focusArea }),
        validated_by: (await base44.auth.me()).email,
        validation_status: 'approved',
        notes: `Mentorship assignment created for focus area: ${focusArea}`
      });

      return assignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentorshipAssignments'] });
      setShowNewAssignment(false);
      setSelectedMentor('');
      setSelectedMentee('');
      setFocusArea('');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ assignmentId, status }) => {
      return base44.entities.MentorshipAssignment.update(assignmentId, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentorshipAssignments'] });
    }
  });

  const statusColors = {
    active: 'bg-blue-100 text-blue-800',
    planned: 'bg-gray-100 text-gray-800',
    completed: 'bg-green-100 text-green-800',
    paused: 'bg-yellow-100 text-yellow-800'
  };

  const activeAssignments = assignments.filter(a => a.status === 'active');
  const completedAssignments = assignments.filter(a => a.status === 'completed');

  if (assignmentsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading mentorship data...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Active ({activeAssignments.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedAssignments.length})</TabsTrigger>
          <TabsTrigger value="new">New Assignment</TabsTrigger>
        </TabsList>

        {/* Active Assignments */}
        <TabsContent value="active" className="space-y-3 mt-4">
          {activeAssignments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-slate-500 text-sm">No active mentorship assignments</p>
              </CardContent>
            </Card>
          ) : (
            activeAssignments.map(assignment => {
              const assignmentSessions = sessions.filter(s => s.mentorship_assignment_id === assignment.id);
              return (
                <Card key={assignment.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{assignment.mentee_name}</CardTitle>
                          <Badge className="text-xs">← {assignment.mentor_name}</Badge>
                        </div>
                        <CardDescription className="text-xs mt-1">Focus: {assignment.focus_area}</CardDescription>
                      </div>
                      <Badge className={`text-xs ${statusColors[assignment.status]}`}>
                        {assignment.status}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0">
                    {/* Session Summary */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-slate-50 p-2 rounded">
                        <p className="text-slate-600">Sessions</p>
                        <p className="font-semibold">{assignmentSessions.length}</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded">
                        <p className="text-slate-600">Started</p>
                        <p className="font-semibold text-xs">{assignment.start_date}</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded">
                        <p className="text-slate-600">Last Session</p>
                        <p className="font-semibold text-xs">{assignment.last_session_date || '-'}</p>
                      </div>
                    </div>

                    {/* Recent Feedback Snippet */}
                    {assignmentSessions.length > 0 && (
                      <div className="border-t pt-3">
                        <p className="text-xs font-semibold text-slate-900 mb-2">Latest Session Notes</p>
                        <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded">
                          {assignmentSessions[0].mentor_feedback?.substring(0, 100)}...
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedAssignment(assignment);
                          setShowSessionForm(true);
                        }}
                        className="text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Log Session
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateStatusMutation.mutate({ assignmentId: assignment.id, status: 'completed' })}
                        className="text-xs"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Mark Complete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Completed Assignments */}
        <TabsContent value="completed" className="space-y-3 mt-4">
          {completedAssignments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-slate-500 text-sm">No completed assignments yet</p>
              </CardContent>
            </Card>
          ) : (
            completedAssignments.map(assignment => (
              <Card key={assignment.id} className="opacity-75">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base text-slate-600">{assignment.mentee_name}</CardTitle>
                        <Badge variant="outline" className="text-xs">← {assignment.mentor_name}</Badge>
                      </div>
                      <CardDescription className="text-xs mt-1">Focus: {assignment.focus_area}</CardDescription>
                    </div>
                    <Badge className="bg-green-100 text-green-800 text-xs">Completed</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-slate-600 mb-2">Sessions: {sessions.filter(s => s.mentorship_assignment_id === assignment.id).length}</p>
                  {assignment.completion_notes && (
                    <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded">{assignment.completion_notes}</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* New Assignment Form */}
        <TabsContent value="new" className="mt-4">
          {!showNewAssignment ? (
            <Button onClick={() => setShowNewAssignment(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Create Mentorship Assignment
            </Button>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">New Mentorship Assignment</CardTitle>
                <CardDescription>Assign a mentor to support a practitioner's development</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {skillMatrix?.skill_matrix?.peer_mentor_pairings && skillMatrix.skill_matrix.peer_mentor_pairings.length > 0 && (
                  <Alert className="border-blue-200 bg-blue-50">
                    <AlertDescription className="text-xs text-blue-800">
                      <p className="font-semibold mb-2">AI-Suggested Pairings Available</p>
                      {skillMatrix.skill_matrix.peer_mentor_pairings.slice(0, 3).map((pairing, idx) => (
                        <div key={idx} className="text-xs mb-1">
                          {pairing.mentor_name} → {pairing.mentee_name} ({pairing.focus_area})
                        </div>
                      ))}
                    </AlertDescription>
                  </Alert>
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-900 block mb-2">Mentor</label>
                  <select
                    value={selectedMentor}
                    onChange={(e) => setSelectedMentor(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    <option value="">Select mentor...</option>
                    {practitioners.map(p => (
                      <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-900 block mb-2">Mentee</label>
                  <select
                    value={selectedMentee}
                    onChange={(e) => setSelectedMentee(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    <option value="">Select mentee...</option>
                    {practitioners.map(p => (
                      <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-900 block mb-2">Focus Area</label>
                  <input
                    type="text"
                    placeholder="e.g., NDIS Compliance, Behaviour Support, Clinical Skills"
                    value={focusArea}
                    onChange={(e) => setFocusArea(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => createAssignmentMutation.mutate()}
                    disabled={!selectedMentor || !selectedMentee || !focusArea}
                    className="flex-1"
                  >
                    Create Assignment
                  </Button>
                  <Button
                    onClick={() => setShowNewAssignment(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Session Form Modal */}
      {showSessionForm && selectedAssignment && (
        <MentorshipSessionForm
          assignment={selectedAssignment}
          onClose={() => {
            setShowSessionForm(false);
            setSelectedAssignment(null);
            queryClient.invalidateQueries({ queryKey: ['mentorshipSessions', 'mentorshipAssignments'] });
          }}
        />
      )}
    </div>
  );
}