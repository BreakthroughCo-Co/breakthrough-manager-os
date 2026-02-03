import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_id, message_type = 'general_checkin' } = await req.json();

    // Fetch client and related data
    const [client, bsps, caseNotes, communications, incidents] = await Promise.all([
      base44.entities.Client.filter({ id: client_id }).then(c => c[0]),
      base44.entities.BehaviourSupportPlan.filter({ client_id, status: 'active' }),
      base44.entities.CaseNote.filter({ client_id }),
      base44.entities.ClientCommunication.filter({ client_id }),
      base44.entities.Incident.filter({ client_id }),
    ]);

    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    // Get recent activity
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const recentNotes = caseNotes.filter(n => new Date(n.session_date) > last30Days);
    const recentComms = communications.filter(c => new Date(c.sent_date) > last30Days);
    const recentIncidents = incidents.filter(i => new Date(i.incident_date) > last30Days);

    const activeBSP = bsps[0];
    
    // Calculate progress indicators
    const progressRatings = recentNotes.map(n => n.progress_rating).filter(Boolean);
    const progressTrend = progressRatings.length > 0 
      ? progressRatings.filter(r => r === 'progressing' || r === 'achieved').length / progressRatings.length 
      : 0;

    const contextData = `
CLIENT OUTREACH ANALYSIS
Client: ${client.full_name}
Service Type: ${client.service_type}
Plan Period: ${client.plan_start_date} to ${client.plan_end_date}

RECENT ACTIVITY (Last 30 Days):
- Case Notes: ${recentNotes.length}
- Communications: ${recentComms.length}
- Incidents: ${recentIncidents.length}
- Progress Trend: ${(progressTrend * 100).toFixed(0)}% positive ratings

ACTIVE SUPPORT PLAN:
${activeBSP ? `
- BSP Version: ${activeBSP.plan_version}
- Review Date: ${activeBSP.review_date}
- Key Focus: ${activeBSP.behaviour_summary?.substring(0, 200)}
` : 'No active BSP'}

RECENT PROGRESS NOTES:
${recentNotes.slice(0, 3).map(n => `- ${n.session_date}: ${n.progress_rating} (${n.summary?.substring(0, 100)})`).join('\n')}

COMMUNICATION HISTORY:
- Last Contact: ${recentComms.length > 0 ? new Date(recentComms[0].sent_date).toLocaleDateString() : 'No recent contact'}
- Recent Topics: ${recentComms.slice(0, 3).map(c => c.subject).join(', ')}

Message Type: ${message_type}`;

    const messageTypePrompts = {
      general_checkin: "Draft a warm, personalized check-in message asking about progress and wellbeing.",
      progress_celebration: "Draft a celebratory message highlighting recent achievements and positive progress.",
      goal_review: "Draft a message suggesting a goal review session and discussing current plan objectives.",
      support_offer: "Draft a supportive message offering additional resources or assistance based on recent challenges.",
    };

    const aiMessage = await base44.integrations.Core.InvokeLLM({
      prompt: `${contextData}\n\n${messageTypePrompts[message_type] || messageTypePrompts.general_checkin}\n\nThe message should be professional, empathetic, and specific to this client's situation. Include 2-3 specific references to their recent progress or goals.`,
      response_json_schema: {
        type: "object",
        properties: {
          subject: { type: "string" },
          message_body: { type: "string" },
          suggested_timing: { type: "string" },
          engagement_tips: { type: "array", items: { type: "string" } },
          follow_up_recommendations: { type: "string" }
        }
      }
    });

    return Response.json({
      client_id,
      client_name: client.full_name,
      message_type,
      personalized_message: aiMessage,
      context_summary: {
        recent_sessions: recentNotes.length,
        last_communication: recentComms.length > 0 ? recentComms[0].sent_date : null,
        progress_trend: (progressTrend * 100).toFixed(0) + '%',
      },
      generated_date: new Date().toISOString(),
      generated_by: user.email,
    });
  } catch (error) {
    console.error('Personalized outreach error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});