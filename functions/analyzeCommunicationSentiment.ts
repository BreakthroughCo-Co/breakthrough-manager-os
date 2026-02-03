import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { communication_ids, client_id } = await req.json();

    let communications = [];

    if (communication_ids && Array.isArray(communication_ids)) {
      // Fetch specific communications
      for (const id of communication_ids) {
        const comms = await base44.asServiceRole.entities.ClientCommunication.filter({ id });
        if (comms.length > 0) communications.push(comms[0]);
      }
    } else if (client_id) {
      // Fetch all communications for a client
      communications = await base44.asServiceRole.entities.ClientCommunication.filter({ client_id });
    } else {
      return Response.json({ error: 'Either communication_ids or client_id is required' }, { status: 400 });
    }

    if (communications.length === 0) {
      return Response.json({ error: 'No communications found' }, { status: 404 });
    }

    // Prepare communications for analysis
    const commsSummary = communications.map(c => ({
      id: c.id,
      date: c.sent_date || c.created_date,
      type: c.communication_type,
      subject: c.subject,
      message: c.message_body,
      sender: c.sent_by,
      recipient: c.recipient_name || c.client_name,
      direction: c.direction || 'outbound'
    }));

    // AI sentiment and theme analysis
    const analysisPrompt = `You are an expert communication analyst for NDIS service providers. Analyze the following client communications for sentiment, themes, and urgency:

COMMUNICATIONS:
${JSON.stringify(commsSummary, null, 2)}

For each communication, analyze:
1. Sentiment (positive, neutral, negative, concerned, frustrated, satisfied, anxious)
2. Urgency level (urgent, high, normal, low)
3. Key themes and topics
4. Emotional tone
5. Relationship quality indicators
6. Action items or requests

Also provide an overall analysis of the communication pattern for this client/conversation.

Return your analysis as JSON with this structure:
{
  "individual_analyses": [
    {
      "communication_id": "id",
      "sentiment": "sentiment classification",
      "sentiment_score": number (0-100, where 0=very negative, 100=very positive),
      "urgency": "urgent/high/normal/low",
      "emotional_tone": "description",
      "key_themes": ["theme1", "theme2"],
      "action_items": ["action1", "action2"],
      "relationship_indicators": {
        "satisfaction_level": "high/medium/low",
        "engagement_level": "high/medium/low",
        "concern_areas": ["concern1", "concern2"]
      },
      "requires_followup": boolean,
      "suggested_response_tone": "description"
    }
  ],
  "overall_pattern": {
    "communication_frequency": "description",
    "sentiment_trend": "improving/stable/declining",
    "primary_themes": ["theme1", "theme2"],
    "relationship_health": "excellent/good/concerning/poor",
    "engagement_quality": "description",
    "risk_indicators": ["indicator1", "indicator2"] or [],
    "strengths": ["strength1", "strength2"]
  },
  "recommendations": [
    {
      "priority": "high/medium/low",
      "action": "recommended action",
      "rationale": "why",
      "timeline": "when"
    }
  ]
}`;

    const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          individual_analyses: {
            type: "array",
            items: { type: "object" }
          },
          overall_pattern: { type: "object" },
          recommendations: { type: "array" }
        }
      }
    });

    // Update communications with sentiment data
    for (const individualAnalysis of analysis.individual_analyses) {
      try {
        await base44.asServiceRole.entities.ClientCommunication.update(
          individualAnalysis.communication_id,
          {
            ai_sentiment: individualAnalysis.sentiment,
            ai_sentiment_score: individualAnalysis.sentiment_score,
            ai_urgency: individualAnalysis.urgency,
            ai_themes: JSON.stringify(individualAnalysis.key_themes)
          }
        );
      } catch (e) {
        console.error('Error updating communication:', e);
      }
    }

    return Response.json({
      analysis,
      communications_analyzed: communications.length,
      analysis_date: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error analyzing communication sentiment:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});