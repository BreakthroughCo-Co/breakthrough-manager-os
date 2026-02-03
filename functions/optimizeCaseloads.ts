import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Intelligent Workload Balancing
 * Recommends optimal client caseload distribution across practitioners
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all practitioners and clients
    const [practitioners, clients, billingRecords, incidents] = await Promise.all([
      base44.asServiceRole.entities.Practitioner.list(),
      base44.asServiceRole.entities.Client.list(),
      base44.asServiceRole.entities.BillingRecord.list('-service_date', 200),
      base44.asServiceRole.entities.Incident.list('-incident_date', 100)
    ]);

    // Analyze current workload distribution
    const practitionerWorkload = practitioners.map(p => {
      const assignedClients = clients.filter(c => c.assigned_practitioner_id === p.id);
      const pBilling = billingRecords.filter(b => b.practitioner_id === p.id);
      const pIncidents = incidents.filter(i => i.reported_by === p.email);

      const billableHours = pBilling.reduce((sum, b) => sum + (b.duration_hours || 0), 0);
      const avgHoursPerClient = assignedClients.length > 0 
        ? (billableHours / assignedClients.length).toFixed(1)
        : 0;

      const utilizationRatio = p.billable_hours_target 
        ? ((billableHours / p.billable_hours_target) * 100).toFixed(1)
        : 0;

      return {
        practitioner_id: p.id,
        name: p.full_name,
        role: p.role,
        capacity: p.caseload_capacity || 20,
        current_caseload: assignedClients.length,
        billable_hours: parseFloat(billableHours.toFixed(1)),
        target_hours: p.billable_hours_target || 120,
        utilization_ratio: parseFloat(utilizationRatio),
        avg_hours_per_client: parseFloat(avgHoursPerClient),
        high_risk_clients: assignedClients.filter(c => c.risk_level === 'high').length,
        incidents_30d: pIncidents.filter(i => new Date(i.incident_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
        status: p.status,
        is_overloaded: assignedClients.length / (p.caseload_capacity || 20) > 0.9,
        is_underutilized: assignedClients.length / (p.caseload_capacity || 20) < 0.5
      };
    });

    // Identify unassigned high-risk clients
    const unassignedClients = clients.filter(c => !c.assigned_practitioner_id || c.assigned_practitioner_id === '');
    const unassignedHighRisk = unassignedClients.filter(c => c.risk_level === 'high');

    // Build optimization context
    const workloadContext = `
CURRENT WORKLOAD DISTRIBUTION:

${practitionerWorkload.map(pw => `
${pw.name} (${pw.role}):
- Assigned Clients: ${pw.current_caseload}/${pw.capacity}
- Utilization: ${pw.utilization_ratio}% (${pw.billable_hours}/${pw.target_hours} hours)
- High-Risk Clients: ${pw.high_risk_clients}
- Incidents (30d): ${pw.incidents_30d}
- Status: ${pw.status}
${pw.is_overloaded ? '⚠️ OVERLOADED' : pw.is_underutilized ? '📉 UNDERUTILIZED' : '✓ BALANCED'}
`).join('\n')}

UNASSIGNED CLIENTS:
- Total: ${unassignedClients.length}
- High-Risk: ${unassignedHighRisk.length}

OPTIMIZATION CONSTRAINTS:
- High-risk clients need experienced practitioners
- Workload should balance billable hours and client complexity
- Consider practitioner skills and client service types`;

    const optimization = await base44.integrations.Core.InvokeLLM({
      prompt: `${workloadContext}

Provide workload optimization recommendations:

1. **Current State Assessment** - Overall workload balance health and any critical issues
2. **Overloaded Practitioners** - Which practitioners are at risk of burnout and recommendations for relief
3. **Underutilized Capacity** - Practitioners with available capacity and suggested client matches
4. **Unassigned Client Recommendations** - Specific practitioner assignments for unassigned/high-risk clients
5. **Rebalancing Opportunities** - Specific client transfers that would improve overall balance
6. **Workload Sustainability** - Whether current distribution is sustainable long-term
7. **Action Plan** - Prioritized list of reassignments or hiring recommendations

Be specific about which practitioners should be relieved and who should take new clients.`,
      response_json_schema: {
        type: "object",
        properties: {
          overall_health: {
            type: "string",
            enum: ["healthy", "stressed", "critical"]
          },
          health_summary: { type: "string" },
          overloaded_practitioners: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                current_load: { type: "string" },
                risk_level: { type: "string" },
                recommended_relief: { type: "string" }
              }
            }
          },
          available_capacity: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                available_slots: { type: "number" },
                recommended_client_type: { type: "string" }
              }
            }
          },
          unassigned_recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                recommendation: { type: "string" },
                priority: { type: "string", enum: ["immediate", "high", "medium"] }
              }
            }
          },
          rebalancing_opportunities: { type: "array", items: { type: "string" } },
          sustainability_assessment: { type: "string" },
          action_items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string" },
                timeline: { type: "string" },
                expected_impact: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({
      analysis_date: new Date().toISOString(),
      practitioners_analyzed: practitionerWorkload.length,
      total_capacity: practitionerWorkload.reduce((sum, pw) => sum + pw.capacity, 0),
      total_assigned: practitionerWorkload.reduce((sum, pw) => sum + pw.current_caseload, 0),
      utilization_summary: practitionerWorkload,
      optimization_analysis: optimization
    });

  } catch (error) {
    console.error('Workload optimization error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});