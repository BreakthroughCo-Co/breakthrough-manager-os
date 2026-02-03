import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import SessionSupportPanel from '@/components/session/SessionSupportPanel';
import InterventionSuggester from '@/components/session/InterventionSuggester';
import QuickReferenceGuide from '@/components/session/QuickReferenceGuide';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Clock, Plus } from 'lucide-react';

export default function SessionSupport() {
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Fetch active clients
  const { data: clients } = useQuery({
    queryKey: ['clients_active'],
    queryFn: async () => {
      const data = await base44.entities.Client.list();
      return data?.filter(c => c.status === 'active') || [];
    }
  });

  // Fetch active session for selected client
  const { data: activeSessions, refetch } = useQuery({
    queryKey: ['activeSessions', selectedClientId],
    enabled: !!selectedClientId,
    queryFn: async () => {
      const sessions = await base44.entities.SessionContext.filter({ 
        client_id: selectedClientId,
        current_status: 'in_progress'
      });
      return sessions || [];
    }
  });

  const activeSession = activeSessions?.[0];

  // Create or start session
  const handleStartSession = async () => {
    if (!selectedClientId) return;

    setIsCreatingSession(true);
    try {
      const newSession = await base44.entities.SessionContext.create({
        client_id: selectedClientId,
        client_name: clients?.find(c => c.id === selectedClientId)?.full_name,
        practitioner_id: (await base44.auth.me()).id,
        practitioner_name: (await base44.auth.me()).full_name,
        session_date: new Date().toISOString().split('T')[0],
        session_start_time: new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
        session_type: 'direct_support',
        current_status: 'in_progress'
      });

      setSessionId(newSession.id);
      refetch();
    } catch (err) {
      alert('Error creating session: ' + err.message);
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleEndSession = async () => {
    if (!sessionId) return;

    try {
      await base44.entities.SessionContext.update(sessionId, {
        current_status: 'completed',
        session_end_time: new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
      });

      // Draft session notes
      const result = await base44.functions.invoke('draftSessionNotes', {
        session_id: sessionId
      });

      setSessionId(null);
      refetch();
      alert('Session ended. Notes have been drafted for your review.');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">In-Session Support</h1>
        <p className="text-slate-600 mt-2">Real-time AI guidance during client sessions</p>
      </div>

      {/* Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700">
          This tool provides real-time support aligned with the client's support plan during sessions. Use it to get guidance, intervention suggestions, and reference materials without interrupting your session.
        </AlertDescription>
      </Alert>

      {/* Session Selection & Start */}
      <Card>
        <CardHeader>
          <CardTitle>Start or Resume Session</CardTitle>
          <CardDescription>Select a client to begin session support</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client Selection */}
            <div className="space-y-2">
              <label className="text-sm font-semibold">Select Client</label>
              <Select value={selectedClientId || ''} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Session Status */}
            {selectedClientId && (
              <div className="space-y-2">
                <label className="text-sm font-semibold">Session Status</label>
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-md">
                  {activeSession ? (
                    <>
                      <Clock className="h-4 w-4 text-green-600" />
                      <span className="text-sm">
                        <strong>Session In Progress</strong> since {activeSession.session_start_time}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-slate-600">No active session</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {!activeSession && selectedClientId && (
              <Button
                onClick={handleStartSession}
                disabled={isCreatingSession}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                {isCreatingSession ? 'Starting...' : 'Start Session'}
              </Button>
            )}

            {activeSession && (
              <Button
                onClick={handleEndSession}
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                End Session
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Session Tools */}
      {activeSession && (
        <Tabs defaultValue="support" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="support">Real-Time Support</TabsTrigger>
            <TabsTrigger value="interventions">Interventions</TabsTrigger>
            <TabsTrigger value="reference">Quick Reference</TabsTrigger>
          </TabsList>

          <TabsContent value="support" className="space-y-4 mt-4">
            <SessionSupportPanel 
              sessionId={activeSession.id}
              clientId={selectedClientId}
            />
          </TabsContent>

          <TabsContent value="interventions" className="space-y-4 mt-4">
            <InterventionSuggester
              sessionId={activeSession.id}
              clientId={selectedClientId}
            />
          </TabsContent>

          <TabsContent value="reference" className="space-y-4 mt-4">
            <QuickReferenceGuide clientId={selectedClientId} />
          </TabsContent>
        </Tabs>
      )}

      {/* Empty State */}
      {!activeSession && selectedClientId && (
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-slate-500">
            <span>Start a session to access real-time support tools</span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}