import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { communication_id, context_notes } = await req.json();

    if (!communication_id) {
      return Response.json({ error: 'communication_id is required' }, { status: 400 });
    }

    // Fetch the communication
    const comms = await base44.asServiceRole.entities.ClientCommunication.filter({ id: communication_id });
    const communication = comms[0];

    if (!communication) {
      return Response.json({ error: 'Communication not found' }, { status: 404 });
    }

    // Fetch client information
    const clients = await base44.asServiceRole.entities.Client.filter({ id: communication.client_id });
    const client = clients[0];

    // Fetch recent communications for context
    const recentComms = await base44.asServiceRole.entities.ClientCommunication.filter({
      client_id: communication.client_id
    });
    const sortedComms = recentComms
      .sort((a, b) => new Date(b.sent_date || b.created_date) - new Date(a.sent_date || a.created_date))
      .slice(0, 5);

    // Fetch any active BSP
    const bsps = await base44.asServiceRole.entities.BehaviourSupportPlan.filter({
      client_id: communication.client_id,
      status: 'active'
    });

    // Prepare context for AI
    const responseContext = {
      current_communication: {
        subject: communication.subject,
        message: communication.message_body,
        type: communication.communication_type,
        date: communication.sent_date,
        sentiment: communication.ai_sentiment,
        urgency: communication.ai_urgency
      },
      client_info: {
        name: client?.full_name,
        service_type: client?.service_type,
        risk_level: client?.risk_level,
        status: client?.status
      },
      recent_communication_history: sortedComms.map(c => ({
        date: c.sent_date,
        subject: c.subject,
        type: c.communication_type,
        direction: c.direction
      })),
      active_support_plan: bsps.length > 0 ? {
        version: bsps[0].plan_version,
        goals: bsps[0].goals_summary?.substring(0, 200)
      } : null,
      additional_context: context_notes || null
    };

    const suggestionPrompt = `You are an expert NDIS communication specialist. Based on the following context, suggest an optimal response to the client communication:

CONTEXT:
${JSON.stringify(responseContext, null, 2)}

Generate a comprehensive response suggestion that includes:
1. Recommended response tone and approach
2. Key points to address
3. Draft response(s) in different tones (professional, empathetic, solution-focused)
4. Considerations for NDIS compliance and best practices
5. Any follow-up actions needed

Return your suggestions as JSON with this structure:
{
  "response_strategy": {
    "recommended_tone": "description",
    "approach": "description",
    "priority_level": "urgent/high/normal/low",
    "key_considerations": ["consideration1", "consideration2"]
  },
  "key_points_to_address": [
    {
      "point": "what to address",
      "rationale": "why it's important",
      "suggested_phrasing": "how to say it"
    }
  ],
  "draft_responses": [
    {
      "style": "professional/empathetic/solution_focused/brief",
      "subject": "suggested subject line",
      "body": "full draft response",
      "rationale": "why this approach works"
    }
  ],
  "ndis_compliance_notes": ["note1", "note2"],
  "follow_up_actions": [
    {
      "action": "what to do",
      "timeline": "when",
      "responsible": "who should do it",
      "reason": "why"
    }
  ],
  "risk_considerations": ["risk1", "risk2"] or [],
  "relationship_building_opportunities": ["opportunity1", "opportunity2"]
}`;

    const suggestion = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: suggestionPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          response_strategy: { type: "object" },
          key_points_to_address: { type: "array" },
          draft_responses: { type: "array" },
          ndis_compliance_notes: { type: "array" },
          follow_up_actions: { type: "array" },
          risk_considerations: { type: "array" },
          relationship_building_opportunities: { type: "array" }
        }
      }
    });

    return Response.json({
      suggestion,
      context: responseContext,
      generated_date: new Date().toISOString(),
      generated_by: user.email
    });

  } catch (error) {
    console.error('Error suggesting communication response:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});