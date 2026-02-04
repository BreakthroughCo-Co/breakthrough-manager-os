import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { case_note_id, enhancement_type } = await req.json();

    const caseNote = await base44.asServiceRole.entities.CaseNote.get(case_note_id);
    const client = await base44.asServiceRole.entities.Client.get(caseNote.client_id).catch(() => null);

    let prompt, schema;

    switch (enhancement_type) {
      case 'summarize':
        prompt = `Summarize the following NDIS case note into concise bullet points. Focus on key observations, interventions, and outcomes.

CASE NOTE:
${caseNote.note_content}

Observations: ${caseNote.observations || 'None'}
Interventions: ${caseNote.interventions_applied || 'None'}
Progress: ${caseNote.progress_notes || 'None'}

Provide a professional summary in bullet point format suitable for quick managerial review.`;
        
        schema = {
          type: "object",
          properties: {
            summary_bullets: { 
              type: "array", 
              items: { type: "string" } 
            },
            key_outcomes: { type: "string" },
            follow_up_required: { type: "boolean" }
          }
        };
        break;

      case 'terminology':
        prompt = `Review this NDIS case note and suggest improved NDIS-compliant terminology and phrasing.

ORIGINAL NOTE:
${caseNote.note_content}

Provide:
1. Specific phrases that need improvement
2. Suggested NDIS-compliant replacements
3. Rationale for each change`;

        schema = {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  original_phrase: { type: "string" },
                  suggested_replacement: { type: "string" },
                  rationale: { type: "string" }
                }
              }
            },
            overall_professionalism_score: { type: "number" }
          }
        };
        break;

      case 'draft_progress_note':
        prompt = `Generate a professional NDIS progress note based on this session data.

CLIENT: ${client?.full_name}
SERVICE TYPE: ${client?.service_type}
SESSION DATE: ${caseNote.session_date}
OBSERVATIONS: ${caseNote.observations || 'To be added'}
INTERVENTIONS: ${caseNote.interventions_applied || 'To be added'}

Generate a complete, NDIS-compliant progress note that includes:
- Session summary
- Client engagement and participation
- Interventions delivered
- Progress towards goals
- Recommendations for future sessions
- Professional, objective language`;

        schema = {
          type: "object",
          properties: {
            draft_note: { type: "string" },
            suggested_goals_alignment: { type: "string" },
            compliance_checklist: {
              type: "array",
              items: { type: "string" }
            }
          }
        };
        break;

      default:
        return Response.json({ error: 'Invalid enhancement type' }, { status: 400 });
    }

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: schema
    });

    return Response.json({
      success: true,
      enhancement_type,
      case_note_id,
      client_name: client?.full_name,
      result: aiResponse
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});