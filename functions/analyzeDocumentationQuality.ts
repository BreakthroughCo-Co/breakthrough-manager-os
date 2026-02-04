import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { case_note_id } = await req.json();

    if (!case_note_id) {
      return Response.json({ error: 'case_note_id required' }, { status: 400 });
    }

    // Fetch case note and related data
    const caseNote = await base44.asServiceRole.entities.CaseNote.get(case_note_id);
    const client = await base44.asServiceRole.entities.Client.get(caseNote.client_id).catch(() => null);
    const bsp = client ? await base44.asServiceRole.entities.BehaviourSupportPlan.filter(
      { client_id: client.id, status: 'active' }
    ).then(plans => plans[0]).catch(() => null) : null;

    // Build analysis prompt
    const analysisPrompt = `
You are an NDIS compliance auditor reviewing a case note for quality, completeness, and compliance.

CLIENT CONTEXT:
- Name: ${client?.full_name || 'Unknown'}
- Service Type: ${client?.service_type || 'Not specified'}
- Has Active BSP: ${bsp ? 'Yes' : 'No'}

CASE NOTE TO REVIEW:
Title: ${caseNote.note_title || 'Untitled'}
Date: ${caseNote.session_date || caseNote.created_date}
Type: ${caseNote.note_type || 'General'}
Content:
${caseNote.note_content || 'No content provided'}

Observations: ${caseNote.observations || 'None recorded'}
Interventions: ${caseNote.interventions_applied || 'None recorded'}
Progress Notes: ${caseNote.progress_notes || 'None recorded'}

NDIS COMPLIANCE REQUIREMENTS FOR CASE NOTES:
1. Clear participant identification
2. Date and time of service
3. Nature of support provided
4. Progress towards goals
5. Any incidents or significant events
6. Practitioner observations
7. Interventions used and client response
8. Professional signature/practitioner details
9. Alignment with BSP (if applicable)
10. Objective, factual language

ANALYZE THIS CASE NOTE AND PROVIDE:
1. Compliance Score (0-100): How well does this meet NDIS standards?
2. Completeness Assessment: What information is present vs missing?
3. Quality Rating: Is the documentation clear, specific, and professional?
4. Specific Gaps: List any missing required elements
5. Compliance Risks: Flag any potential audit issues
6. Improvement Recommendations: Specific, actionable suggestions

Respond in JSON format with these exact fields:
{
  "compliance_score": number (0-100),
  "overall_quality": "excellent" | "good" | "adequate" | "poor",
  "completeness_percentage": number (0-100),
  "missing_elements": ["element1", "element2"],
  "compliance_risks": [
    {"severity": "critical|high|medium|low", "issue": "description", "requirement": "NDIS standard"}
  ],
  "strengths": ["strength1", "strength2"],
  "improvement_recommendations": [
    {"priority": "high|medium|low", "suggestion": "specific action"}
  ],
  "bsp_alignment": "aligned" | "partial" | "misaligned" | "not_applicable",
  "language_quality": "professional" | "adequate" | "needs_improvement",
  "audit_readiness": "ready" | "minor_issues" | "major_issues"
}`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          compliance_score: { type: "number" },
          overall_quality: { type: "string" },
          completeness_percentage: { type: "number" },
          missing_elements: { type: "array", items: { type: "string" } },
          compliance_risks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                severity: { type: "string" },
                issue: { type: "string" },
                requirement: { type: "string" }
              }
            }
          },
          strengths: { type: "array", items: { type: "string" } },
          improvement_recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                priority: { type: "string" },
                suggestion: { type: "string" }
              }
            }
          },
          bsp_alignment: { type: "string" },
          language_quality: { type: "string" },
          audit_readiness: { type: "string" }
        }
      }
    });

    const analysis = aiResponse;

    // Create notification if critical issues found
    if (analysis.compliance_risks?.some(r => r.severity === 'critical')) {
      await base44.asServiceRole.entities.Notification.create({
        notification_type: 'compliance_alert',
        title: 'Critical Documentation Issue Detected',
        message: `Case note for ${client?.full_name} requires immediate attention due to compliance gaps.`,
        priority: 'critical',
        entity_type: 'CaseNote',
        entity_id: case_note_id,
        is_read: false,
        action_url: `/CaseNotes?noteId=${case_note_id}`,
        metadata: JSON.stringify({
          compliance_score: analysis.compliance_score,
          critical_issues: analysis.compliance_risks.filter(r => r.severity === 'critical')
        })
      });
    }

    // Update case note with analysis results
    await base44.asServiceRole.entities.CaseNote.update(case_note_id, {
      documentation_quality_score: analysis.compliance_score,
      last_quality_check_date: new Date().toISOString()
    }).catch(() => {}); // Field may not exist, that's ok

    return Response.json({
      success: true,
      case_note_id,
      client_name: client?.full_name,
      analysis,
      analyzed_at: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});