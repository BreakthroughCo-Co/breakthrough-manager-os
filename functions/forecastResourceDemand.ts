import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { forecast_period_months = 3 } = await req.json();

        // Gather historical operational data
        const [clients, practitioners, appointments, billingRecords, clientIntakeRequests, 
               serviceAgreements, programs] = await Promise.all([
            base44.asServiceRole.entities.Client.list(),
            base44.asServiceRole.entities.Practitioner.list(),
            base44.asServiceRole.entities.Appointment.list('-created_date', 500),
            base44.asServiceRole.entities.BillingRecord.list('-created_date', 500),
            base44.asServiceRole.entities.ClientIntakeRequest.list('-created_date', 100),
            base44.asServiceRole.entities.ServiceAgreement.filter({ status: 'active' }),
            base44.asServiceRole.entities.Program.filter({ status: 'active' })
        ]);

        // Prepare historical trends
        const activeClients = clients.filter(c => c.status === 'active');
        const activePractitioners = practitioners.filter(p => p.status === 'active');
        const pendingIntakes = clientIntakeRequests.filter(r => r.status === 'pending' || r.status === 'in_progress');

        // Calculate current utilization
        const totalCapacity = activePractitioners.reduce((sum, p) => sum + (p.caseload_capacity || 0), 0);
        const totalCaseload = activePractitioners.reduce((sum, p) => sum + (p.current_caseload || 0), 0);
        const currentUtilization = totalCapacity > 0 ? (totalCaseload / totalCapacity) * 100 : 0;

        // Analyze billing trends (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const recentBilling = billingRecords.filter(b => 
            new Date(b.service_date) >= sixMonthsAgo
        );

        const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `You are a resource planning specialist for an NDIS provider. Analyze historical data and forecast future service demand.

Current Operational State:
- Active Clients: ${activeClients.length}
- Active Practitioners: ${activePractitioners.length}
- Total Practitioner Capacity: ${totalCapacity} clients
- Current Caseload: ${totalCaseload} clients
- Current Utilization: ${currentUtilization.toFixed(1)}%
- Pending Intake Requests: ${pendingIntakes.length}
- Active Programs: ${programs.length}

Historical Data (Last 6 Months):
- Total Appointments: ${appointments.length}
- Billing Records: ${recentBilling.length}
- Service Types: ${[...new Set(recentBilling.map(b => b.service_type))].join(', ')}

Client Intake Trends (Last 100 requests):
${JSON.stringify(clientIntakeRequests.slice(0, 10).map(r => ({ 
    date: r.created_date, 
    service_type: r.service_type_requested,
    status: r.status 
})), null, 2)}

Forecast Period: ${forecast_period_months} months

Provide:
1. Demand forecast by service type
2. Predicted resource shortages or surpluses
3. Optimal practitioner hiring/allocation recommendations
4. Risk assessment for capacity issues
5. Specific action recommendations with timelines`,
            response_json_schema: {
                type: "object",
                properties: {
                    forecast_summary: { type: "string" },
                    forecasted_demand: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                service_type: { type: "string" },
                                current_monthly_volume: { type: "number" },
                                forecasted_monthly_volume: { type: "number" },
                                growth_rate: { type: "number" },
                                confidence: { type: "string" }
                            }
                        }
                    },
                    resource_gaps: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                resource_type: { type: "string" },
                                gap_severity: { type: "string" },
                                projected_shortage: { type: "string" },
                                timeline: { type: "string" }
                            }
                        }
                    },
                    hiring_recommendations: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                role: { type: "string" },
                                quantity: { type: "number" },
                                urgency: { type: "string" },
                                rationale: { type: "string" }
                            }
                        }
                    },
                    capacity_risk_assessment: {
                        type: "object",
                        properties: {
                            overall_risk_level: { type: "string" },
                            critical_areas: { type: "array", items: { type: "string" } },
                            mitigation_strategies: { type: "array", items: { type: "string" } }
                        }
                    },
                    action_recommendations: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                action: { type: "string" },
                                priority: { type: "string" },
                                timeline: { type: "string" },
                                expected_impact: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        return Response.json({
            success: true,
            forecast: response,
            current_state: {
                active_clients: activeClients.length,
                active_practitioners: activePractitioners.length,
                utilization_rate: currentUtilization,
                pending_intakes: pendingIntakes.length
            },
            generated_date: new Date().toISOString()
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});