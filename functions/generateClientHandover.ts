import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_id } = await req.json();

    if (!client_id) {
      return Response.json({ error: 'client_id is required' }, { status: 400 });
    }

    // Gather comprehensive client data
    const [
      client,
      goals,
      riskProfiles,
      caseNotes,
      appointments,
      contacts,
      bsps,
      incidents
    ] = await Promise.all([
      base44.entities.Client.get(client_id),
      base44.entities.ClientGoal.filter({ client_id }).catch(() => []),
      base44.entities.ClientRiskProfile.filter({ client_id }, '-analysis_date', 3).catch(() => []),
      base44.entities.CaseNote.filter({ client_id }, '-created_date', 10).catch(() => []),
      base44.entities.Appointment.filter({ client_id }, '-appointment_date', 10).catch(() => []),
      base44.entities.ClientContact.filter({ client_id }).catch(() => []),
      base44.entities.BehaviourSupportPlan.filter({ client_id }, '-created_date', 1).catch(() => []),
      base44.entities.Incident.filter({ client_id }, '-incident_date', 5).catch(() => [])
    ]);

    // Prepare context for AI
    const context = {
      client_overview: {
        name: client.full_name,
        ndis_number: client.ndis_number,
        service_type: client.service_type,
        status: client.status,
        date_of_birth: client.date_of_birth,
        plan_dates: {
          start: client.plan_start_date,
          end: client.plan_end_date
        },
        funding: {
          allocated: client.funding_allocated,
          utilised: client.funding_utilised
        }
      },
      active_goals: goals.filter(g => ['in_progress', 'on_track'].includes(g.status)).map(g => ({
        description: g.goal_description,
        progress: g.current_progress,
        status: g.status,
        ndis_domain: g.ndis_domain
      })),
      risk_profile: riskProfiles[0] ? {
        overall_level: riskProfiles[0].overall_risk_level,
        risk_score: riskProfiles[0].overall_risk_score,
        trend: riskProfiles[0].trend_direction,
        disengagement_risk: riskProfiles[0].disengagement_risk,
        key_indicators: riskProfiles[0].disengagement_indicators
      } : null,
      recent_progress: caseNotes.slice(0, 5).map(n => ({
        date: n.created_date,
        summary: n.session_summary || n.observations
      })),
      support_network: contacts.map(c => ({
        name: c.contact_name,
        relationship: c.relationship,
        type: c.contact_type,
        primary_contact: c.is_primary_contact
      })),
      active_bsp: bsps[0] ? {
        status: bsps[0].status,
        target_behaviours: bsps[0].target_behaviours,
        key_interventions: bsps[0].intervention_strategies
      } : null,
      recent_incidents: incidents.map(i => ({
        date: i.incident_date,
        severity: i.severity,
        description: i.description
      }))
    };

    // Generate AI handover summary
    const handoverSummary = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a comprehensive clinical handover summary for a new practitioner taking over this NDIS client's care.

Client Context:
${JSON.stringify(context, null, 2)}

Create a structured handover document covering:
1. Client Overview & Background
2. Current Goals & Progress
3. Risk Assessment & Monitoring Needs
4. Key Support Strategies & Interventions
5. Support Network & Communication Preferences
6. Critical Information (medical, behavioral, safeguarding concerns)
7. Immediate Actions Required
8. Recommended First Session Priorities

Format as a clear, professional clinical handover that ensures continuity of care and compliance with NDIS practice standards. Focus on actionable insights for the incoming practitioner.`,
      add_context_from_internet: false
    });

    return Response.json({
      success: true,
      client_name: client.full_name,
      handover_summary: handoverSummary,
      data_sources_included: {
        goals: goals.length,
        risk_profiles: riskProfiles.length,
        case_notes: caseNotes.length,
        contacts: contacts.length,
        incidents: incidents.length
      }
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});