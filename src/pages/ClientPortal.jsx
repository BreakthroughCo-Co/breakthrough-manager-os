import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, FileText, MessageSquare, TrendingUp, User, Shield } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function ClientPortal() {
  const [user, setUser] = useState(null);
  const [clientAccess, setClientAccess] = useState(null);
  const [client, setClient] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      
      // Check portal access
      const access = await base44.entities.ClientPortalAccess.filter({ access_email: userData.email });
      if (access.length > 0) {
        setClientAccess(access[0]);
        const clientData = await base44.entities.Client.filter({ id: access[0].client_id });
        if (clientData.length > 0) setClient(clientData[0]);
      }
    };
    loadUser();
  }, []);

  const { data: caseNotes = [] } = useQuery({
    queryKey: ['caseNotes', client?.id],
    queryFn: () => base44.entities.CaseNote.filter({ 
      client_id: client.id,
      visibility: 'shared'
    }),
    enabled: !!client && clientAccess?.can_view_progress_notes,
  });

  const { data: ndisPlans = [] } = useQuery({
    queryKey: ['ndisPlans', client?.id],
    queryFn: () => base44.entities.NDISPlan.filter({ client_id: client.id }),
    enabled: !!client,
  });

  const { data: serviceAgreements = [] } = useQuery({
    queryKey: ['serviceAgreements', client?.id],
    queryFn: () => base44.entities.ServiceAgreement.filter({ 
      client_id: client.id,
      status: 'active'
    }),
    enabled: !!client,
  });

  if (!clientAccess || clientAccess.status !== 'active') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Access Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                Portal access has not been granted for your account. Please contact your practitioner for access.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Welcome, {client?.full_name?.split(' ')[0]}</h1>
          <p className="text-muted-foreground">Your NDIS Service Portal</p>
        </div>
        <Button asChild>
          <a href="#messages">
            <MessageSquare className="w-4 h-4 mr-2" />
            Messages
          </a>
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Plan Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-green-100 text-green-800">Active</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Plan End Date</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{client?.plan_end_date}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Service Type</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{client?.service_type}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="progress">Progress Notes</TabsTrigger>
          <TabsTrigger value="plan">My Plan</TabsTrigger>
          <TabsTrigger value="ai-assistant">AI Assistant</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <AppointmentSection clientId={client?.id} clientAccess={clientAccess} />
        </TabsContent>

        <TabsContent value="overview-rest" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Support Team</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                  <User className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <p className="font-medium">{client?.assigned_practitioner_name || 'Support Team'}</p>
                  <p className="text-sm text-muted-foreground">Your Behaviour Support Practitioner</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {serviceAgreements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Active Service Agreement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Service Type:</span>
                    <span className="text-sm font-medium">{serviceAgreements[0].service_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Frequency:</span>
                    <span className="text-sm font-medium">{serviceAgreements[0].frequency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Agreement End:</span>
                    <span className="text-sm font-medium">{serviceAgreements[0].end_date}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          {clientAccess.can_view_progress_notes ? (
            caseNotes.length > 0 ? (
              caseNotes.map(note => (
                <Card key={note.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base">Session: {note.session_date}</CardTitle>
                      <Badge variant="outline">{note.session_type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{note.summary || note.notes}</p>
                    {note.progress_rating && (
                      <div className="mt-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-muted-foreground">Progress: {note.progress_rating}/10</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Alert>
                <FileText className="w-4 h-4" />
                <AlertDescription>No progress notes available yet.</AlertDescription>
              </Alert>
            )
          ) : (
            <Alert>
              <Shield className="w-4 h-4" />
              <AlertDescription>You do not have permission to view progress notes.</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="plan" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>NDIS Plan Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Plan Start</p>
                  <p className="font-medium">{client?.plan_start_date}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Plan End</p>
                  <p className="font-medium">{client?.plan_end_date}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Allocated Funding</p>
                  <p className="font-medium">${client?.funding_allocated?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Utilised</p>
                  <p className="font-medium">${client?.funding_utilised?.toLocaleString()}</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-teal-600 h-2 rounded-full" 
                  style={{ width: `${(client?.funding_utilised / client?.funding_allocated) * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-assistant">
          <ClientAIAssistant client={client} />
        </TabsContent>
      </Tabs>

      <SessionFeedback clientId={client?.id} />
    </div>
  );
}

function AppointmentSection({ clientId, clientAccess }) {
  const [showRequest, setShowRequest] = useState(false);
  const [requestData, setRequestData] = useState({
    appointment_date: '',
    appointment_time: '',
    session_type: 'Direct Support',
    notes: '',
  });
  const queryClient = useQueryClient();

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments', clientId],
    queryFn: () => base44.entities.Appointment.filter({ 
      client_id: clientId,
      status: { $in: ['requested', 'confirmed'] }
    }),
    enabled: !!clientId,
  });

  const requestMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.Appointment.create({
        ...requestData,
        client_id: clientId,
        status: 'requested',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['appointments']);
      setShowRequest(false);
      setRequestData({ appointment_date: '', appointment_time: '', session_type: 'Direct Support', notes: '' });
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Upcoming Appointments</CardTitle>
          <Button size="sm" onClick={() => setShowRequest(!showRequest)}>
            <Calendar className="w-4 h-4 mr-2" />
            Request Appointment
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showRequest && (
          <div className="border rounded-lg p-4 space-y-3 bg-slate-50">
            <h3 className="font-medium">Request New Appointment</h3>
            <div className="grid grid-cols-2 gap-3">
              <Input 
                type="date" 
                value={requestData.appointment_date}
                onChange={(e) => setRequestData({...requestData, appointment_date: e.target.value})}
              />
              <Input 
                type="time" 
                value={requestData.appointment_time}
                onChange={(e) => setRequestData({...requestData, appointment_time: e.target.value})}
              />
            </div>
            <select 
              value={requestData.session_type}
              onChange={(e) => setRequestData({...requestData, session_type: e.target.value})}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="Direct Support">Direct Support</option>
              <option value="Assessment">Assessment</option>
              <option value="Review">Review</option>
              <option value="Consultation">Consultation</option>
            </select>
            <textarea 
              placeholder="Additional notes or preferences..."
              value={requestData.notes}
              onChange={(e) => setRequestData({...requestData, notes: e.target.value})}
              className="w-full border rounded-md px-3 py-2"
              rows={2}
            />
            <Button onClick={() => requestMutation.mutate()}>Submit Request</Button>
          </div>
        )}

        {appointments.length > 0 ? (
          appointments.map(apt => (
            <div key={apt.id} className="border rounded-lg p-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{apt.session_type}</p>
                  <p className="text-sm text-muted-foreground">
                    {apt.appointment_date} at {apt.appointment_time}
                  </p>
                  <Badge className="mt-2">{apt.status}</Badge>
                </div>
                <Badge variant="outline">{apt.location || 'Office'}</Badge>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No upcoming appointments scheduled</p>
        )}
      </CardContent>
    </Card>
  );
}

function SessionFeedback({ clientId }) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState({
    session_rating: 5,
    feedback_text: '',
  });
  const queryClient = useQueryClient();

  const submitFeedback = useMutation({
    mutationFn: async () => {
      return base44.entities.ClientFeedback.create({
        ...feedbackData,
        client_id: clientId,
        feedback_date: new Date().toISOString().split('T')[0],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['feedback']);
      setShowFeedback(false);
      setFeedbackData({ session_rating: 5, feedback_text: '' });
    },
  });

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">Session Feedback</CardTitle>
      </CardHeader>
      <CardContent>
        {!showFeedback ? (
          <Button onClick={() => setShowFeedback(true)}>Provide Session Feedback</Button>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Rate Your Last Session (1-10)</label>
              <Input 
                type="number" 
                min="1" 
                max="10"
                value={feedbackData.session_rating}
                onChange={(e) => setFeedbackData({...feedbackData, session_rating: parseInt(e.target.value)})}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Additional Comments</label>
              <textarea 
                value={feedbackData.feedback_text}
                onChange={(e) => setFeedbackData({...feedbackData, feedback_text: e.target.value})}
                className="w-full border rounded-md px-3 py-2"
                rows={3}
                placeholder="Tell us about your experience..."
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => submitFeedback.mutate()}>Submit Feedback</Button>
              <Button variant="outline" onClick={() => setShowFeedback(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ClientAIAssistant({ client }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a helpful NDIS support assistant. Answer questions about NDIS services, plans, and support options.
        
Client context: ${JSON.stringify({ service_type: client?.service_type })}

Question: ${input}

Provide a clear, supportive answer. Focus on NDIS rules, available services, and how they can access support.`,
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Support Assistant</CardTitle>
        <p className="text-sm text-muted-foreground">Ask questions about your NDIS plan and services</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === 'user' ? 'bg-teal-600 text-white' : 'bg-gray-100'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && <div className="text-sm text-muted-foreground">Thinking...</div>}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask a question..."
            className="flex-1 px-3 py-2 border rounded-lg"
          />
          <Button onClick={sendMessage} disabled={loading}>Send</Button>
        </div>
      </CardContent>
    </Card>
  );
}