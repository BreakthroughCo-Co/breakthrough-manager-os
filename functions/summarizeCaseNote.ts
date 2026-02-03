import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { case_note_id } = await req.json();

    // Fetch case note
    const caseNotes = await base44.entities.CaseNote.filter({ id: case_note_id });
    const caseNote = caseNotes[0];

    if (!caseNote) {
      return Response.json({ error: 'Case note not found' }, { status: 404 });
    }

    const prompt = `You are a clinical documentation specialist for NDIS behaviour support services. Generate a concise summary of this case note that highlights key achievements, challenges, and planned interventions.

CASE NOTE DETAILS:
Date: ${caseNote.session_date}
Session Type: ${caseNote.session_type || 'Not specified'}
Duration: ${caseNote.duration_minutes ? `${caseNote.duration_minutes} minutes` : 'Not specified'}

Full Summary:
${caseNote.summary || caseNote.progress_summary || 'No summary available'}

${caseNote.goals_addressed ? `Goals Addressed:\n${caseNote.goals_addressed}` : ''}
${caseNote.strategies_used ? `Strategies Used:\n${caseNote.strategies_used}` : ''}
${caseNote.observations ? `Observations:\n${caseNote.observations}` : ''}
${caseNote.follow_up_required ? `Follow-up Required:\n${caseNote.follow_up_actions}` : ''}

Generate a structured summary (150-200 words) with:

**Key Achievements:** 
- 2-3 bullet points of progress, successes, or positive developments

**Challenges Identified:**
- 2-3 bullet points of difficulties, concerns, or areas needing attention

**Planned Interventions:**
- 2-3 bullet points of next steps, strategies to implement, or goals to work on

Keep it clinical, professional, and focused on actionable insights. Use person-centered language.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
    });

    // Update case note with AI summary
    await base44.entities.CaseNote.update(case_note_id, {
      ai_summary: result,
    });

    return Response.json({
      case_note_id,
      ai_summary: result,
      generated_date: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Case note summarization error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});