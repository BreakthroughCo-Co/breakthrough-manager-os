import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * AI-Assisted Communication Sentiment Analysis
 * Analyzes client messages to identify urgent or negative communications
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch recent communications for sentiment analysis
    const communications = await base44.entities.ClientCommunication.list('-sent_date', 50);

    if (communications.length === 0) {
      return Response.json({
        communications_analyzed: 0,
        flagged_count: 0,
        summary: 'No recent communications to analyze'
      });
    }

    // Build communication context
    const commContext = `
RECENT CLIENT COMMUNICATIONS TO ANALYZE:

${communications.slice(0, 20).map(c => `
Communication from ${c.client_name} (${c.sent_date}):
Subject: ${c.subject}
Message: ${c.message_body?.substring(0, 200)}
Communication Type: ${c.communication_type}
`).join('\n')}`;

    const sentimentAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt: `${commContext}

Analyze each communication and provide:

1. **Overall Sentiment** - Positive, Neutral, Negative, or Mixed
2. **Urgency Assessment** - Routine, Standard, High-Priority, Critical/Immediate
3. **Flagged Communications** - Any requiring immediate management attention
4. **Tone Indicators** - Keywords/phrases indicating concerns or issues
5. **Recommended Response** - Brief guidance on response approach
6. **Risk Indicators** - Any signs of disengagement, dissatisfaction, or safety concerns

Focus on identifying communications that indicate:
- Client dissatisfaction or frustration
- Potential safety or risk concerns
- Disengagement or withdrawal
- Urgent needs or crises
- Positive progress/engagement to celebrate`,
      response_json_schema: {
        type: "object",
        properties: {
          flagged_communications: {
            type: "array",
            items: {
              type: "object",
              properties: {
                client_name: { type: "string" },
                date: { type: "string" },
                subject: { type: "string" },
                sentiment: { type: "string", enum: ["positive", "neutral", "negative", "mixed"] },
                urgency: { type: "string", enum: ["routine", "standard", "high", "critical"] },
                key_concerns: { type: "array", items: { type: "string" } },
                recommended_action: { type: "string" },
                risk_indicators: { type: "array", items: { type: "string" } }
              }
            }
          },
          summary: { type: "string" },
          critical_flags: { type: "array", items: { type: "string" } },
          positive_engagement: { type: "array", items: { type: "string" } }
        }
      }
    });

    // Create alerts for critical/high-urgency communications
    const criticalComms = sentimentAnalysis.flagged_communications.filter(
      f => f.urgency === 'critical' || (f.sentiment === 'negative' && f.urgency === 'high')
    );

    for (const comm of criticalComms) {
      // Find the actual communication to get client_id
      const actualComm = communications.find(c => c.client_name === comm.client_name && c.subject === comm.subject);
      
      if (actualComm?.client_id) {
        // Create task for follow-up
        await base44.entities.Task.create({
          title: `⚠️ Communication Alert: ${comm.client_name}`,
          description: `${comm.recommended_action}\n\nOriginal Message: ${comm.subject}\n\nRisk Indicators: ${comm.risk_indicators.join(', ')}`,
          category: 'Clinical',
          priority: comm.urgency === 'critical' ? 'urgent' : 'high',
          status: 'pending',
          due_date: new Date().toISOString().split('T')[0],
          related_entity_type: 'Client',
          related_entity_id: actualComm.client_id
        });
      }
    }

    return Response.json({
      analysis_date: new Date().toISOString(),
      communications_analyzed: communications.length,
      flagged_count: sentimentAnalysis.flagged_communications.length,
      critical_count: criticalComms.length,
      sentiment_analysis: sentimentAnalysis,
      alerts_created: criticalComms.length
    });

  } catch (error) {
    console.error('Sentiment analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});