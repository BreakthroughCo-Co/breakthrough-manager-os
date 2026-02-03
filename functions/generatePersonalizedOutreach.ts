import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_id, message_type = 'general_checkin', analyze_outreach_needs = false } = await req.json();

    // Fetch client and related data
    const [client, bsps, caseNotes, communications, incidents, riskAlerts, ndisPlans] = await Promise.all([
      base44.asServiceRole.entities.Client.filter({ id: client_id }).then(c => c[0]),
      base44.asServiceRole.entities.BehaviourSupportPlan.filter({ client_id, status: 'active' }),
      base44.asServiceRole.entities.CaseNote.filter({ client_id }),
      base44.asServiceRole.entities.ClientCommunication.filter({ client_id }),
      base44.asServiceRole.entities.Incident.filter({ client_id }),
      base44.asServiceRole.entities.RiskAlert.filter({ client_id, status: 'active' }),
      base44.asServiceRole.entities.NDISPlan.filter({ client_id }),
    ]);

    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    const activePlan = ndisPlans.find(p => p.status === 'active');
    const planReviewDue = activePlan && activePlan.review_date 
      ? Math.ceil((new Date(activePlan.review_date) - new Date()) / (1000 * 60 * 60 * 24))
      : null;

    // Analyze outreach needs if requested
    if (analyze_outreach_needs) {
      const analysisPrompt = `Analyze this client's data and recommend optimal outreach strategy:

CLIENT: ${client.full_name}
PLAN REVIEW: ${planReviewDue ? `Due in ${planReviewDue} days` : 'Not scheduled'}
RISK LEVEL: ${client.risk_level}

RECENT CASE NOTES:
${caseNotes.slice(0, 5).map(n => `- ${n.session_date}: ${n.progress_rating || 'No rating'} - ${n.summary?.substring(0, 150)}`).join('\n')}

RECENT INCIDENTS: ${incidents.length} total
${incidents.slice(0, 3).map(i => `- ${i.incident_date}: ${i.category} (${i.severity})`).join('\n')}

RECENT COMMUNICATIONS: ${communications.length} sent
Last: ${communications[0] ? new Date(communications[0].sent_date).toLocaleDateString() : 'None'}

Recommend:
1. Priority topics for outreach
2. Optimal communication timing
3. Recommended communication style
4. Specific concerns to address
5. Celebration opportunities

Return as JSON:
{
  "outreach_priority": "urgent/high/normal/low",
  "recommended_timing": "description",
  "priority_topics": ["topic1", "topic2"],
  "communication_style": "description",
  "concerns_to_address": ["concern1", "concern2"],
  "celebration_opportunities": ["achievement1", "achievement2"],
  "plan_review_prep": boolean,
  "rationale": "why this approach"
}`;

      const outreachAnalysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            outreach_priority: { type: "string" },
            recommended_timing: { type: "string" },
            priority_topics: { type: "array" },
            communication_style: { type: "string" },
            concerns_to_address: { type: "array" },
            celebration_opportunities: { type: "array" },
            plan_review_prep: { type: "boolean" },
            rationale: { type: "string" }
          }
        }
      });

      return Response.json({
        client_id,
        client_name: client.full_name,
        outreach_analysis: outreachAnalysis,
        context: {
          plan_review_due: planReviewDue,
          risk_level: client.risk_level,
          recent_activity: {
            case_notes: caseNotes.length,
            incidents: incidents.length,
            communications: communications.length
          }
        },
        analysis_date: new Date().toISOString()
      });
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

RISK FACTORS:
- Active Alerts: ${riskAlerts.length}
- Risk Level: ${client.risk_level || 'Not assessed'}

Message Type: ${message_type}

IMPORTANT: Tailor the message based on the client's current risk level, recent progress, and any active concerns. Be empathetic, specific, and action-oriented.`;

    const messageTypePrompts = {
      general_checkin: "Draft a warm, personalized check-in message asking about progress and wellbeing.",
      progress_celebration: "Draft a celebratory message highlighting recent achievements and positive progress.",
      goal_review: "Draft a message suggesting a goal review session and discussing current plan objectives.",
      support_offer: "Draft a supportive message offering additional resources or assistance based on recent challenges.",
    };

    const enhancedPrompt = `${contextData}\n\n${messageTypePrompts[message_type] || messageTypePrompts.general_checkin}

${planReviewDue && planReviewDue <= 30 ? `\nIMPORTANT: The client's plan review is coming up in ${planReviewDue} days. Consider incorporating plan review preparation into the message.` : ''}

${riskAlerts.length > 0 ? `\nNOTE: There are ${riskAlerts.length} active risk alerts. Approach with sensitivity and offer appropriate support.` : ''}

The message should be professional, empathetic, and specific to this client's situation. Include 2-3 specific references to their recent progress or goals. Tailor the communication style based on the client's current needs and risk profile.`;

    const aiMessage = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: enhancedPrompt,
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