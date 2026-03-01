import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { case_note_id } = await req.json();
    if (!case_note_id) return Response.json({ error: 'case_note_id required' }, { status: 400 });

    const notes = await base44.entities.CaseNote.filter({ id: case_note_id });
    const note = notes[0];
    if (!note) return Response.json({ error: 'CaseNote not found' }, { status: 404 });

    const prompt = `You are an NDIS clinical documentation specialist. Analyse the following SOAP case note and return a structured JSON response.

SOAP NOTE:
Subjective: ${note.subjective || 'N/A'}
Objective: ${note.objective || 'N/A'}
Assessment: ${note.assessment || 'N/A'}
Plan: ${note.plan || 'N/A'}
Session Type: ${note.session_type || 'N/A'}
Duration: ${note.duration_minutes || 'N/A'} minutes
Progress Rating: ${note.progress_rating || 'N/A'}

Return a JSON object with:
1. ai_summary: A 2-3 sentence clinical summary suitable for NDIS audit, written in third person, professional tone.
2. ndis_compliance_flags: An array of strings identifying any compliance risk vectors (e.g., missing goal references, absent progress data, inadequate SOAP documentation, billing code misalignment). Empty array if compliant.
3. suggested_ndis_line_items: An array of objects [{code, description, hours, rate_type}] recommending appropriate NDIS support catalogue line items based on session type and content.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          ai_summary: { type: 'string' },
          ndis_compliance_flags: { type: 'array', items: { type: 'string' } },
          suggested_ndis_line_items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                description: { type: 'string' },
                hours: { type: 'number' },
                rate_type: { type: 'string' }
              }
            }
          }
        }
      }
    });

    // Persist results back to CaseNote
    await base44.entities.CaseNote.update(case_note_id, {
      ai_summary: result.ai_summary,
      ndis_compliance_flags: result.ndis_compliance_flags,
      suggested_ndis_line_items: JSON.stringify(result.suggested_ndis_line_items)
    });

    return Response.json({ success: true, result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});