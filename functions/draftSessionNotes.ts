import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { session_id } = await req.json();

    if (!session_id) {
      return Response.json({ error: 'Missing session_id' }, { status: 400 });
    }

    // Fetch session and related data
    const sessions = await base44.entities.SessionContext.filter({ id: session_id });
    const session = sessions?.[0];

    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    const [
      supportLogs,
      goals,
      bsps,
      fbas
    ] = await Promise.all([
      base44.entities.SessionSupportLog.filter({ session_id }),
      base44.entities.ClientGoal.filter({ client_id: session.client_id }),
      base44.entities.BehaviourSupportPlan.filter({ client_id: session.client_id }),
      base44.entities.FunctionalBehaviourAssessment.filter({ client_id: session.client_id })
    ]);

    const activeBSP = bsps?.find(b => b.is_latest_version && b.status === 'active');
    const latestFBA = fbas?.sort((a, b) => new Date(b.assessment_date) - new Date(a.assessment_date))?.[0];
    const relevantGoals = goals?.filter(g => g.status !== 'achieved') || [];

    const prompt = `
Generate a professional progress note for an NDIS behaviour support session.

SESSION DETAILS:
- Date: ${session.session_date}
- Time: ${session.session_start_time} - ${session.session_end_time}
- Type: ${session.session_type}
- Client: ${session.client_name}
- Practitioner: ${session.practitioner_name}
- Location: ${session.location}

OBSERVATIONS DURING SESSION:
${session.observed_behaviors || 'Standard participation'}

INTERVENTIONS APPLIED:
${session.interventions_applied?.join('\n') || 'Standard planned interventions'}

ENGAGEMENT LEVEL: ${session.client_engagement_level || 'Not recorded'}%

PLAN ALIGNMENT:
Active BSP: ${activeBSP ? 'Yes' : 'No active plan'}
Relevant Goals: ${relevantGoals.map(g => g.goal_description).join(', ') || 'None'}

AI SUPPORT PROVIDED:
${supportLogs?.length || 0} support requests during session
Types: ${supportLogs?.map(log => log.request_type).join(', ') || 'None'}

ANY INCIDENTS: ${session.risk_incidents?.length ? session.risk_incidents.join(', ') : 'None'}

Generate a professional progress note in this JSON format:
{
  "session_summary": "Brief overview of session",
  "observations": "Client observations and engagement",
  "behaviors_observed": "Any target behaviors observed during session",
  "interventions_used": "Interventions applied and client response",
  "progress_against_goals": "Progress on active goals",
  "client_engagement": "Engagement and participation level",
  "risk_considerations": "Any safety or risk concerns noted (if applicable)",
  "plan_alignment": "How session aligned with BSP",
  "recommendations": "Recommended next steps or modifications",
  "follow_up_actions": "What should happen next"
}

Note should be:
- Professional and objective
- Aligned with support plan
- Evidence-based
- Specific and measurable
- Suitable for client records and audit
`;

    const noteDraft = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          session_summary: { type: 'string' },
          observations: { type: 'string' },
          behaviors_observed: { type: 'string' },
          interventions_used: { type: 'string' },
          progress_against_goals: { type: 'string' },
          client_engagement: { type: 'string' },
          risk_considerations: { type: 'string' },
          plan_alignment: { type: 'string' },
          recommendations: { type: 'string' },
          follow_up_actions: { type: 'string' }
        }
      }
    });

    // Create draft session note
    const sessionNote = await base44.entities.SessionNote.create({
      session_id,
      client_id: session.client_id,
      client_name: session.client_name,
      practitioner_id: user.id,
      practitioner_name: user.full_name,
      session_date: session.session_date,
      note_type: 'progress_note',
      status: 'ai_suggested',
      session_summary: noteDraft.session_summary,
      observations: noteDraft.observations,
      behaviors_observed: noteDraft.behaviors_observed,
      interventions_used: noteDraft.interventions_used,
      progress_against_goals: noteDraft.progress_against_goals,
      client_engagement: noteDraft.client_engagement,
      risk_considerations: noteDraft.risk_considerations,
      plan_alignment: noteDraft.plan_alignment,
      recommendations: noteDraft.recommendations,
      ai_draft: JSON.stringify(noteDraft),
      created_date: new Date().toISOString()
    });

    return Response.json({
      success: true,
      session_id,
      note_id: sessionNote.id,
      draft: noteDraft
    });
  } catch (error) {
    console.error('Note drafting error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});