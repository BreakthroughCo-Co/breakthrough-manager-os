import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, context_type, entity_id } = await req.json();

    // Gather relevant context based on query type
    let contextData = {};

    if (context_type === 'client' && entity_id) {
      const client = await base44.entities.Client.get(entity_id);
      const goals = await base44.entities.ClientGoal.filter({ client_id: entity_id });
      const caseNotes = await base44.entities.CaseNote.filter({ client_id: entity_id });
      const risks = await base44.entities.ClientRiskProfile.filter({ client_id: entity_id });
      
      contextData = { client, goals, recent_notes: caseNotes.slice(0, 10), risk_profile: risks[0] };
    } else if (context_type === 'practitioner' && entity_id) {
      const practitioner = await base44.entities.Practitioner.get(entity_id);
      const performance = await base44.entities.MonthlyPerformanceReport.filter({ 
        practitioner_id: entity_id 
      });
      const skills = await base44.entities.PractitionerSkill.filter({ practitioner_id: entity_id });
      
      contextData = { practitioner, performance: performance[0], skills };
    } else if (context_type === 'compliance') {
      const complianceItems = await base44.entities.ComplianceItem.filter({ status: 'attention_needed' });
      const audits = await base44.entities.ComplianceAudit.list('-created_date', 5);
      const breaches = await base44.entities.ComplianceBreach.filter({ status: 'open' });
      
      contextData = { compliance_items: complianceItems.slice(0, 20), recent_audits: audits, active_breaches: breaches };
    }

    // Search knowledge base
    const kbArticles = await base44.entities.KnowledgeBaseArticle.filter({ is_current: true });
    
    // Use AI to process query with context
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are the Breakthrough Manager OS knowledge assistant. Answer this query using NDIS compliance knowledge and operational context.

Query: ${query}

Context Type: ${context_type || 'general'}
Available Context: ${JSON.stringify(contextData, null, 2)}

Knowledge Base Articles (${kbArticles.length} available):
${kbArticles.slice(0, 10).map(a => `- ${a.title} (${a.category}): ${a.content.substring(0, 200)}...`).join('\n')}

Provide a clear, actionable answer that:
1. Directly addresses the query
2. References specific compliance requirements when relevant
3. Provides practical next steps or recommendations
4. Cites relevant knowledge base articles
5. Highlights any risks or compliance considerations

Format your response as JSON with:
- answer: comprehensive answer text
- relevant_articles: array of article IDs referenced
- recommendations: array of actionable next steps
- compliance_flags: array of any compliance concerns identified
- confidence_score: 0-100 indicating answer confidence`,
      response_json_schema: {
        type: "object",
        properties: {
          answer: { type: "string" },
          relevant_articles: { type: "array", items: { type: "string" } },
          recommendations: { type: "array", items: { type: "string" } },
          compliance_flags: { type: "array", items: { type: "string" } },
          confidence_score: { type: "number" }
        }
      }
    });

    // Get full article details for referenced articles
    const referencedArticles = await Promise.all(
      (response.relevant_articles || []).map(id => 
        base44.entities.KnowledgeBaseArticle.get(id).catch(() => null)
      )
    );

    return Response.json({
      query,
      result: response,
      referenced_articles: referencedArticles.filter(a => a !== null),
      context_used: Object.keys(contextData),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Knowledge base query error:', error);
    return Response.json({ 
      error: error.message,
      query: 'failed' 
    }, { status: 500 });
  }
});