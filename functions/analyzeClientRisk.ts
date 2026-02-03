import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { client_id } = await req.json();

    if (!client_id) {
      return Response.json({ error: 'Missing client_id' }, { status: 400 });
    }

    // Fetch comprehensive client data
    const [
      clients,
      caseNotes,
      motivationAssessments,
      incidents,
      sessionLogs,
      sessionContexts,
      goals,
      bsps,
      riskAlerts
    ] = await Promise.all([
      base44.entities.Client.list(),
      base44.entities.CaseNote.list(),
      base44.entities.MotivationAssessmentScale.list(),
      base44.entities.Incident.list(),
      base44.entities.SessionSupportLog.list(),
      base44.entities.SessionContext.list(),
      base44.entities.ClientGoal.list(),
      base44.entities.BehaviourSupportPlan.list(),
      base44.entities.RiskAlert.list()
    ]);

    const client = clients?.find(c => c.id === client_id);
    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    const clientCaseNotes = caseNotes?.filter(n => n.client_id === client_id) || [];
    const clientMotivation = motivationAssessments?.filter(m => m.client_id === client_id) || [];
    const clientIncidents = incidents?.filter(i => i.client_id === client_id) || [];
    const clientSessions = sessionContexts?.filter(s => s.client_id === client_id) || [];
    const clientGoals = goals?.filter(g => g.client_id === client_id) || [];
    const activeBSP = bsps?.find(b => b.client_id === client_id && b.is_latest_version && b.status === 'active');
    const clientRiskAlerts = riskAlerts?.filter(r => r.client_id === client_id) || [];

    // Prepare analysis data
    const analysisData = {
      client_profile: {
        name: client.full_name,
        ndis_number: client.ndis_number,
        risk_level: client.risk_level,
        service_type: client.service_type,
        funding_utilization: client.funding_allocated ? ((client.funding_utilised || 0) / client.funding_allocated * 100).toFixed(1) : 'N/A'
      },
      engagement_metrics: {
        recent_case_notes: clientCaseNotes.slice(-10).length,
        session_frequency: clientSessions.slice(-30).length,
        plan_status: activeBSP ? 'active' : 'no_active_plan'
      },
      motivation_profile: clientMotivation[0] ? {
        primary: clientMotivation[0].primary_motivation,
        sensory_score: clientMotivation[0].sensory_needs_score,
        escape_score: clientMotivation[0].escape_avoidance_score,
        attention_score: clientMotivation[0].attention_score
      } : null,
      incident_history: {
        total_incidents_90d: clientIncidents.filter(i => {
          const incDate = new Date(i.incident_date);
          const ninetyDaysAgo = new Date();
          ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
          return incDate >= ninetyDaysAgo;
        }).length,
        recent_incidents: clientIncidents.slice(-5).map(i => ({ date: i.incident_date, type: i.incident_type }))
      },
      goal_progress: {
        total_goals: clientGoals.length,
        in_progress: clientGoals.filter(g => g.status === 'in_progress').length,
        at_risk: clientGoals.filter(g => g.status === 'at_risk').length,
        not_started: clientGoals.filter(g => g.status === 'not_started').length
      },
      active_risk_alerts: clientRiskAlerts.length,
      recent_session_notes: clientCaseNotes.slice(-3).map(n => n.progress_notes || 'No notes')
    };

    const prompt = `
Analyze client risk profile and provide predictive risk assessment for NDIS compliance and practice management.

CLIENT DATA:
${JSON.stringify(analysisData, null, 2)}

ANALYSIS REQUIREMENTS:
Assess the following risk dimensions:
1. Disengagement Risk: Client may withdraw from services, miss appointments, reduce participation
2. Crisis Risk: Potential for escalation, safety incidents, or acute behavioral incidents
3. Compliance Risk: Risk of the organization breaching NDIS standards or record-keeping
4. Plan Adherence Risk: Risk that client won't follow agreed support plan

Provide structured risk analysis in JSON:
{
  "overall_risk_level": "critical|high|medium|low",
  "overall_risk_score": 0-100,
  "disengagement_risk": 0-100,
  "disengagement_indicators": ["indicator1", "indicator2"],
  "crisis_risk": 0-100,
  "crisis_indicators": ["indicator1", "indicator2"],
  "compliance_risk": 0-100,
  "compliance_risk_factors": ["factor1", "factor2"],
  "plan_adherence_risk": 0-100,
  "trend_direction": "improving|stable|declining",
  "contributing_factors": "summary of key drivers",
  "recommended_actions": [
    "action1 - immediate or short-term",
    "action2 - monitoring or escalation step"
  ]
}

CRITICAL GUARDRAILS:
- Consider recent incident history heavily in crisis assessment
- Low engagement (few case notes, sparse sessions) raises disengagement risk
- Goals marked 'at_risk' or 'not_started' elevate overall risk
- Active risk alerts should trigger compliance risk concerns
- Assess based on objective data, not assumptions
`;

    const riskAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          overall_risk_level: { type: 'string' },
          overall_risk_score: { type: 'number' },
          disengagement_risk: { type: 'number' },
          disengagement_indicators: { type: 'array', items: { type: 'string' } },
          crisis_risk: { type: 'number' },
          crisis_indicators: { type: 'array', items: { type: 'string' } },
          compliance_risk: { type: 'number' },
          compliance_risk_factors: { type: 'array', items: { type: 'string' } },
          plan_adherence_risk: { type: 'number' },
          trend_direction: { type: 'string' },
          contributing_factors: { type: 'string' },
          recommended_actions: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    // Create or update risk profile
    const existingProfiles = await base44.entities.ClientRiskProfile.filter({ client_id });
    let riskProfile;

    if (existingProfiles?.length > 0) {
      // Update existing
      riskProfile = await base44.entities.ClientRiskProfile.update(existingProfiles[0].id, {
        ...riskAnalysis,
        client_id,
        client_name: client.full_name,
        analysis_date: new Date().toISOString(),
        next_review_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        review_frequency: 'monthly'
      });
    } else {
      riskProfile = await base44.entities.ClientRiskProfile.create({
        ...riskAnalysis,
        client_id,
        client_name: client.full_name,
        analysis_date: new Date().toISOString(),
        next_review_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        review_frequency: 'monthly'
      });
    }

    return Response.json({
      success: true,
      client_id,
      client_name: client.full_name,
      risk_profile: riskProfile
    });
  } catch (error) {
    console.error('Risk analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});