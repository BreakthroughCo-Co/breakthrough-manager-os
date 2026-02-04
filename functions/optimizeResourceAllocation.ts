import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Gather comprehensive resource data
    const [practitioners, appointments, clients, billingRecords] = await Promise.all([
      base44.asServiceRole.entities.Practitioner.filter({ status: 'active' }),
      base44.asServiceRole.entities.Appointment.list('-appointment_date', 500),
      base44.asServiceRole.entities.Client.filter({ status: 'active' }),
      base44.asServiceRole.entities.BillingRecord.list('-service_date', 200)
    ]);

    // Calculate practitioner metrics
    const practitionerMetrics = practitioners.map(prac => {
      const pracAppointments = appointments.filter(a => a.practitioner_id === prac.id);
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);
      const recentAppointments = pracAppointments.filter(a => 
        new Date(a.appointment_date) >= last30Days
      );
      const activeClients = [...new Set(pracAppointments.map(a => a.client_id))].length;
      const utilizationRate = recentAppointments.length / 20; // Assuming ~20 slots/month capacity

      return {
        practitioner_id: prac.id,
        practitioner_name: prac.full_name,
        role: prac.role,
        active_caseload: activeClients,
        appointments_last_30_days: recentAppointments.length,
        utilization_rate: Math.round(utilizationRate * 100),
        total_appointments: pracAppointments.length
      };
    });

    // Service utilization analysis
    const serviceTypes = {};
    billingRecords.forEach(record => {
      const service = record.service_type || 'Unknown';
      if (!serviceTypes[service]) {
        serviceTypes[service] = { count: 0, revenue: 0 };
      }
      serviceTypes[service].count++;
      serviceTypes[service].revenue += record.amount || 0;
    });

    const prompt = `
You are a workforce optimization specialist analyzing resource allocation for an NDIS provider.

PRACTITIONER METRICS:
${practitionerMetrics.map(p => 
  `- ${p.practitioner_name} (${p.role}): ${p.active_caseload} clients, ${p.utilization_rate}% utilization, ${p.appointments_last_30_days} appointments/month`
).join('\n')}

SERVICE UTILIZATION:
${Object.entries(serviceTypes).map(([service, data]) => 
  `- ${service}: ${data.count} instances, $${data.revenue.toFixed(2)} revenue`
).join('\n')}

TOTAL ACTIVE CLIENTS: ${clients.length}
TOTAL ACTIVE PRACTITIONERS: ${practitioners.length}

Analyze this data and provide:
1. WORKLOAD BALANCE ASSESSMENT: Identify over/under-utilized practitioners
2. SCHEDULING CONFLICTS: Predict potential capacity bottlenecks
3. RESOURCE REALLOCATION: Suggest client redistribution for optimal balance
4. UNDERUTILIZED SERVICES: Identify service gaps or underperformance
5. EFFICIENCY OPPORTUNITIES: Strategic recommendations to maximize utilization
6. RISK ALERTS: Practitioners at risk of burnout or clients at risk of service gaps

Use evidence-based workforce optimization principles and NDIS service delivery standards.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          workload_balance: {
            type: "array",
            items: {
              type: "object",
              properties: {
                practitioner_name: { type: "string" },
                status: { type: "string" },
                caseload: { type: "number" },
                utilization: { type: "number" },
                recommendation: { type: "string" }
              }
            }
          },
          scheduling_conflicts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                conflict_type: { type: "string" },
                affected_practitioners: { type: "array", items: { type: "string" } },
                severity: { type: "string" },
                mitigation: { type: "string" }
              }
            }
          },
          reallocation_suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                from_practitioner: { type: "string" },
                to_practitioner: { type: "string" },
                client_count: { type: "number" },
                rationale: { type: "string" },
                expected_impact: { type: "string" }
              }
            }
          },
          underutilized_services: {
            type: "array",
            items: {
              type: "object",
              properties: {
                service_type: { type: "string" },
                current_utilization: { type: "string" },
                opportunity: { type: "string" },
                recommended_action: { type: "string" }
              }
            }
          },
          efficiency_recommendations: {
            type: "array",
            items: {
              type: "string"
            }
          },
          risk_alerts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                risk_type: { type: "string" },
                entity: { type: "string" },
                severity: { type: "string" },
                action_required: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      analysis: aiResponse,
      practitioner_metrics: practitionerMetrics,
      service_utilization: serviceTypes,
      analyzed_at: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});