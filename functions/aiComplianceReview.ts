import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { entity_type, entity_id, content, context } = body;

    if (!content) {
      return Response.json({ error: 'content is required' }, { status: 400 });
    }

    const prompt = `You are an NDIS compliance specialist embedded in an internal practice management system.

TASK: Review the following ${entity_type || 'record'} for NDIS compliance issues.

CONTENT TO REVIEW:
${content}

${context ? `ADDITIONAL CONTEXT:\n${context}` : ''}

Analyse against:
1. NDIS Practice Standards (Quality & Safeguards)
2. Behaviour Support reporting obligations
3. Incident notification requirements (24-hour and 5-day)
4. Restrictive practice authorisation requirements
5. Documentation sufficiency for audit readiness
6. Privacy and participant rights considerations

Return JSON with these fields:
- compliance_status: "compliant" | "attention_needed" | "non_compliant"
- risk_level: "low" | "medium" | "high" | "critical"
- issues: array of objects with { standard, description, severity }
- corrective_actions: array of specific action strings (max 5)
- relevant_standards: array of NDIS standard references
- audit_readiness_score: integer 0-100
- summary: single paragraph plain-text summary for the manager`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          compliance_status: { type: 'string' },
          risk_level: { type: 'string' },
          issues: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                standard: { type: 'string' },
                description: { type: 'string' },
                severity: { type: 'string' },
              },
            },
          },
          corrective_actions: { type: 'array', items: { type: 'string' } },
          relevant_standards: { type: 'array', items: { type: 'string' } },
          audit_readiness_score: { type: 'number' },
          summary: { type: 'string' },
        },
      },
    });

    // If non-compliant or attention needed, create a ComplianceItem
    if (['attention_needed', 'non_compliant'].includes(result.compliance_status) && entity_id) {
      await base44.entities.ComplianceItem.create({
        title: `AI Compliance Flag — ${entity_type} ${entity_id}`,
        category: 'Documentation',
        description: result.summary,
        status: result.compliance_status,
        priority: result.risk_level === 'critical' ? 'critical' : result.risk_level === 'high' ? 'high' : 'medium',
        responsible_person: user.email,
        notes: `AI-identified issues:\n${result.issues?.map(i => `• [${i.severity}] ${i.description}`).join('\n') || 'None'}`,
      });
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});