import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { case_note_ids, incident_ids } = await req.json();

    const summaries = [];

    // Process case notes
    if (case_note_ids && case_note_ids.length > 0) {
      const caseNotes = await Promise.all(
        case_note_ids.map(id => base44.entities.CaseNote.filter({ id }).then(notes => notes[0]))
      );

      for (const note of caseNotes.filter(Boolean)) {
        const summary = await base44.integrations.Core.InvokeLLM({
          prompt: `Summarize this case note professionally and concisely (max 100 words):\n\nSession Date: ${note.session_date}\nSubjective: ${note.subjective}\nObjective: ${note.objective}\nAssessment: ${note.assessment}\nPlan: ${note.plan}`,
          response_json_schema: {
            type: "object",
            properties: {
              summary: { type: "string" },
              key_points: { type: "array", items: { type: "string" } },
              progress_indicator: { type: "string" }
            }
          }
        });

        await base44.entities.CaseNote.update(note.id, {
          ai_summary: summary.summary,
        });

        summaries.push({
          type: 'case_note',
          id: note.id,
          summary: summary.summary,
          key_points: summary.key_points,
        });
      }
    }

    // Process incidents
    if (incident_ids && incident_ids.length > 0) {
      const incidents = await Promise.all(
        incident_ids.map(id => base44.entities.Incident.filter({ id }).then(inc => inc[0]))
      );

      for (const incident of incidents.filter(Boolean)) {
        const summary = await base44.integrations.Core.InvokeLLM({
          prompt: `Summarize this incident professionally (max 80 words):\n\nCategory: ${incident.category}\nSeverity: ${incident.severity}\nDescription: ${incident.description}\nImmediate Action: ${incident.immediate_action_taken}`,
          response_json_schema: {
            type: "object",
            properties: {
              summary: { type: "string" },
              risk_assessment: { type: "string" },
              follow_up_needed: { type: "boolean" }
            }
          }
        });

        summaries.push({
          type: 'incident',
          id: incident.id,
          summary: summary.summary,
          risk_assessment: summary.risk_assessment,
          follow_up_needed: summary.follow_up_needed,
        });
      }
    }

    return Response.json({
      summaries_generated: summaries.length,
      summaries,
      processed_by: user.email,
      generated_date: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Auto-summary generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});