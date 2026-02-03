import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * AI-Assisted Client Communication Drafting
 * Generates personalized outreach messages based on client context
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_id, communication_type, additional_context } = await req.json();

    // Fetch client context
    const [client, caseNotes, goals, incidents, recentComms] = await Promise.all([
      base44.entities.Client.filter({ id: client_id }).then(c => c[0]),
      base44.entities.CaseNote.filter({ client_id }, '-session_date', 10),
      base44.entities.ClientGoal.filter({ client_id }),
      base44.entities.Incident.filter({ client_id }, '-incident_date', 5),
      base44.entities.ClientCommunication.filter({ client_id }, '-sent_date', 3)
    ]);

    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    // Build communication context
    const contextData = `
CLIENT: ${client.full_name}
Service Type: ${client.service_type}
Risk Level: ${client.risk_level}
Current Status: ${client.status}

RECENT PROGRESS (Last sessions):
${caseNotes.slice(0, 3).map(cn => `
- ${cn.session_date}: ${cn.progress_rating}
  Assessment: ${cn.assessment?.substring(0, 100)}
`).join('\n')}

ACTIVE GOALS:
${goals.filter(g => g.status !== 'achieved').slice(0, 3).map(g => `
- ${g.goal_description}
  Progress: ${g.current_progress}%
  Status: ${g.status}
`).join('\n')}

RECENT INCIDENTS:
${incidents.slice(0, 2).map(i => `- ${i.incident_date} (${i.severity}): ${i.category}`).join('\n') || 'No recent incidents'}

RECENT COMMUNICATIONS:
${recentComms.slice(0, 2).map(c => `- ${c.sent_date}: ${c.subject}`).join('\n')}

COMMUNICATION TYPE: ${communication_type}
ADDITIONAL CONTEXT: ${additional_context || 'None provided'}`;

    const communicationTypes = {
      'general_checkin': 'Brief, friendly check-in on how things are going',
      'progress_celebration': 'Celebrate recent progress and achievements',
      'goal_review': 'Discuss goal progress and upcoming plan review',
      'support_offer': 'Offer support and check if additional resources needed',
      'incident_followup': 'Follow-up after recent incident',
      'concern_address': 'Address concerning behaviours or patterns'
    };

    const draftResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `${contextData}

Based on this client's current situation and context, draft a professional but warm client communication for: ${communicationTypes[communication_type]}

Requirements:
- 2-3 paragraphs, conversational tone
- Reference recent progress/goals where relevant
- Personalized and specific to this client
- Clear next steps or invitation to respond
- Professional but warm (not clinical)
- Appropriate to the communication purpose

Also provide:
- Tone assessment (appropriate for this client?)
- Any sensitivities to consider
- Suggested subject line for email

Output the DRAFT message and metadata separately.`,
      response_json_schema: {
        type: "object",
        properties: {
          subject_line: { type: "string" },
          message_draft: { type: "string" },
          tone: { type: "string" },
          personalization_notes: { type: "array", items: { type: "string" } },
          sensitivities: { type: "array", items: { type: "string" } },
          next_steps: { type: "string" }
        }
      }
    });

    return Response.json({
      client_id,
      client_name: client.full_name,
      communication_type,
      draft: draftResponse,
      generated_date: new Date().toISOString()
    });

  } catch (error) {
    console.error('Communication drafting error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});