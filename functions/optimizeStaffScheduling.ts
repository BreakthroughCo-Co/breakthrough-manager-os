import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { start_date, end_date, consider_travel = true } = await req.json();

    const [practitioners, clients, appointments] = await Promise.all([
      base44.entities.Practitioner.filter({ status: 'active' }),
      base44.entities.Client.filter({ status: 'active' }),
      base44.entities.Appointment.list(),
    ]);

    // Analyze workload distribution
    const workloadAnalysis = practitioners.map(p => {
      const practAppts = appointments.filter(a => 
        a.practitioner_id === p.id &&
        new Date(a.appointment_date) >= new Date(start_date) &&
        new Date(a.appointment_date) <= new Date(end_date)
      );

      return {
        practitioner_id: p.id,
        practitioner_name: p.full_name,
        role: p.role,
        current_caseload: p.current_caseload || 0,
        capacity: p.caseload_capacity || 0,
        scheduled_appointments: practAppts.length,
        utilization_rate: (p.current_caseload || 0) / Math.max(p.caseload_capacity || 1, 1) * 100,
      };
    });

    // Client scheduling needs
    const clientNeeds = clients.map(c => ({
      client_id: c.id,
      client_name: c.full_name,
      assigned_practitioner: c.assigned_practitioner_id,
      service_type: c.service_type,
      risk_level: c.risk_level,
    }));

    const contextData = `
STAFF SCHEDULING OPTIMIZATION
Period: ${start_date} to ${end_date}

PRACTITIONER WORKLOAD:
${workloadAnalysis.map(w => 
  `- ${w.practitioner_name} (${w.role}): ${w.current_caseload}/${w.capacity} clients (${w.utilization_rate.toFixed(0)}% utilized), ${w.scheduled_appointments} scheduled appointments`
).join('\n')}

CLIENT DISTRIBUTION:
- Total Active Clients: ${clients.length}
- High Risk Clients: ${clients.filter(c => c.risk_level === 'high').length}
- Service Types: ${[...new Set(clients.map(c => c.service_type))].join(', ')}

OPTIMIZATION GOALS:
1. Balance workload across practitioners
2. Minimize travel time ${consider_travel ? '(high priority)' : '(not prioritized)'}
3. Match practitioner expertise with client needs
4. Respect risk-level priorities (high-risk clients get priority slots)
5. Maximize practitioner utilization without overload

Provide scheduling recommendations.`;

    const optimization = await base44.integrations.Core.InvokeLLM({
      prompt: `${contextData}\n\nGenerate AI-powered scheduling optimization recommendations.`,
      response_json_schema: {
        type: "object",
        properties: {
          workload_rebalancing: {
            type: "array",
            items: {
              type: "object",
              properties: {
                from_practitioner: { type: "string" },
                to_practitioner: { type: "string" },
                clients_to_reassign: { type: "array", items: { type: "string" } },
                rationale: { type: "string" }
              }
            }
          },
          scheduling_recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                practitioner: { type: "string" },
                optimal_days: { type: "array", items: { type: "string" } },
                suggested_slots: { type: "array", items: { type: "string" } },
                travel_considerations: { type: "string" }
              }
            }
          },
          priority_actions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string" },
                priority: { type: "string" },
                expected_benefit: { type: "string" }
              }
            }
          },
          efficiency_gains: {
            type: "object",
            properties: {
              projected_utilization_improvement: { type: "string" },
              travel_time_reduction: { type: "string" },
              workload_balance_score: { type: "string" }
            }
          }
        }
      }
    });

    return Response.json({
      optimization,
      workload_analysis: workloadAnalysis,
      period: { start_date, end_date },
      generated_date: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Scheduling optimization error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});