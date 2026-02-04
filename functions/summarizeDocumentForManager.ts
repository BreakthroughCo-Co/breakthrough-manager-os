import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      document_type,
      entity_id,
      content,
      urgency = 'normal'
    } = await req.json();

    // Define manager-focused summarization prompts by document type
    const summaryPrompts = {
      incident_report: `Summarize this incident report for a Practice Manager. Focus on:
- What happened (2-3 sentences)
- Severity and immediate risks
- Required managerial actions
- Compliance implications
- Timeline for response`,

      case_note: `Summarize this case note for quick managerial review. Highlight:
- Client progress summary
- Any concerning observations
- Service delivery quality indicators
- Issues requiring escalation
- Next steps or follow-ups needed`,

      compliance_audit: `Summarize this compliance audit for executive review. Emphasize:
- Overall compliance status
- Critical findings requiring immediate attention
- Risk level assessment
- Required corrective actions with deadlines
- Resource implications`,

      performance_report: `Summarize this performance report for strategic review. Include:
- Key performance indicators
- Areas of excellence
- Areas requiring intervention
- Trend analysis
- Recommended management actions`,

      bsp_document: `Summarize this Behaviour Support Plan for managerial oversight. Cover:
- Client background and needs
- Key intervention strategies
- Risk mitigation measures
- Resource requirements
- Review schedule and triggers`
    };

    const prompt = summaryPrompts[document_type] || summaryPrompts.case_note;

    // Fetch related context if entity_id provided
    let entityContext = '';
    if (entity_id) {
      if (document_type === 'incident_report') {
        const incident = await base44.entities.Incident.get(entity_id);
        entityContext = `\n\nIncident Context: ${JSON.stringify(incident, null, 2)}`;
      } else if (document_type === 'case_note') {
        const note = await base44.entities.CaseNote.get(entity_id);
        entityContext = `\n\nCase Note Context: ${JSON.stringify(note, null, 2)}`;
      } else if (document_type === 'compliance_audit') {
        const audit = await base44.entities.ComplianceAudit.get(entity_id);
        entityContext = `\n\nAudit Context: ${JSON.stringify(audit, null, 2)}`;
      }
    }

    // Generate manager-focused summary
    const summary = await base44.integrations.Core.InvokeLLM({
      prompt: `${prompt}

Document Type: ${document_type}
Urgency Level: ${urgency}
${entityContext}

Document Content:
${content}

Provide a structured summary optimized for a busy Practice Manager who needs to:
1. Quickly understand the situation
2. Identify required actions
3. Assess risk and priority
4. Make informed decisions

Format as JSON with:
- executive_summary: 2-3 sentence overview
- critical_points: array of key facts or concerns
- risk_level: low/medium/high/critical
- required_actions: array of {action, priority, deadline}
- compliance_implications: array of compliance considerations
- escalation_needed: boolean indicating if senior management should be notified
- estimated_reading_time: minutes to read full document
- key_people: array of people mentioned or involved`,
      response_json_schema: {
        type: "object",
        properties: {
          executive_summary: { type: "string" },
          critical_points: { type: "array", items: { type: "string" } },
          risk_level: { type: "string" },
          required_actions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string" },
                priority: { type: "string" },
                deadline: { type: "string" }
              }
            }
          },
          compliance_implications: { type: "array", items: { type: "string" } },
          escalation_needed: { type: "boolean" },
          estimated_reading_time: { type: "number" },
          key_people: { type: "array", items: { type: "string" } }
        }
      }
    });

    // Store summary for future reference
    if (entity_id && document_type === 'incident_report') {
      await base44.asServiceRole.entities.Incident.update(entity_id, {
        ai_summary: summary.executive_summary,
        risk_score: summary.risk_level === 'critical' ? 90 : summary.risk_level === 'high' ? 70 : summary.risk_level === 'medium' ? 40 : 20
      });
    }

    return Response.json({
      document_type,
      summary,
      generated_at: new Date().toISOString(),
      generated_for: user.email
    });

  } catch (error) {
    console.error('Document summarization error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});