import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, context } = await req.json();

    const systemPrompt = `
You are an NDIS compliance and best practice advisor embedded in Breakthrough Manager OS.

Your knowledge spans:
- NDIS Practice Standards (all modules)
- NDIS Quality and Safeguards Commission requirements
- Behaviour Support regulations and restrictive practice guidelines
- NDIS Pricing Arrangements and funding rules
- Incident reporting obligations
- Worker screening requirements
- Service agreement standards
- Documentation and record-keeping requirements

RESPONSE GUIDELINES:
1. Provide accurate, actionable guidance
2. Reference specific NDIS standards or sections when applicable
3. If uncertain, acknowledge limitations
4. Prioritize compliance and audit-readiness
5. Keep responses concise and operational (not academic)
6. Include "red flags" or critical considerations
7. Suggest next steps or related considerations

CONTEXT: User role is ${user.role}

USER QUERY: ${query}

${context ? `ADDITIONAL CONTEXT: ${context}` : ''}

Provide clear, authoritative guidance optimized for managerial decision-making.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: systemPrompt,
      add_context_from_internet: true // Enable web search for latest NDIS guidelines
    });

    // Log query for analytics
    await base44.asServiceRole.entities.SystemEvent.create({
      event_type: 'ai_assistant_query',
      user_email: user.email,
      metadata: JSON.stringify({ query: query.substring(0, 200) })
    }).catch(() => {});

    return Response.json({
      success: true,
      response: aiResponse,
      timestamp: new Date().toISOString(),
      disclaimer: 'AI-generated guidance. Always verify critical compliance matters with NDIS documentation or legal counsel.'
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});