import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { Archive, Calendar } from 'lucide-react';

export default function SessionLogs() {
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [dateFrom, setDateFrom] = useState('');

  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const data = await base44.entities.Client.list();
      return data?.filter(c => c.status === 'active') || [];
    }
  });

  // Fetch sessions
  const { data: sessions } = useQuery({
    queryKey: ['sessions', selectedClientId, dateFrom],
    enabled: !!selectedClientId,
    queryFn: async () => {
      const data = await base44.entities.SessionContext.filter({ 
        client_id: selectedClientId,
        current_status: 'completed'
      });
      return data?.sort((a, b) => new Date(b.session_date) - new Date(a.session_date)) || [];
    }
  });

  // Fetch support logs for selected session
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const { data: supportLogs } = useQuery({
    queryKey: ['supportLogs', selectedSessionId],
    enabled: !!selectedSessionId,
    queryFn: async () => {
      const data = await base44.entities.SessionSupportLog.filter({ 
        session_id: selectedSessionId
      });
      return data || [];
    }
  });

  // Fetch session notes
  const { data: sessionNotes } = useQuery({
    queryKey: ['sessionNotes', selectedSessionId],
    enabled: !!selectedSessionId,
    queryFn: async () => {
      const data = await base44.entities.SessionNote.filter({ 
        session_id: selectedSessionId
      });
      return data || [];
    }
  });

  const selectedSession = sessions?.find(s => s.id === selectedSessionId);
  const sessionNote = sessionNotes?.[0];

  const requestTypeColors = {
    guidance: 'bg-blue-100 text-blue-800',
    intervention_suggestion: 'bg-purple-100 text-purple-800',
    risk_assessment: 'bg-red-100 text-red-800',
    plan_alignment_check: 'bg-green-100 text-green-800',
    quick_reference: 'bg-gray-100 text-gray-800',
    note_drafting: 'bg-amber-100 text-amber-800'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Session Logs</h1>
        <p className="text-slate-600 mt-2">Review completed sessions and AI support requests</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Sessions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Client</label>
            <Select value={selectedClientId || ''} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select client..." />
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

          <div className="space-y-2">
            <label className="text-sm font-semibold">From Date</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {selectedClientId && (
        <Tabs defaultValue="sessions" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="details" disabled={!selectedSessionId}>Details</TabsTrigger>
          </TabsList>

          {/* Sessions List */}
          <TabsContent value="sessions" className="space-y-3 mt-4">
            {sessions && sessions.length > 0 ? (
              <div className="space-y-2">
                {sessions.map(session => (
                  <Card
                    key={session.id}
                    className={`cursor-pointer transition-all ${
                      selectedSessionId === session.id ? 'border-blue-500 bg-blue-50' : 'hover:border-slate-400'
                    }`}
                    onClick={() => setSelectedSessionId(session.id)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="h-4 w-4 text-slate-600" />
                            <span className="font-semibold text-slate-900">
                              {format(new Date(session.session_date), 'EEEE, MMMM d, yyyy')}
                            </span>
                            <span className="text-sm text-slate-600">
                              {session.session_start_time} - {session.session_end_time}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{session.session_type.replace(/_/g, ' ')}</Badge>
                            {session.location && <span className="text-xs text-slate-600">{session.location}</span>}
                          </div>

                          {session.observed_behaviors && (
                            <p className="text-xs text-slate-600 mt-2">{session.observed_behaviors.substring(0, 100)}...</p>
                          )}
                        </div>

                        <div className="text-right text-xs">
                          <div className="text-slate-600 mb-1">Support requests: {session.support_requests_made || 0}</div>
                          <Badge variant="secondary">{session.current_status}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-8 text-slate-500">
                  <Archive className="h-5 w-5 mr-2" />
                  No completed sessions found
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Session Details */}
          {selectedSessionId && (
            <TabsContent value="details" className="space-y-4 mt-4">
              {/* Session Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Session Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedSession && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-600 font-semibold">Date & Time</span>
                        <p>{format(new Date(selectedSession.session_date), 'PPP')} {selectedSession.session_start_time}</p>
                      </div>
                      <div>
                        <span className="text-slate-600 font-semibold">Duration</span>
                        <p>{selectedSession.session_start_time} - {selectedSession.session_end_time}</p>
                      </div>
                      <div>
                        <span className="text-slate-600 font-semibold">Type</span>
                        <p className="capitalize">{selectedSession.session_type.replace(/_/g, ' ')}</p>
                      </div>
                      <div>
                        <span className="text-slate-600 font-semibold">Client Engagement</span>
                        <p>{selectedSession.client_engagement_level || 'Not recorded'}%</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Support Requests */}
              {supportLogs && supportLogs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">AI Support Requests ({supportLogs.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {supportLogs.map(log => (
                      <div key={log.id} className="border rounded p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge className={requestTypeColors[log.request_type]}>
                            {log.request_type.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-xs text-slate-600">
                            {format(new Date(log.request_timestamp), 'HH:mm:ss')}
                          </span>
                        </div>

                        {log.request_context && (
                          <div>
                            <p className="text-xs text-slate-600 font-semibold">Context</p>
                            <p className="text-sm text-slate-700">{log.request_context}</p>
                          </div>
                        )}

                        {log.practitioner_action && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-600 font-semibold">Practitioner Action:</span>
                            <Badge variant="outline" className="capitalize">{log.practitioner_action}</Badge>
                            {log.effectiveness_rating && (
                              <span className="ml-auto">⭐ {log.effectiveness_rating}/5</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Session Notes */}
              {sessionNote && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Session Notes</CardTitle>
                    <CardDescription className="capitalize">{sessionNote.status.replace(/_/g, ' ')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {sessionNote.session_summary && (
                      <div>
                        <p className="font-semibold text-slate-900 mb-1">Summary</p>
                        <p className="text-slate-700">{sessionNote.session_summary}</p>
                      </div>
                    )}
                    {sessionNote.observations && (
                      <div>
                        <p className="font-semibold text-slate-900 mb-1">Observations</p>
                        <p className="text-slate-700">{sessionNote.observations}</p>
                      </div>
                    )}
                    {sessionNote.interventions_used && (
                      <div>
                        <p className="font-semibold text-slate-900 mb-1">Interventions</p>
                        <p className="text-slate-700">{sessionNote.interventions_used}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}