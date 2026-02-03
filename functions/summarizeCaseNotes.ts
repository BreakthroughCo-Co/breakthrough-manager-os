import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { case_id } = await req.json();

    // Fetch case
    const cases = await base44.entities.Case.filter({ id: case_id });
    const caseData = cases[0];

    if (!caseData) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    const contextData = `
CASE: ${caseData.case_title}
Type: ${caseData.case_type}
Status: ${caseData.case_status}
Priority: ${caseData.priority}
Assigned: ${caseData.assigned_staff_name}
Opened: ${caseData.opened_date}

DESCRIPTION:
${caseData.case_description}

CASE NOTES:
${caseData.case_notes || 'No notes yet'}

ACTION ITEMS:
${caseData.action_items ? JSON.parse(caseData.action_items).join('\n') : 'None'}`;

    const aiSummary = await base44.integrations.Core.InvokeLLM({
      prompt: `${contextData}\n\nProvide a concise executive summary of this case, highlighting key issues, current status, and next steps.`,
      response_json_schema: {
        type: "object",
        properties: {
          executive_summary: { type: "string" },
          key_issues: { type: "array", items: { type: "string" } },
          current_status_summary: { type: "string" },
          recommended_next_steps: { type: "array", items: { type: "string" } },
          risk_assessment: { type: "string" }
        }
      }
    });

    // Update case with AI summary
    await base44.entities.Case.update(case_id, {
      ai_summary: JSON.stringify(aiSummary),
    });

    return Response.json({
      case_id,
      summary: aiSummary,
      generated_date: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Case summarization error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});