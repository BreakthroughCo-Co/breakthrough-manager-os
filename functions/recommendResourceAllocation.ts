import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const [clients, practitioners, skills, workloadForecasts, riskProfiles, feedback] = await Promise.all([
      base44.asServiceRole.entities.Client.filter({ status: 'active' }),
      base44.asServiceRole.entities.Practitioner.filter({ employment_status: 'active' }),
      base44.asServiceRole.entities.PractitionerSkill.list(),
      base44.asServiceRole.entities.Appointment.list('-appointment_date', 500),
      base44.asServiceRole.entities.ClientRiskProfile.list('-analysis_date'),
      base44.asServiceRole.entities.ClientFeedback.list('-feedback_date', 300)
    ]);

    const practitionerMetrics = practitioners.map(p => {
      const pSkills = skills.filter(s => s.practitioner_id === p.id);
      const pFeedback = feedback.filter(f => f.practitioner_id === p.id);
      const pAppointments = workloadForecasts.filter(a => a.practitioner_id === p.id);

      const avgSatisfaction = pFeedback.length > 0
        ? pFeedback.reduce((sum, f) => sum + (f.overall_satisfaction || 0), 0) / pFeedback.length
        : 0;

      const utilizationRate = p.caseload_capacity 
        ? (p.caseload_current || 0) / p.caseload_capacity 
        : 0;

      return {
        id: p.id,
        name: p.full_name,
        role: p.role,
        caseload_current: p.caseload_current || 0,
        caseload_capacity: p.caseload_capacity || 20,
        utilization_rate: utilizationRate,
        skills: pSkills.map(s => ({ 
          skill: s.skill_name, 
          level: s.proficiency_level,
          years: s.years_experience 
        })),
        satisfaction: avgSatisfaction,
        availability_score: (1 - utilizationRate) * 100
      };
    });

    const clientNeeds = clients.map(c => {
      const risk = riskProfiles.find(r => r.client_id === c.id);
      return {
        id: c.id,
        name: c.full_name,
        service_type: c.service_type,
        risk_level: risk?.overall_risk_level || c.risk_level || 'medium',
        risk_score: risk?.overall_risk_score || 50,
        current_practitioner: c.assigned_practitioner_id,
        required_skills: [c.service_type, c.support_needs].filter(Boolean)
      };
    });

    const prompt = `
You are conducting intelligent resource allocation analysis for NDIS service delivery optimization.

PRACTITIONER CAPACITY ANALYSIS:
${practitionerMetrics.map(p => 
  `- ${p.name} (${p.role}): ${p.caseload_current}/${p.caseload_capacity} clients (${(p.utilization_rate * 100).toFixed(0)}% utilized), Satisfaction: ${p.satisfaction.toFixed(1)}/5`
).join('\n')}

CLIENT RISK DISTRIBUTION:
- High Risk: ${clientNeeds.filter(c => c.risk_level === 'high').length}
- Medium Risk: ${clientNeeds.filter(c => c.risk_level === 'medium').length}
- Low Risk: ${clientNeeds.filter(c => c.risk_level === 'low').length}

RESOURCE ALLOCATION SCENARIOS:
- Overutilized Practitioners: ${practitionerMetrics.filter(p => p.utilization_rate > 0.9).length}
- Underutilized Practitioners: ${practitionerMetrics.filter(p => p.utilization_rate < 0.6).length}
- Unassigned Clients: ${clientNeeds.filter(c => !c.current_practitioner).length}

Provide comprehensive resource allocation strategy:
1. OPTIMAL ASSIGNMENTS: Best practitioner-client matches
2. WORKLOAD REBALANCING: Move clients between practitioners
3. SKILL-BASED MATCHING: Align practitioner expertise with client needs
4. RISK DISTRIBUTION: Ensure high-risk clients have appropriate support
5. CAPACITY OPTIMIZATION: Prevent burnout, maximize utilization
6. TEAM RESOURCE SHARING: Cross-team collaboration opportunities
7. IMPLEMENTATION PRIORITY: Sequenced rollout recommendations

Optimize for service quality, practitioner sustainability, and audit compliance.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          optimal_assignments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                client_name: { type: "string" },
                recommended_practitioner: { type: "string" },
                match_score: { type: "number" },
                rationale: { type: "string" },
                expected_outcomes: { type: "array", items: { type: "string" } }
              }
            }
          },
          workload_rebalancing: {
            type: "array",
            items: {
              type: "object",
              properties: {
                from_practitioner: { type: "string" },
                to_practitioner: { type: "string" },
                clients_to_transfer: { type: "array", items: { type: "string" } },
                impact_assessment: { type: "string" },
                transition_strategy: { type: "string" }
              }
            }
          },
          capacity_optimization: {
            type: "object",
            properties: {
              overloaded_practitioners: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    practitioner: { type: "string" },
                    current_load: { type: "string" },
                    recommended_reduction: { type: "string" }
                  }
                }
              },
              underutilized_practitioners: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    practitioner: { type: "string" },
                    capacity_available: { type: "string" },
                    recommended_additions: { type: "string" }
                  }
                }
              }
            }
          },
          team_resource_sharing: {
            type: "array",
            items: {
              type: "object",
              properties: {
                opportunity: { type: "string" },
                practitioners_involved: { type: "array", items: { type: "string" } },
                benefit: { type: "string" },
                implementation: { type: "string" }
              }
            }
          },
          implementation_plan: {
            type: "object",
            properties: {
              immediate_actions: { type: "array", items: { type: "string" } },
              week_1_priorities: { type: "array", items: { type: "string" } },
              month_1_milestones: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      recommendations: aiResponse,
      context: {
        total_practitioners: practitioners.length,
        total_clients: clients.length,
        avg_utilization: (practitionerMetrics.reduce((s, p) => s + p.utilization_rate, 0) / practitionerMetrics.length * 100).toFixed(1)
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