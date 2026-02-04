import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { role, focus_areas = [], time_period = 'last_30_days' } = await req.json();

    const [clients, practitioners, appointments, goals, incidents, feedback, billing, compliance] = await Promise.all([
      base44.asServiceRole.entities.Client.list(),
      base44.asServiceRole.entities.Practitioner.list(),
      base44.asServiceRole.entities.Appointment.list('-appointment_date', 500),
      base44.asServiceRole.entities.ClientGoal.list(),
      base44.asServiceRole.entities.Incident.list('-incident_date', 200),
      base44.asServiceRole.entities.ClientFeedback.list('-feedback_date', 200),
      base44.asServiceRole.entities.BillingRecord.list('-service_date', 500),
      base44.asServiceRole.entities.ComplianceItem.filter({ status: 'overdue' })
    ]);

    const now = new Date();
    const periodStart = new Date();
    periodStart.setDate(now.getDate() - (time_period === 'last_7_days' ? 7 : time_period === 'last_90_days' ? 90 : 30));

    const periodAppointments = appointments.filter(a => new Date(a.appointment_date) >= periodStart);
    const periodIncidents = incidents.filter(i => new Date(i.incident_date) >= periodStart);
    const periodFeedback = feedback.filter(f => new Date(f.feedback_date) >= periodStart);
    const periodBilling = billing.filter(b => new Date(b.service_date) >= periodStart);

    const activeClients = clients.filter(c => c.status === 'active').length;
    const activePractitioners = practitioners.filter(p => p.employment_status === 'active').length;
    const avgSatisfaction = periodFeedback.length > 0 
      ? (periodFeedback.reduce((sum, f) => sum + (f.overall_satisfaction || 0), 0) / periodFeedback.length).toFixed(1)
      : 0;

    const totalRevenue = periodBilling.reduce((sum, b) => sum + (b.amount || 0), 0);
    const goalAchievement = goals.length > 0
      ? ((goals.filter(g => g.status === 'achieved').length / goals.length) * 100).toFixed(1)
      : 0;

    const criticalIncidents = periodIncidents.filter(i => i.severity === 'critical').length;
    const complianceGaps = compliance.length;

    const prompt = `
You are designing an AI-generated dashboard for an NDIS Practice Manager.

ROLE: ${role}
FOCUS AREAS: ${focus_areas.join(', ') || 'General oversight'}
TIME PERIOD: ${time_period}

AGGREGATED METRICS:
- Active Clients: ${activeClients}
- Active Practitioners: ${activePractitioners}
- Period Appointments: ${periodAppointments.length}
- Goal Achievement Rate: ${goalAchievement}%
- Client Satisfaction: ${avgSatisfaction}/5
- Period Revenue: $${totalRevenue.toFixed(2)}
- Critical Incidents: ${criticalIncidents}
- Compliance Gaps: ${complianceGaps}

PRACTITIONER PERFORMANCE:
${practitioners.slice(0, 5).map(p => 
  `- ${p.full_name}: ${p.caseload_current || 0}/${p.caseload_capacity || 20} caseload`
).join('\n')}

Generate a customizable dashboard configuration including:
1. RECOMMENDED KPI WIDGETS: Most relevant metrics for this role
2. PRIORITY ALERTS: Critical items requiring immediate attention
3. PERFORMANCE INDICATORS: Key operational health signals
4. RISK SIGNALS: Early warning indicators
5. ACTIONABLE INSIGHTS: Data-driven recommendations
6. VISUALIZATION RECOMMENDATIONS: Best chart types for each metric

Optimize for managerial situational awareness and decision-making velocity.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          dashboard_config: {
            type: "object",
            properties: {
              role: { type: "string" },
              layout_recommendation: { type: "string" },
              refresh_interval: { type: "string" }
            }
          },
          recommended_widgets: {
            type: "array",
            items: {
              type: "object",
              properties: {
                widget_id: { type: "string" },
                widget_type: { type: "string" },
                title: { type: "string" },
                priority: { type: "string" },
                data_source: { type: "string" },
                visualization_type: { type: "string" },
                size: { type: "string" },
                position_suggestion: { type: "string" }
              }
            }
          },
          priority_alerts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                alert_type: { type: "string" },
                severity: { type: "string" },
                metric: { type: "string" },
                current_value: { type: "string" },
                threshold: { type: "string" },
                recommendation: { type: "string" }
              }
            }
          },
          kpi_targets: {
            type: "object",
            properties: {
              client_satisfaction_target: { type: "number" },
              goal_achievement_target: { type: "number" },
              compliance_score_target: { type: "number" },
              revenue_target: { type: "number" }
            }
          },
          actionable_insights: {
            type: "array",
            items: {
              type: "object",
              properties: {
                insight: { type: "string" },
                supporting_data: { type: "string" },
                recommended_action: { type: "string" },
                impact_level: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      dashboard: aiResponse,
      current_metrics: {
        active_clients: activeClients,
        active_practitioners: activePractitioners,
        period_appointments: periodAppointments.length,
        goal_achievement: goalAchievement,
        client_satisfaction: avgSatisfaction
      },
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});