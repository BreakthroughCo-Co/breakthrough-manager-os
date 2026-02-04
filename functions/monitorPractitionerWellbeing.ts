import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Gather comprehensive practitioner workload and wellbeing data
        const practitioners = await base44.entities.Practitioner.filter({ status: 'active' });
        const appointments = await base44.entities.Appointment.list('-created_date', 1000);
        const billingRecords = await base44.entities.BillingRecord.list('-created_date', 1000);
        const clientFeedback = await base44.entities.ClientFeedback.list('-created_date', 500);
        const performanceReports = await base44.entities.MonthlyPerformanceReport.list('-created_date', 300);
        const clients = await base44.entities.Client.list();

        // Calculate wellbeing indicators for each practitioner
        const wellbeingProfiles = practitioners.map(practitioner => {
            const assignedClients = clients.filter(c => c.assigned_practitioner_id === practitioner.id);
            const practAppointments = appointments.filter(a => a.practitioner_id === practitioner.id);
            const practBilling = billingRecords.filter(b => b.practitioner_id === practitioner.id);
            const practFeedback = clientFeedback.filter(f => f.practitioner_id === practitioner.id);
            const practReports = performanceReports.filter(r => r.practitioner_id === practitioner.id);

            // Time-based workload analysis
            const last7Days = new Date();
            last7Days.setDate(last7Days.getDate() - 7);
            const last30Days = new Date();
            last30Days.setDate(last30Days.getDate() - 30);
            const last90Days = new Date();
            last90Days.setDate(last90Days.getDate() - 90);

            const recentAppointments = practAppointments.filter(a => new Date(a.appointment_date) > last30Days);
            const weeklyAppointments = practAppointments.filter(a => new Date(a.appointment_date) > last7Days);
            const recentBilling = practBilling.filter(b => new Date(b.service_date) > last30Days);
            const recentFeedback = practFeedback.filter(f => new Date(f.feedback_date) > last90Days);

            // Calculate workload metrics
            const totalHours30d = recentBilling.reduce((sum, b) => sum + (b.duration_hours || 0), 0);
            const avgHoursPerWeek = totalHours30d / 4.3;
            const appointmentsPerWeek = weeklyAppointments.length;

            // Caseload analysis
            const caseloadUtilization = practitioner.caseload_capacity > 0
                ? (assignedClients.length / practitioner.caseload_capacity) * 100
                : 0;

            // Feedback analysis
            const avgSatisfaction = recentFeedback.length > 0
                ? recentFeedback.reduce((sum, f) => sum + (f.overall_satisfaction || 0), 0) / recentFeedback.length
                : null;

            const feedbackTrend = recentFeedback.length >= 3
                ? recentFeedback.slice(0, 3).map(f => f.overall_satisfaction || 0)
                : null;

            // Performance metrics
            const latestReport = practReports[0];
            const billableHoursTarget = latestReport?.billable_hours_target || practitioner.billable_hours_target;
            const billableHoursActual = latestReport?.billable_hours_actual || practitioner.billable_hours_actual;
            const targetAchievement = billableHoursTarget > 0
                ? (billableHoursActual / billableHoursTarget) * 100
                : null;

            return {
                practitioner_id: practitioner.id,
                practitioner_name: practitioner.full_name,
                role: practitioner.role,
                
                // Caseload metrics
                current_caseload: assignedClients.length,
                caseload_capacity: practitioner.caseload_capacity,
                caseload_utilization_pct: caseloadUtilization,
                
                // Workload metrics
                appointments_last_7d: weeklyAppointments.length,
                appointments_last_30d: recentAppointments.length,
                total_billable_hours_30d: totalHours30d,
                avg_hours_per_week: avgHoursPerWeek,
                appointments_per_week: appointmentsPerWeek,
                
                // Performance metrics
                billable_hours_target: billableHoursTarget,
                billable_hours_actual: billableHoursActual,
                target_achievement_pct: targetAchievement,
                
                // Feedback and satisfaction
                recent_feedback_count: recentFeedback.length,
                avg_client_satisfaction: avgSatisfaction,
                feedback_trend: feedbackTrend,
                
                // Documentation and compliance
                documentation_quality_score: latestReport?.documentation_quality_score,
                compliance_score: latestReport?.compliance_score,
                
                // Time with organization
                tenure_months: practitioner.start_date
                    ? Math.floor((new Date() - new Date(practitioner.start_date)) / (1000 * 60 * 60 * 24 * 30))
                    : null
            };
        });

        // AI Analysis for Burnout Detection and Wellbeing
        const prompt = `You are an AI assistant specializing in workforce wellbeing and burnout prevention for NDIS service providers.

Analyze the following practitioner workload and wellbeing data to identify signs of burnout, overwork, or stress. Suggest proactive measures to support practitioner wellbeing:

PRACTITIONER WELLBEING PROFILES (${wellbeingProfiles.length} active practitioners):
${JSON.stringify(wellbeingProfiles, null, 2)}

Your analysis should provide:
1. Overall workforce wellbeing summary
2. Practitioners at risk of burnout with specific risk indicators
3. Workload distribution analysis (overutilized, balanced, underutilized)
4. Proactive intervention recommendations (workload redistribution, breaks, support)
5. Systemic patterns affecting wellbeing
6. Preventative strategies for sustainable workforce management

Consider burnout indicators such as:
- Sustained high caseload utilization (>85%)
- Excessive weekly hours (>45 hours/week)
- Declining client satisfaction scores
- High target pressure with consistently overperformance or underperformance
- Low documentation quality (potential sign of rushed work)
- High appointment frequency without adequate recovery time

Provide actionable, compliance-aware recommendations that prioritize practitioner wellbeing while maintaining service quality and NDIS obligations.`;

        const analysis = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    overall_wellbeing_summary: {
                        type: "string",
                        description: "Summary of overall workforce wellbeing status"
                    },
                    total_practitioners_analyzed: { type: "number" },
                    at_risk_count: { type: "number" },
                    healthy_count: { type: "number" },
                    
                    at_risk_practitioners: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                practitioner_id: { type: "string" },
                                practitioner_name: { type: "string" },
                                risk_level: { type: "string", enum: ["critical", "high", "moderate"] },
                                burnout_indicators: {
                                    type: "array",
                                    items: { type: "string" }
                                },
                                stress_factors: {
                                    type: "array",
                                    items: { type: "string" }
                                },
                                recommended_interventions: {
                                    type: "array",
                                    items: { type: "string" }
                                },
                                immediate_actions: {
                                    type: "array",
                                    items: { type: "string" }
                                }
                            }
                        }
                    },
                    
                    workload_distribution: {
                        type: "object",
                        properties: {
                            overutilized: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        practitioner_id: { type: "string" },
                                        practitioner_name: { type: "string" },
                                        utilization_pct: { type: "number" },
                                        concerns: { type: "array", items: { type: "string" } }
                                    }
                                }
                            },
                            balanced: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        practitioner_id: { type: "string" },
                                        practitioner_name: { type: "string" },
                                        utilization_pct: { type: "number" }
                                    }
                                }
                            },
                            underutilized: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        practitioner_id: { type: "string" },
                                        practitioner_name: { type: "string" },
                                        utilization_pct: { type: "number" },
                                        opportunities: { type: "array", items: { type: "string" } }
                                    }
                                }
                            }
                        }
                    },
                    
                    rebalancing_recommendations: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                recommendation_type: { type: "string" },
                                from_practitioner_id: { type: "string" },
                                to_practitioner_id: { type: "string" },
                                description: { type: "string" },
                                expected_impact: { type: "string" }
                            }
                        }
                    },
                    
                    systemic_wellbeing_insights: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                pattern: { type: "string" },
                                impact: { type: "string" },
                                recommendation: { type: "string" }
                            }
                        }
                    },
                    
                    preventative_strategies: {
                        type: "array",
                        items: { type: "string" }
                    }
                }
            }
        });

        return Response.json({
            analysis: analysis,
            wellbeing_profiles: wellbeingProfiles,
            practitioners_analyzed: wellbeingProfiles.length,
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error monitoring practitioner wellbeing:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});