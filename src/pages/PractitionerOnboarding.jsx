import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, Upload, User, FileCheck, Key, AlertCircle } from 'lucide-react';

export default function PractitionerOnboarding() {
  const [showNewOnboarding, setShowNewOnboarding] = useState(false);
  const [newPractitioner, setNewPractitioner] = useState({
    practitioner_email: '',
    practitioner_name: '',
    start_date: '',
  });
  const queryClient = useQueryClient();

  const { data: onboardings = [] } = useQuery({
    queryKey: ['onboardings'],
    queryFn: () => base44.entities.PractitionerOnboarding.list('-created_date'),
  });

  const createOnboarding = useMutation({
    mutationFn: (data) => base44.entities.PractitionerOnboarding.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['onboardings']);
      setShowNewOnboarding(false);
      setNewPractitioner({ practitioner_email: '', practitioner_name: '', start_date: '' });
    },
  });

  const verifyDocuments = useMutation({
    mutationFn: async ({ onboardingId, documents }) => {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a document verification assistant for NDIS practitioner onboarding.
        
Verify the following practitioner documents and check for:
- Valid qualifications (degree, certifications)
- Current NDIS worker screening
- Professional registration numbers
- Insurance documents
- Right to work verification

Documents submitted: ${JSON.stringify(documents)}

Return JSON with:
{
  "status": "verified" | "failed",
  "qualifications_valid": boolean,
  "screening_current": boolean,
  "registration_verified": boolean,
  "issues": array of any problems found,
  "next_steps": array of required actions
}`,
        response_json_schema: {
          type: "object",
          properties: {
            status: { type: "string" },
            qualifications_valid: { type: "boolean" },
            screening_current: { type: "boolean" },
            registration_verified: { type: "boolean" },
            issues: { type: "array", items: { type: "string" } },
            next_steps: { type: "array", items: { type: "string" } }
          }
        }
      });

      await base44.entities.PractitionerOnboarding.update(onboardingId, {
        document_verification_status: response.status === 'verified' ? 'verified' : 'failed',
        verification_results: JSON.stringify(response),
        onboarding_stage: response.status === 'verified' ? 'training_assignment' : 'document_verification'
      });
    },
    onSuccess: () => queryClient.invalidateQueries(['onboardings']),
  });

  const assignTraining = useMutation({
    mutationFn: async (onboardingId) => {
      await base44.entities.PractitionerOnboarding.update(onboardingId, {
        training_modules_assigned: JSON.stringify(['NDIS Standards', 'Behaviour Support Basics', 'Documentation Requirements']),
        onboarding_stage: 'system_access',
      });
    },
    onSuccess: () => queryClient.invalidateQueries(['onboardings']),
  });

  const createSystemAccess = useMutation({
    mutationFn: async (onboarding) => {
      await base44.users.inviteUser(onboarding.practitioner_email, 'user');
      await base44.entities.PractitionerOnboarding.update(onboarding.id, {
        system_access_created: true,
        system_access_details: JSON.stringify({ access_level: 'practitioner', invited: true }),
        onboarding_stage: 'completed',
        onboarding_completion_date: new Date().toISOString().split('T')[0],
      });
    },
    onSuccess: () => queryClient.invalidateQueries(['onboardings']),
  });

  const getStageProgress = (stage) => {
    switch (stage) {
      case 'document_verification': return 25;
      case 'training_assignment': return 50;
      case 'system_access': return 75;
      case 'completed': return 100;
      default: return 0;
    }
  };

  const activeOnboardings = onboardings.filter(o => o.onboarding_stage !== 'completed');
  const completedOnboardings = onboardings.filter(o => o.onboarding_stage === 'completed');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Practitioner Onboarding</h1>
          <p className="text-muted-foreground">Automated onboarding workflow with AI verification</p>
        </div>
        <Button onClick={() => setShowNewOnboarding(true)}>
          <User className="w-4 h-4 mr-2" />
          Start New Onboarding
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeOnboardings.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {onboardings.filter(o => o.onboarding_stage === 'document_verification').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Training</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {onboardings.filter(o => o.onboarding_stage === 'training_assignment').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{completedOnboardings.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Active Onboardings</h2>
        {activeOnboardings.map(onboarding => {
          const progress = getStageProgress(onboarding.onboarding_stage);
          return (
            <Card key={onboarding.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">{onboarding.practitioner_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{onboarding.practitioner_email}</p>
                  </div>
                  <Badge>{onboarding.onboarding_stage.replace(/_/g, ' ')}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div className={`p-3 rounded-lg text-center ${onboarding.document_verification_status === 'verified' ? 'bg-green-50' : 'bg-gray-50'}`}>
                    <FileCheck className={`w-5 h-5 mx-auto mb-1 ${onboarding.document_verification_status === 'verified' ? 'text-green-600' : 'text-gray-400'}`} />
                    <p className="text-xs">Documents</p>
                  </div>
                  <div className={`p-3 rounded-lg text-center ${onboarding.training_modules_assigned ? 'bg-green-50' : 'bg-gray-50'}`}>
                    <CheckCircle className={`w-5 h-5 mx-auto mb-1 ${onboarding.training_modules_assigned ? 'text-green-600' : 'text-gray-400'}`} />
                    <p className="text-xs">Training</p>
                  </div>
                  <div className={`p-3 rounded-lg text-center ${onboarding.system_access_created ? 'bg-green-50' : 'bg-gray-50'}`}>
                    <Key className={`w-5 h-5 mx-auto mb-1 ${onboarding.system_access_created ? 'text-green-600' : 'text-gray-400'}`} />
                    <p className="text-xs">Access</p>
                  </div>
                  <div className={`p-3 rounded-lg text-center ${onboarding.onboarding_stage === 'completed' ? 'bg-green-50' : 'bg-gray-50'}`}>
                    <User className={`w-5 h-5 mx-auto mb-1 ${onboarding.onboarding_stage === 'completed' ? 'text-green-600' : 'text-gray-400'}`} />
                    <p className="text-xs">Complete</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  {onboarding.onboarding_stage === 'document_verification' && (
                    <Button size="sm" onClick={() => verifyDocuments.mutate({ onboardingId: onboarding.id, documents: [] })}>
                      <FileCheck className="w-4 h-4 mr-2" />
                      Verify Documents
                    </Button>
                  )}
                  {onboarding.onboarding_stage === 'training_assignment' && (
                    <Button size="sm" onClick={() => assignTraining.mutate(onboarding.id)}>
                      Assign Training
                    </Button>
                  )}
                  {onboarding.onboarding_stage === 'system_access' && (
                    <Button size="sm" onClick={() => createSystemAccess.mutate(onboarding)}>
                      <Key className="w-4 h-4 mr-2" />
                      Create Access
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={showNewOnboarding} onOpenChange={setShowNewOnboarding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start New Practitioner Onboarding</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Full Name</label>
              <Input
                value={newPractitioner.practitioner_name}
                onChange={(e) => setNewPractitioner({ ...newPractitioner, practitioner_name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={newPractitioner.practitioner_email}
                onChange={(e) => setNewPractitioner({ ...newPractitioner, practitioner_email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={newPractitioner.start_date}
                onChange={(e) => setNewPractitioner({ ...newPractitioner, start_date: e.target.value })}
              />
            </div>
            <Button onClick={() => createOnboarding.mutate(newPractitioner)} className="w-full">
              Create Onboarding
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}