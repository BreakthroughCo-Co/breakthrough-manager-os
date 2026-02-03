import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_id } = await req.json();

    // Fetch comprehensive client data
    const [
      client,
      riskAlerts,
      incidents,
      caseNotes,
      communications,
      bsps,
      breaches,
      riskAssessment
    ] = await Promise.all([
      base44.entities.Client.filter({ id: client_id }).then(c => c[0]),
      base44.entities.RiskAlert.filter({ client_id }),
      base44.entities.Incident.filter({ client_id }),
      base44.entities.CaseNote.filter({ client_id }),
      base44.entities.ClientCommunication.filter({ client_id }),
      base44.entities.BehaviourSupportPlan.filter({ client_id }),
      base44.entities.ComplianceBreach.filter({ related_entity_id: client_id }),
      base44.entities.RiskAssessment.filter({ client_id }).then(r => r[0]),
    ]);

    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    // Analyze incident patterns
    const last90Days = new Date();
    last90Days.setDate(last90Days.getDate() - 90);
    
    const recentIncidents = incidents.filter(i => new Date(i.incident_date) > last90Days);
    const incidentCategories = [...new Set(recentIncidents.map(i => i.category))];
    const highSeverityIncidents = recentIncidents.filter(i => 
      i.severity === 'high' || i.severity === 'critical'
    );
    
    // Analyze risk patterns
    const activeAlerts = riskAlerts.filter(a => a.status === 'active' || a.status === 'acknowledged');
    const riskFactors = activeAlerts.flatMap(a => {
      try {
        return JSON.parse(a.contributing_factors || '[]');
      } catch {
        return [];
      }
    });

    // Analyze case note patterns
    const recentNotes = caseNotes.filter(n => new Date(n.session_date) > last90Days);
    const progressRatings = recentNotes.map(n => n.progress_rating).filter(Boolean);
    const progressTrend = progressRatings.length > 0 
      ? progressRatings.filter(r => r === 'progressing' || r === 'achieved').length / progressRatings.length * 100
      : 0;

    // Active BSP goals
    const activeBSP = bsps.find(b => b.status === 'active');
    
    // Communication patterns
    const recentComms = communications.filter(c => new Date(c.sent_date) > last90Days);
    const responseRate = recentComms.filter(c => c.recipient_response).length / Math.max(recentComms.length, 1) * 100;

    // Compliance concerns
    const activeBreaches = breaches.filter(b => 
      b.status !== 'closed' && b.status !== 'remediated'
    );

    const contextData = `
CLIENT SUPPORT PLAN ANALYSIS
Name: ${client.full_name}
NDIS Number: ${client.ndis_number}
Service Type: ${client.service_type}
Current Risk Level: ${client.risk_level || 'Not assessed'}

RISK ASSESSMENT:
- Current Risk Score: ${riskAssessment?.overall_risk_score || 'N/A'}
- Active Alerts: ${activeAlerts.length}
- Risk Factors: ${[...new Set(riskFactors)].join(', ') || 'None identified'}

INCIDENT HISTORY (Last 90 Days):
- Total Incidents: ${recentIncidents.length}
- High Severity: ${highSeverityIncidents.length}
- Categories: ${incidentCategories.join(', ') || 'None'}
- Restrictive Practices Used: ${recentIncidents.filter(i => i.restrictive_practice_used).length}

PROGRESS INDICATORS:
- Case Notes (Last 90 Days): ${recentNotes.length}
- Progress Trend: ${progressTrend.toFixed(1)}% positive ratings
- Current Progress Ratings: ${progressRatings.slice(-5).join(', ') || 'No recent data'}

ACTIVE SUPPORT PLAN:
${activeBSP ? `
- BSP Version: ${activeBSP.plan_version}
- Review Date: ${activeBSP.review_date}
- Status: ${activeBSP.status}
- Target Behaviours: ${activeBSP.behaviour_summary?.substring(0, 300)}
` : 'No active BSP on file'}

COMMUNICATION PATTERNS:
- Recent Communications: ${recentComms.length}
- Response Rate: ${responseRate.toFixed(0)}%
- Average Engagement: ${recentComms.filter(c => c.delivery_status === 'delivered').length} delivered

COMPLIANCE CONCERNS:
- Active Breaches: ${activeBreaches.length}
- Types: ${[...new Set(activeBreaches.map(b => b.breach_type))].join(', ') || 'None'}

Based on this comprehensive analysis, provide personalized recommendations.`;

    const aiRecommendations = await base44.integrations.Core.InvokeLLM({
      prompt: `${contextData}\n\nProvide a comprehensive personalized support plan with evidence-based behavioral strategies, specific interventions, and communication approaches tailored to this client's current situation.`,
      response_json_schema: {
        type: "object",
        properties: {
          executive_summary: { type: "string" },
          priority_focus_areas: {
            type: "array",
            items: {
              type: "object",
              properties: {
                area: { type: "string" },
                rationale: { type: "string" },
                urgency: { type: "string" }
              }
            }
          },
          behavioral_strategies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                strategy_name: { type: "string" },
                description: { type: "string" },
                evidence_base: { type: "string" },
                implementation_steps: { type: "array", items: { type: "string" } },
                expected_outcomes: { type: "string" },
                monitoring_indicators: { type: "array", items: { type: "string" } }
              }
            }
          },
          specific_interventions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                intervention_type: { type: "string" },
                target_behavior: { type: "string" },
                frequency: { type: "string" },
                responsible_practitioner_role: { type: "string" },
                success_criteria: { type: "string" }
              }
            }
          },
          communication_approach: {
            type: "object",
            properties: {
              preferred_style: { type: "string" },
              frequency_recommendation: { type: "string" },
              key_messaging_themes: { type: "array", items: { type: "string" } },
              family_involvement_strategy: { type: "string" },
              escalation_protocols: { type: "string" }
            }
          },
          risk_mitigation: {
            type: "array",
            items: {
              type: "object",
              properties: {
                identified_risk: { type: "string" },
                mitigation_strategy: { type: "string" },
                monitoring_frequency: { type: "string" }
              }
            }
          },
          environmental_modifications: {
            type: "array",
            items: { type: "string" }
          },
          skill_building_priorities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                skill_area: { type: "string" },
                current_level: { type: "string" },
                target_level: { type: "string" },
                teaching_approach: { type: "string" }
              }
            }
          },
          review_schedule: {
            type: "object",
            properties: {
              suggested_review_frequency: { type: "string" },
              key_review_points: { type: "array", items: { type: "string" } },
              data_collection_requirements: { type: "array", items: { type: "string" } }
            }
          },
          ndis_alignment: {
            type: "object",
            properties: {
              plan_alignment_notes: { type: "string" },
              funding_considerations: { type: "string" },
              reporting_requirements: { type: "string" }
            }
          }
        }
      }
    });

    return Response.json({
      client_id,
      client_name: client.full_name,
      recommendations: aiRecommendations,
      context_metrics: {
        recent_incidents: recentIncidents.length,
        high_severity_incidents: highSeverityIncidents.length,
        progress_trend: progressTrend.toFixed(1) + '%',
        active_alerts: activeAlerts.length,
        active_breaches: activeBreaches.length,
        response_rate: responseRate.toFixed(0) + '%',
      },
      generated_date: new Date().toISOString(),
      generated_by: user.email,
    });
  } catch (error) {
    console.error('Support plan generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});