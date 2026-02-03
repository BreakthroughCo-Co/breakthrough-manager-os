import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { scope = 'all', entity_ids = [] } = await req.json();

    // Fetch relevant data based on scope
    let caseNotes = [];
    let incidents = [];
    let bsps = [];
    let fbas = [];

    if (scope === 'all' || scope === 'case_notes') {
      caseNotes = await base44.asServiceRole.entities.CaseNote.list('-session_date', 200);
      if (entity_ids.length > 0) {
        caseNotes = caseNotes.filter(n => entity_ids.includes(n.id));
      }
    }

    if (scope === 'all' || scope === 'incidents') {
      incidents = await base44.asServiceRole.entities.Incident.list('-incident_date', 200);
      if (entity_ids.length > 0) {
        incidents = incidents.filter(i => entity_ids.includes(i.id));
      }
    }

    if (scope === 'all' || scope === 'bsps') {
      bsps = await base44.asServiceRole.entities.BehaviourSupportPlan.list('-created_date', 100);
      if (entity_ids.length > 0) {
        bsps = bsps.filter(b => entity_ids.includes(b.id));
      }
    }

    if (scope === 'all' || scope === 'fbas') {
      fbas = await base44.asServiceRole.entities.FunctionalBehaviourAssessment.list('-assessment_date', 100);
      if (entity_ids.length > 0) {
        fbas = fbas.filter(f => entity_ids.includes(f.id));
      }
    }

    // Prepare data summaries for AI analysis
    const dataSummary = {
      case_notes: caseNotes.slice(0, 50).map(n => ({
        id: n.id,
        client: n.client_name,
        date: n.session_date,
        type: n.session_type,
        status: n.status,
        has_soap: !!(n.subjective && n.objective && n.assessment && n.plan),
        progress_rating: n.progress_rating,
        goals_addressed: n.goals_addressed,
        duration: n.duration_minutes
      })),
      incidents: incidents.slice(0, 50).map(i => ({
        id: i.id,
        client: i.client_name,
        date: i.incident_date,
        category: i.category,
        severity: i.severity,
        ndis_reportable: i.ndis_reportable,
        has_investigation: !!i.investigation_notes,
        notification_sent: !!i.notification_date,
        actions_taken: !!i.immediate_actions
      })),
      bsps: bsps.slice(0, 30).map(b => ({
        id: b.id,
        client: b.client_name,
        version: b.plan_version,
        status: b.status,
        has_goals: !!b.goals_summary,
        has_strategies: !!b.skill_building_strategies,
        has_risk_assessment: !!b.risk_factors,
        review_date: b.review_date,
        restrictive_practices: b.restrictive_practices_included
      })),
      fbas: fbas.slice(0, 30).map(f => ({
        id: f.id,
        client: f.client_name,
        date: f.assessment_date,
        status: f.status,
        has_hypothesis: !!f.hypothesised_function,
        has_evidence: !!f.function_evidence,
        has_recommendations: !!f.recommendations
      }))
    };

    // AI-powered compliance gap detection
    const gapDetectionPrompt = `As an NDIS compliance auditor, analyze this data for compliance gaps, documentation issues, and regulatory risks:

DATA SUMMARY:
${JSON.stringify(dataSummary, null, 2)}

Analyze for:
1. NDIS Practice Standards compliance gaps
2. Documentation completeness and quality issues
3. Incident reporting and management concerns
4. BSP and FBA compliance with NDIS requirements
5. Restrictive practice documentation
6. Review and reporting timeliness
7. Risk management and safeguarding issues

Identify specific, actionable compliance gaps with severity levels.

Return as JSON:
{
  "critical_gaps": [
    {
      "gap_type": "type",
      "entity_type": "case_note/incident/bsp/fba",
      "entity_ids": ["id1", "id2"],
      "description": "what's wrong",
      "compliance_standard": "NDIS Practice Standard reference",
      "risk_level": "high/medium/low",
      "required_action": "what must be done",
      "deadline": "when to fix",
      "consequences": "what happens if not fixed"
    }
  ],
  "documentation_issues": [
    {
      "issue": "description",
      "affected_records": number,
      "examples": ["id1", "id2"],
      "improvement_action": "how to fix"
    }
  ],
  "incident_management_concerns": [
    {
      "concern": "description",
      "severity": "high/medium/low",
      "affected_incidents": ["id1"],
      "corrective_action": "what to do"
    }
  ],
  "bsp_fba_compliance": [
    {
      "issue": "description",
      "standard": "NDIS standard",
      "affected_plans": ["id1"],
      "resolution": "action needed"
    }
  ],
  "review_timeliness": {
    "overdue_reviews": number,
    "approaching_reviews": number,
    "affected_entities": ["id1", "id2"]
  },
  "overall_compliance_score": number (0-100),
  "priority_actions": ["action1", "action2", "action3"],
  "recommendations": ["rec1", "rec2"]
}`;

    const gapAnalysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: gapDetectionPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          critical_gaps: { type: "array" },
          documentation_issues: { type: "array" },
          incident_management_concerns: { type: "array" },
          bsp_fba_compliance: { type: "array" },
          review_timeliness: { type: "object" },
          overall_compliance_score: { type: "number" },
          priority_actions: { type: "array" },
          recommendations: { type: "array" }
        }
      }
    });

    return Response.json({
      gap_analysis: gapAnalysis,
      data_analyzed: {
        case_notes: dataSummary.case_notes.length,
        incidents: dataSummary.incidents.length,
        bsps: dataSummary.bsps.length,
        fbas: dataSummary.fbas.length
      },
      analysis_date: new Date().toISOString(),
      analyzed_by: user.email
    });

  } catch (error) {
    console.error('Error detecting compliance gaps:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});