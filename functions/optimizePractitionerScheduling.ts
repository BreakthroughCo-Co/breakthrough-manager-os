import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { optimization_period_weeks = 4 } = await req.json();

        const [practitioners, clients, appointments, performanceReports, clientGoals, 
               billingRecords] = await Promise.all([
            base44.asServiceRole.entities.Practitioner.filter({ status: 'active' }),
            base44.asServiceRole.entities.Client.filter({ status: 'active' }),
            base44.asServiceRole.entities.Appointment.list('-created_date', 300),
            base44.asServiceRole.entities.MonthlyPerformanceReport.list('-created_date', 50),
            base44.asServiceRole.entities.ClientGoal.filter({ status: 'in_progress' }),
            base44.asServiceRole.entities.BillingRecord.list('-created_date', 200)
        ]);

        // Build practitioner profiles with workload data
        const practitionerProfiles = practitioners.map(p => {
            const assignedClients = clients.filter(c => c.assigned_practitioner_id === p.id);
            const recentAppointments = appointments.filter(a => a.practitioner_id === p.id);
            const recentPerformance = performanceReports.find(pr => pr.practitioner_id === p.id);
            const recentBilling = billingRecords.filter(b => b.practitioner_id === p.id);

            const totalBillableHours = recentBilling.reduce((sum, b) => sum + (b.duration_hours || 0), 0);

            return {
                id: p.id,
                name: p.full_name,
                role: p.role,
                current_caseload: p.current_caseload || 0,
                capacity: p.caseload_capacity || 0,
                utilization: p.caseload_capacity ? ((p.current_caseload || 0) / p.caseload_capacity * 100) : 0,
                assigned_clients: assignedClients.length,
                recent_appointments: recentAppointments.length,
                billable_hours_target: p.billable_hours_target,
                billable_hours_actual: totalBillableHours,
                performance_rating: recentPerformance?.overall_rating || null
            };
        });

        const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `You are a workforce optimization specialist for an NDIS provider. Optimize practitioner scheduling to maximize service delivery, practitioner wellbeing, and client outcomes.

Optimization Period: ${optimization_period_weeks} weeks

Practitioner Workload Analysis:
${JSON.stringify(practitionerProfiles, null, 2)}

Active Clients: ${clients.length}
Active Goals Requiring Support: ${clientGoals.length}
Recent Appointments: ${appointments.length}

Analyze and provide:
1. Current workload distribution assessment
2. Rebalancing recommendations (which practitioners are over/under-utilized)
3. Specific client reassignment suggestions
4. Scheduling optimization strategies
5. Risk flags (burnout, quality concerns, capacity issues)
6. Actionable next steps for management`,
            response_json_schema: {
                type: "object",
                properties: {
                    optimization_summary: { type: "string" },
                    workload_analysis: {
                        type: "object",
                        properties: {
                            overutilized_practitioners: { type: "array", items: { type: "string" } },
                            underutilized_practitioners: { type: "array", items: { type: "string" } },
                            balanced_practitioners: { type: "array", items: { type: "string" } }
                        }
                    },
                    rebalancing_recommendations: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                practitioner_name: { type: "string" },
                                current_utilization: { type: "number" },
                                recommended_action: { type: "string" },
                                expected_impact: { type: "string" }
                            }
                        }
                    },
                    client_reassignments: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                client_name: { type: "string" },
                                from_practitioner: { type: "string" },
                                to_practitioner: { type: "string" },
                                rationale: { type: "string" },
                                priority: { type: "string" }
                            }
                        }
                    },
                    scheduling_strategies: {
                        type: "array",
                        items: { type: "string" }
                    },
                    risk_flags: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                risk_type: { type: "string" },
                                affected_practitioners: { type: "array", items: { type: "string" } },
                                severity: { type: "string" },
                                mitigation: { type: "string" }
                            }
                        }
                    },
                    action_plan: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                action: { type: "string" },
                                timeline: { type: "string" },
                                owner: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        return Response.json({
            success: true,
            optimization: response,
            practitioner_summary: practitionerProfiles,
            generated_date: new Date().toISOString()
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});