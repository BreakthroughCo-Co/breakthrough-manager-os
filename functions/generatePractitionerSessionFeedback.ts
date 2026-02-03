import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { practitioner_id, period_days = 30 } = await req.json();

    if (!practitioner_id) {
      return Response.json({ error: 'Missing practitioner_id' }, { status: 400 });
    }

    const practitioner = await base44.entities.Practitioner.filter({ id: practitioner_id });
    if (!practitioner?.[0]) {
      return Response.json({ error: 'Practitioner not found' }, { status: 404 });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - period_days);

    // Fetch session data
    const [sessions, sessionNotes, sessionLogs] = await Promise.all([
      base44.entities.SessionContext.list(),
      base44.entities.SessionNote.list(),
      base44.entities.SessionSupportLog.list()
    ]);

    const practitionerSessions = sessions?.filter(s => 
      s.practitioner_id === practitioner_id && 
      new Date(s.session_date) >= cutoffDate
    ) || [];

    const practitionerNotes = sessionNotes?.filter(n => 
      n.practitioner_id === practitioner_id && 
      new Date(n.session_date) >= cutoffDate
    ) || [];

    const practitionerLogs = sessionLogs?.filter(l => 
      l.practitioner_id === practitioner_id && 
      new Date(l.request_timestamp) >= cutoffDate
    ) || [];

    // Aggregate metrics
    const sessionMetrics = {
      total_sessions: practitionerSessions.length,
      avg_engagement: practitionerSessions.length > 0
        ? (practitionerSessions.reduce((sum, s) => sum + (s.client_engagement_level || 0), 0) / practitionerSessions.length).toFixed(1)
        : 0,
      sessions_with_incidents: practitionerSessions.filter(s => s.risk_incidents?.length > 0).length,
      intervention_effectiveness: practitionerSessions.map(s => s.intervention_effectiveness).filter(e => e).reduce((acc, val) => {
        acc[val] = (acc[val] || 0) + 1;
        return acc;
      }, {}),
      avg_support_requests: practitionerSessions.length > 0
        ? (practitionerSessions.reduce((sum, s) => sum + (s.support_requests_made || 0), 0) / practitionerSessions.length).toFixed(1)
        : 0
    };

    const noteQuality = {
      total_notes: practitionerNotes.length,
      comprehensive_notes: practitionerNotes.filter(n => 
        n.observations && n.interventions_used && n.progress_against_goals
      ).length,
      draft_notes: practitionerNotes.filter(n => n.status === 'draft').length,
      finalized_notes: practitionerNotes.filter(n => n.status === 'finalized').length
    };

    const aiSupportUsage = {
      total_requests: practitionerLogs.length,
      by_type: practitionerLogs.reduce((acc, log) => {
        acc[log.request_type] = (acc[log.request_type] || 0) + 1;
        return acc;
      }, {}),
      accepted_suggestions: practitionerLogs.filter(l => l.practitioner_action === 'accepted').length,
      adaptation_rate: practitionerLogs.length > 0
        ? ((practitionerLogs.filter(l => l.practitioner_action === 'adapted').length / practitionerLogs.length) * 100).toFixed(1)
        : 0,
      avg_usefulness: practitionerLogs.filter(l => l.effectiveness_rating).length > 0
        ? (practitionerLogs.filter(l => l.effectiveness_rating).reduce((sum, l) => sum + l.effectiveness_rating, 0) / practitionerLogs.filter(l => l.effectiveness_rating).length).toFixed(1)
        : 0
    };

    const analysisData = {
      practitioner_name: practitioner[0].full_name,
      period_days,
      session_metrics: sessionMetrics,
      note_quality: noteQuality,
      ai_support_usage: aiSupportUsage,
      recent_session_samples: practitionerSessions.slice(-3).map(s => ({
        date: s.session_date,
        engagement: s.client_engagement_level,
        interventions: s.interventions_applied?.length || 0,
        effectiveness: s.intervention_effectiveness
      }))
    };

    const prompt = `
Provide constructive, actionable feedback to a behaviour support practitioner based on their session delivery metrics and documentation quality over the last ${period_days} days.

PRACTITIONER DATA:
${JSON.stringify(analysisData, null, 2)}

Generate feedback in JSON format:
{
  "overall_assessment": "Overall professional summary (1-2 sentences, balanced)",
  "strengths": [
    "specific strength with evidence",
    "specific strength with evidence"
  ],
  "areas_for_development": [
    "specific area with concrete suggestion for improvement",
    "specific area with concrete suggestion for improvement"
  ],
  "client_engagement_insights": "Commentary on client engagement levels observed",
  "documentation_quality": "Assessment of session note comprehensiveness and timeliness",
  "ai_support_integration": "How effectively the practitioner is using AI support tools",
  "risk_management": "Observation on handling of risk incidents or concerning situations",
  "recommended_focus_areas": [
    "priority 1 - specific area to focus on",
    "priority 2 - specific area to focus on"
  ],
  "next_steps": "Suggested actions or discussions for next supervision/review",
  "commendations": [
    "specific positive finding to acknowledge"
  ]
}

Guidelines:
- Focus on observable patterns in data, not generalizations
- Provide actionable feedback tied to specific metrics
- Be encouraging while identifying genuine areas for growth
- Frame recommendations constructively
- Consider workload and context in assessment
- Avoid punitive language`;

    const feedback = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          overall_assessment: { type: 'string' },
          strengths: { type: 'array', items: { type: 'string' } },
          areas_for_development: { type: 'array', items: { type: 'string' } },
          client_engagement_insights: { type: 'string' },
          documentation_quality: { type: 'string' },
          ai_support_integration: { type: 'string' },
          risk_management: { type: 'string' },
          recommended_focus_areas: { type: 'array', items: { type: 'string' } },
          next_steps: { type: 'string' },
          commendations: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    return Response.json({
      success: true,
      practitioner_id,
      practitioner_name: practitioner[0].full_name,
      feedback_period: `${period_days} days`,
      metrics_snapshot: analysisData,
      feedback
    });
  } catch (error) {
    console.error('Feedback generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});