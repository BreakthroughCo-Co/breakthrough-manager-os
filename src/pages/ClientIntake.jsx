import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, MessageSquare, CheckCircle, Clock, Loader2, Sparkles, User, Phone, Mail } from 'lucide-react';

function IntakeForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    participant_name: '',
    participant_age: '',
    ndis_number: '',
    support_needs: '',
    service_interest: 'Not Sure',
    current_supports: '',
    plan_managed: false,
  });
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);

    try {
      // AI Analysis
      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this NDIS client intake request and provide structured recommendations.

Contact: ${formData.contact_name}
Participant: ${formData.participant_name} (Age: ${formData.participant_age})
Support Needs: ${formData.support_needs}
Service Interest: ${formData.service_interest}
Current Supports: ${formData.current_supports}

Provide JSON analysis:
{
  "recommended_service": "Behaviour Support/LEGO Therapy/Combined",
  "urgency_level": "immediate/high/medium/low",
  "eligibility_assessment": "likely_eligible/needs_review/not_eligible",
  "key_concerns": ["concern1", "concern2"],
  "suggested_practitioner_type": "type",
  "next_steps": ["step1", "step2"],
  "risk_flags": ["flag1"] or []
}`,
        response_json_schema: {
          type: "object",
          properties: {
            recommended_service: { type: "string" },
            urgency_level: { type: "string" },
            eligibility_assessment: { type: "string" },
            key_concerns: { type: "array", items: { type: "string" } },
            suggested_practitioner_type: { type: "string" },
            next_steps: { type: "array", items: { type: "string" } },
            risk_flags: { type: "array", items: { type: "string" } }
          }
        }
      });

      // Create intake request
      const intake = await base44.entities.ClientIntakeRequest.create({
        ...formData,
        ai_analysis: JSON.stringify(analysis),
        urgency: analysis.urgency_level,
      });

      // Auto-assign to appropriate team member
      const practitioners = await base44.entities.Practitioner.list();
      const availablePractitioner = practitioners
        .filter(p => p.status === 'active' && p.current_caseload < p.caseload_capacity)
        .sort((a, b) => a.current_caseload - b.current_caseload)[0];

      // Create intake task
      const task = await base44.entities.Task.create({
        title: `Client Intake: ${formData.participant_name || formData.contact_name}`,
        description: `New intake request requiring review.\n\nAI Analysis:\n- Recommended Service: ${analysis.recommended_service}\n- Urgency: ${analysis.urgency_level}\n- Key Concerns: ${analysis.key_concerns.join(', ')}\n\nNext Steps:\n${analysis.next_steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
        category: 'Clinical',
        priority: analysis.urgency_level === 'immediate' ? 'urgent' : analysis.urgency_level,
        assigned_to: availablePractitioner?.email || '',
        related_entity_type: 'ClientIntakeRequest',
        related_entity_id: intake.id,
      });

      // Update intake with task and assignment
      await base44.entities.ClientIntakeRequest.update(intake.id, {
        intake_task_id: task.id,
        assigned_to: availablePractitioner?.email || '',
      });

      // Send notification
      if (availablePractitioner) {
        await base44.entities.Notification.create({
          user_email: availablePractitioner.email,
          notification_type: 'task_assigned',
          title: 'New Client Intake Assigned',
          message: `You have been assigned a new client intake for ${formData.participant_name || formData.contact_name}. ${analysis.risk_flags.length > 0 ? '⚠️ Risk flags identified.' : ''}`,
          priority: analysis.urgency_level === 'immediate' ? 'critical' : 'medium',
          related_entity_type: 'Task',
          related_entity_id: task.id,
        });
      }

      onSuccess?.();
      setFormData({
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        participant_name: '',
        participant_age: '',
        ndis_number: '',
        support_needs: '',
        service_interest: 'Not Sure',
        current_supports: '',
        plan_managed: false,
      });
    } catch (error) {
      console.error('Intake processing error:', error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Contact Name *</Label>
          <Input required value={formData.contact_name} onChange={(e) => setFormData({...formData, contact_name: e.target.value})} />
        </div>
        <div>
          <Label>Contact Email *</Label>
          <Input type="email" required value={formData.contact_email} onChange={(e) => setFormData({...formData, contact_email: e.target.value})} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Contact Phone</Label>
          <Input value={formData.contact_phone} onChange={(e) => setFormData({...formData, contact_phone: e.target.value})} />
        </div>
        <div>
          <Label>Participant Name</Label>
          <Input value={formData.participant_name} onChange={(e) => setFormData({...formData, participant_name: e.target.value})} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Participant Age</Label>
          <Input type="number" value={formData.participant_age} onChange={(e) => setFormData({...formData, participant_age: e.target.value})} />
        </div>
        <div>
          <Label>NDIS Number (if known)</Label>
          <Input value={formData.ndis_number} onChange={(e) => setFormData({...formData, ndis_number: e.target.value})} />
        </div>
      </div>

      <div>
        <Label>Support Needs *</Label>
        <Textarea 
          required
          placeholder="Please describe the support needs, behaviours of concern, or goals..."
          className="min-h-[120px]"
          value={formData.support_needs}
          onChange={(e) => setFormData({...formData, support_needs: e.target.value})}
        />
      </div>

      <div>
        <Label>Service Interest</Label>
        <Select value={formData.service_interest} onValueChange={(v) => setFormData({...formData, service_interest: v})}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Behaviour Support">Behaviour Support</SelectItem>
            <SelectItem value="LEGO Therapy">LEGO Therapy</SelectItem>
            <SelectItem value="Capacity Building">Capacity Building</SelectItem>
            <SelectItem value="Combined">Combined Services</SelectItem>
            <SelectItem value="Not Sure">Not Sure</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Current Supports</Label>
        <Textarea 
          placeholder="Any current support providers or services..."
          value={formData.current_supports}
          onChange={(e) => setFormData({...formData, current_supports: e.target.value})}
        />
      </div>

      <Button type="submit" disabled={processing} className="w-full bg-teal-600 hover:bg-teal-700">
        {processing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing with AI...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Submit Intake Request
          </>
        )}
      </Button>
    </form>
  );
}

export default function ClientIntake() {
  const [activeTab, setActiveTab] = useState('form');
  const queryClient = useQueryClient();

  const { data: intakeRequests = [] } = useQuery({
    queryKey: ['intake-requests'],
    queryFn: () => base44.entities.ClientIntakeRequest.list('-created_date'),
  });

  const convertToClient = useMutation({
    mutationFn: async (intakeId) => {
      const intake = intakeRequests.find(i => i.id === intakeId);
      const analysis = intake.ai_analysis ? JSON.parse(intake.ai_analysis) : {};
      
      const client = await base44.entities.Client.create({
        full_name: intake.participant_name || intake.contact_name,
        ndis_number: intake.ndis_number || '',
        primary_contact_name: intake.contact_name,
        primary_contact_email: intake.contact_email,
        primary_contact_phone: intake.contact_phone,
        service_type: analysis.recommended_service || intake.service_interest,
        status: 'waitlist',
      });

      await base44.entities.ClientIntakeRequest.update(intakeId, {
        status: 'converted',
        client_id: client.id,
      });

      return client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['intake-requests']);
      queryClient.invalidateQueries(['clients']);
    },
  });

  const pendingRequests = intakeRequests.filter(r => r.status === 'pending');
  const reviewedRequests = intakeRequests.filter(r => r.status === 'reviewed');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Client Intake</h1>
        <p className="text-muted-foreground">AI-powered intake processing and conversion</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingRequests.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Reviewed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{reviewedRequests.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Converted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{intakeRequests.filter(r => r.status === 'converted').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{intakeRequests.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="form">New Intake</TabsTrigger>
          <TabsTrigger value="requests">Intake Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="form" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Intake Form</CardTitle>
              <CardDescription>AI will analyze submissions and auto-assign to appropriate team members</CardDescription>
            </CardHeader>
            <CardContent>
              <IntakeForm onSuccess={() => {
                setActiveTab('requests');
                queryClient.invalidateQueries(['intake-requests']);
              }} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          {intakeRequests.map(request => {
            const analysis = request.ai_analysis ? JSON.parse(request.ai_analysis) : null;
            return (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{request.participant_name || request.contact_name}</CardTitle>
                      <CardDescription>{request.contact_email} • {request.contact_phone}</CardDescription>
                    </div>
                    <Badge variant={request.status === 'pending' ? 'default' : 'secondary'}>
                      {request.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-1">Support Needs:</p>
                    <p className="text-sm text-muted-foreground">{request.support_needs}</p>
                  </div>

                  {analysis && (
                    <div className="bg-purple-50 p-4 rounded-lg space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <p className="text-sm font-semibold text-purple-900">AI Analysis</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="font-medium">Recommended Service</p>
                          <p className="text-muted-foreground">{analysis.recommended_service}</p>
                        </div>
                        <div>
                          <p className="font-medium">Urgency</p>
                          <Badge variant={analysis.urgency_level === 'immediate' ? 'destructive' : 'secondary'}>
                            {analysis.urgency_level}
                          </Badge>
                        </div>
                      </div>
                      {analysis.key_concerns?.length > 0 && (
                        <div>
                          <p className="font-medium text-sm">Key Concerns:</p>
                          <ul className="text-sm text-muted-foreground list-disc list-inside">
                            {analysis.key_concerns.map((c, i) => <li key={i}>{c}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => convertToClient.mutate(request.id)}
                      disabled={request.status === 'converted'}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Convert to Client
                    </Button>
                    {request.assigned_to && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Assigned: {request.assigned_to}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}