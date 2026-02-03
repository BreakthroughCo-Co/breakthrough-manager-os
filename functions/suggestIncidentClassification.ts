import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { description, additional_context } = await req.json();

    const prompt = `You are an NDIS compliance and incident management expert. Analyze the following incident description and suggest appropriate categorization and severity level.

INCIDENT DESCRIPTION:
${description}

${additional_context ? `ADDITIONAL CONTEXT:\n${additional_context}` : ''}

Available categories:
- client_behaviour: Challenging behaviors displayed by client
- safety_concern: Safety risks to client, staff, or others
- policy_breach: Violation of organizational policies
- medication_error: Medication administration mistakes
- injury: Physical injury to client or staff
- property_damage: Damage to property or equipment
- unauthorized_restrictive_practice: Use of unauthorized restrictive practices
- complaint: Formal complaint from client/family
- other: Other incident types

Available severity levels:
- low: Minor incident with minimal impact
- medium: Moderate incident requiring attention
- high: Serious incident requiring immediate action
- critical: Critical incident with severe impact or risk

Analyze the incident and provide:
1. Most appropriate category
2. Appropriate severity level
3. Brief justification for each (1-2 sentences)
4. Whether this is NDIS reportable (true/false)
5. Key risk factors identified`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          suggested_category: { type: "string" },
          suggested_severity: { type: "string" },
          category_justification: { type: "string" },
          severity_justification: { type: "string" },
          ndis_reportable: { type: "boolean" },
          risk_factors: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["suggested_category", "suggested_severity", "category_justification", "severity_justification", "ndis_reportable"]
      }
    });

    return Response.json(result);
  } catch (error) {
    console.error('Incident classification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});