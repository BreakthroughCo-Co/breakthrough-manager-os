import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, TrendingUp, Target } from 'lucide-react';

export default function ClientJourneyMap({ clientId }) {
  const [journeyData, setJourneyData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadJourneyData = async () => {
      try {
        const [client, caseNotes, goals, incidents, communications] = await Promise.all([
          base44.entities.Client.filter({ id: clientId }).then(c => c[0]),
          base44.entities.CaseNote.filter({ client_id: clientId }, '-session_date', 50),
          base44.entities.ClientGoal.filter({ client_id: clientId }),
          base44.entities.Incident.filter({ client_id: clientId }, '-incident_date', 20),
          base44.entities.ClientCommunication.filter({ client_id: clientId }, '-sent_date', 20)
        ]);

        // Build journey timeline
        const timeline = [];

        // Add client enrollment
        if (client) {
          timeline.push({
            type: 'enrollment',
            date: client.created_date || client.plan_start_date,
            title: 'Client Enrolled',
            description: `Service type: ${client.service_type}, Risk level: ${client.risk_level}`,
            icon: '🎯'
          });
        }

        // Add goal milestones
        goals.forEach(goal => {
          if (goal.start_date) {
            timeline.push({
              type: 'goal',
              date: goal.start_date,
              title: `Goal Started: ${goal.goal_description?.substring(0, 40)}...`,
              progress: goal.current_progress,
              status: goal.status,
              ndis_domain: goal.ndis_domain,
              icon: '🎯'
            });
          }
          if (goal.status === 'achieved' && goal.end_date) {
            timeline.push({
              type: 'achievement',
              date: goal.end_date,
              title: `Goal Achieved: ${goal.goal_description?.substring(0, 40)}...`,
              icon: '✅'
            });
          }
        });

        // Add incidents
        incidents.forEach(inc => {
          timeline.push({
            type: 'incident',
            date: inc.incident_date,
            title: `Incident: ${inc.category || 'Unclassified'}`,
            severity: inc.severity,
            icon: '⚠️'
          });
        });

        // Add key communications
        communications.slice(0, 5).forEach(comm => {
          timeline.push({
            type: 'communication',
            date: comm.sent_date,
            title: comm.subject || 'Communication',
            type_label: comm.message_type,
            icon: '💬'
          });
        });

        // Add case notes (key progress markers)
        caseNotes.slice(0, 10).forEach((note, idx) => {
          if (idx % 3 === 0) { // Show every 3rd note
            timeline.push({
              type: 'session',
              date: note.session_date,
              title: `Session (${note.session_type})`,
              progress_rating: note.progress_rating,
              icon: '📝'
            });
          }
        });

        // Sort timeline by date
        timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Calculate journey metrics
        const journeyMonths = caseNotes.length > 0 ? Math.floor(caseNotes.length / 4) : 0;
        const goalsAchieved = goals.filter(g => g.status === 'achieved').length;
        const recentIncidents = incidents.filter(i => {
          const date = new Date(i.incident_date);
          const last30d = new Date();
          last30d.setDate(last30d.getDate() - 30);
          return date > last30d;
        }).length;

        setJourneyData({
          client,
          timeline,
          metrics: {
            months_in_service: journeyMonths,
            total_goals: goals.length,
            goals_achieved: goalsAchieved,
            recent_incidents_30d: recentIncidents,
            avg_progress: goals.length > 0 ? (goals.reduce((sum, g) => sum + (g.current_progress || 0), 0) / goals.length).toFixed(0) : 0
          }
        });
      } catch (error) {
        console.error('Failed to load journey data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadJourneyData();
  }, [clientId]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-teal-600 mr-2" />
          Loading journey map...
        </CardContent>
      </Card>
    );
  }

  if (!journeyData) {
    return <Card><CardContent className="pt-6">No journey data available</CardContent></Card>;
  }

  const { metrics, timeline, client } = journeyData;

  // Identify stagnation points (goals with low progress over time)
  const stagnationPoints = journeyData.timeline
    .filter(item => item.type === 'goal' && item.progress < 30)
    .map(item => item.title);

  return (
    <div className="space-y-4">
      {/* Journey Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Card>
          <CardContent className="pt-3">
            <p className="text-xs text-muted-foreground">Service Duration</p>
            <p className="text-2xl font-bold">{metrics.months_in_service}m</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3">
            <p className="text-xs text-muted-foreground">Goals Achieved</p>
            <p className="text-2xl font-bold text-emerald-600">{metrics.goals_achieved}/{metrics.total_goals}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3">
            <p className="text-xs text-muted-foreground">Avg Progress</p>
            <p className="text-2xl font-bold text-teal-600">{metrics.avg_progress}%</p>
          </CardContent>
        </Card>
        <Card className={metrics.recent_incidents_30d > 0 ? 'border-amber-200 bg-amber-50' : ''}>
          <CardContent className="pt-3">
            <p className="text-xs text-muted-foreground">Recent Incidents (30d)</p>
            <p className="text-2xl font-bold text-amber-600">{metrics.recent_incidents_30d}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3">
            <p className="text-xs text-muted-foreground">Risk Level</p>
            <Badge className={
              client.risk_level === 'high' ? 'bg-red-600' :
              client.risk_level === 'medium' ? 'bg-amber-600' :
              'bg-emerald-600'
            }>
              {client.risk_level}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Client Journey Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-teal-200 to-teal-100" />

            {/* Timeline items */}
            <div className="space-y-4 relative">
              {timeline.map((item, idx) => (
                <div key={idx} className="pl-20">
                  {/* Timeline dot */}
                  <div className="absolute left-2 top-2 w-12 h-12 rounded-full bg-white border-4 border-teal-500 flex items-center justify-center text-lg">
                    {item.icon}
                  </div>

                  {/* Content */}
                  <div className="p-3 border rounded bg-slate-50">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-semibold text-sm">{item.title}</h4>
                      {item.status && (
                        <Badge variant="outline" className="text-xs">
                          {item.status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {new Date(item.date).toLocaleDateString()}
                    </p>
                    {item.description && (
                      <p className="text-xs text-slate-700">{item.description}</p>
                    )}
                    {item.progress !== undefined && (
                      <div className="mt-2">
                        <div className="h-2 bg-slate-200 rounded overflow-hidden">
                          <div
                            className="h-full bg-teal-500"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{item.progress}% progress</p>
                      </div>
                    )}
                    {item.progress_rating && (
                      <p className="text-xs text-slate-600 mt-1">Progress: {item.progress_rating}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stagnation Points & Risk Areas */}
      {stagnationPoints.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Stagnation Points & Risk Areas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stagnationPoints.map((point, idx) => (
              <div key={idx} className="p-2 bg-white rounded border border-amber-200">
                <p className="text-sm text-amber-900">{point}</p>
                <p className="text-xs text-amber-700 mt-1">
                  ⚠️ Low progress detected. Consider intervention strategy review or service intensity adjustment.
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Proactive Intervention Suggestions */}
      {metrics.recent_incidents_30d > 1 || metrics.avg_progress < 40 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900">🎯 Proactive Intervention Suggestions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-red-800">
            {metrics.recent_incidents_30d > 1 && (
              <p>• Elevated incident rate detected. Review behavior support plan and consider intensity increase.</p>
            )}
            {metrics.avg_progress < 40 && (
              <p>• Goal progress is slower than expected. Schedule review session with practitioner and client.</p>
            )}
            <p>• Consider environmental modifications or alternative intervention approaches.</p>
            <p>• Increase communication frequency with client/guardian for engagement.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}