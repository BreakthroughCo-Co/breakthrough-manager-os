import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { mentor_id, mentee_id, focus_area, mentor_feedback, mentee_feedback, progress_rating } = body;

    if (!mentor_id || !mentee_id || !focus_area) {
      return Response.json({ error: 'mentor_id, mentee_id, focus_area required' }, { status: 400 });
    }

    // Fetch mentorship pair
    const practitioners = await base44.entities.Practitioner.list();
    const mentor = practitioners.find(p => p.id === mentor_id);
    const mentee = practitioners.find(p => p.id === mentee_id);

    if (!mentor || !mentee) {
      return Response.json({ error: 'Practitioner not found' }, { status: 404 });
    }

    // Fetch skill matrix to validate pairing
    const skillMatrixResult = await base44.functions.invoke('generatePractitionerSkillMatrix', {});
    const pairings = skillMatrixResult.data?.skill_matrix?.peer_mentor_pairings || [];
    const validPairing = pairings.some(p => p.mentor_name === mentor.full_name && p.mentee_name === mentee.full_name);

    // Use LLM to generate progress summary and recommendations
    const prompt = `
    Analyze mentorship progress between mentor and mentee:
    
    Mentor: ${mentor.full_name} (${mentor.role})
    Mentee: ${mentee.full_name} (${mentee.role})
    Focus Area: ${focus_area}
    Progress Rating: ${progress_rating}/5
    
    Mentor Feedback: ${mentor_feedback || 'None provided'}
    Mentee Feedback: ${mentee_feedback || 'None provided'}
    
    Provide a structured assessment:
    {
      progress_summary: "...",
      key_achievements: ["..."],
      areas_for_continued_focus: ["..."],
      recommended_next_steps: ["..."],
      mentorship_effectiveness: "low|moderate|high",
      estimated_time_to_competency_weeks: number,
      risk_factors: ["..."],
      suggested_additional_support: ["..."]
    }
    `;

    const progressAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          progress_summary: { type: 'string' },
          key_achievements: { type: 'array', items: { type: 'string' } },
          areas_for_continued_focus: { type: 'array', items: { type: 'string' } },
          recommended_next_steps: { type: 'array', items: { type: 'string' } },
          mentorship_effectiveness: { type: 'string' },
          estimated_time_to_competency_weeks: { type: 'number' },
          risk_factors: { type: 'array', items: { type: 'string' } },
          suggested_additional_support: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    // Create audit log entry
    const auditEntry = await base44.entities.AuditLog.create({
      event_type: 'mentorship_progress_logged',
      entity_type: 'PractitionerMentorship',
      entity_id: `${mentor_id}_${mentee_id}`,
      document_name: `Mentorship Progress: ${mentee.full_name} - ${focus_area}`,
      extracted_data: JSON.stringify({
        mentor_feedback,
        mentee_feedback,
        progress_rating,
        analysis: progressAnalysis
      }),
      validated_by: user.email,
      validation_status: 'approved',
      notes: `Mentorship session logged for focus area: ${focus_area}`
    });

    return Response.json({
      success: true,
      mentorship_session: {
        mentor_name: mentor.full_name,
        mentee_name: mentee.full_name,
        focus_area,
        progress_rating,
        timestamp: new Date().toISOString()
      },
      analysis: progressAnalysis,
      audit_entry_id: auditEntry.id,
      valid_pairing: validPairing,
      next_review_recommended: progressAnalysis.mentorship_effectiveness === 'low'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});