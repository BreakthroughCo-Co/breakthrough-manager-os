import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Comprehensive client journey data
        const [clients, goals, caseNotes, appointments, billingRecords, transitions, 
               riskProfiles, feedback, incidents] = await Promise.all([
            base44.entities.Client.list(),
            base44.entities.ClientGoal.list(),
            base44.entities.CaseNote.list('-created_date', 1000),
            base44.entities.Appointment.list('-created_date', 500),
            base44.entities.BillingRecord.list('-created_date', 500),
            base44.entities.ClientTransition.list(),
            base44.entities.ClientRiskProfile.list(),
            base44.entities.ClientFeedback.list(),
            base44.entities.Incident.list()
        ]);

        // Build client journey profiles
        const clientJourneys = clients.map(client => {
            const clientGoals = goals.filter(g => g.client_id === client.id);
            const clientNotes = caseNotes.filter(cn => cn.client_id === client.id);
            const clientAppointments = appointments.filter(a => a.client_id === client.id);
            const clientBilling = billingRecords.filter(b => b.client_id === client.id);
            const clientTransitions = transitions.filter(t => t.client_id === client.id);
            const clientRisk = riskProfiles.find(r => r.client_id === client.id);
            const clientFeedback = feedback.filter(f => f.client_id === client.id);
            const clientIncidents = incidents.filter(i => i.client_id === client.id);

            const daysSinceStart = client.plan_start_date 
                ? Math.floor((new Date() - new Date(client.plan_start_date)) / (1000 * 60 * 60 * 24))
                : null;

            const avgFeedbackRating = clientFeedback.length > 0
                ? clientFeedback.reduce((sum, f) => sum + f.overall_satisfaction, 0) / clientFeedback.length
                : null;

            return {
                client_id: client.id,
                client_name: client.full_name,
                service_type: client.service_type,
                status: client.status,
                risk_level: client.risk_level,
                days_in_service: daysSinceStart,
                total_goals: clientGoals.length,
                achieved_goals: clientGoals.filter(g => g.status === 'achieved').length,
                case_notes_count: clientNotes.length,
                appointments_count: clientAppointments.length,
                billing_records: clientBilling.length,
                transitions: clientTransitions.length,
                incident_count: clientIncidents.length,
                avg_satisfaction: avgFeedbackRating,
                funding_utilization: client.funding_allocated > 0 
                    ? (client.funding_utilised / client.funding_allocated * 100) 
                    : null
            };
        });

        const response = await base44.entities.integrations.Core.InvokeLLM({
            prompt: `You are a client journey analytics specialist for an NDIS provider. Analyze client pathways to identify patterns, predict outcomes, and flag disengagement risks.

Client Journey Data (${clients.length} clients):
${JSON.stringify(clientJourneys, null, 2)}

Analyze and provide:
1. Common client pathways (typical service progressions)
2. Success factors (what predicts positive outcomes)
3. Disengagement risk indicators
4. Service effectiveness by client segment
5. Outcome predictions for current active clients
6. Strategic recommendations for service improvement`,
            response_json_schema: {
                type: "object",
                properties: {
                    analysis_summary: { type: "string" },
                    common_pathways: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                pathway_name: { type: "string" },
                                typical_duration_days: { type: "number" },
                                common_milestones: { type: "array", items: { type: "string" } },
                                success_rate: { type: "string" },
                                client_count: { type: "number" }
                            }
                        }
                    },
                    success_factors: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                factor: { type: "string" },
                                impact_level: { type: "string" },
                                evidence: { type: "string" }
                            }
                        }
                    },
                    disengagement_risk_indicators: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                indicator: { type: "string" },
                                risk_level: { type: "string" },
                                prevalence: { type: "string" }
                            }
                        }
                    },
                    at_risk_clients: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                client_name: { type: "string" },
                                risk_score: { type: "number" },
                                risk_factors: { type: "array", items: { type: "string" } },
                                recommended_intervention: { type: "string" }
                            }
                        }
                    },
                    service_effectiveness: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                service_type: { type: "string" },
                                effectiveness_rating: { type: "string" },
                                key_metrics: { type: "string" },
                                improvement_areas: { type: "array", items: { type: "string" } }
                            }
                        }
                    },
                    outcome_predictions: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                client_name: { type: "string" },
                                predicted_outcome: { type: "string" },
                                confidence: { type: "string" },
                                key_factors: { type: "array", items: { type: "string" } }
                            }
                        }
                    },
                    strategic_recommendations: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                recommendation: { type: "string" },
                                expected_impact: { type: "string" },
                                implementation_complexity: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        return Response.json({
            success: true,
            analysis: response,
            dataset_summary: {
                total_clients: clients.length,
                active_clients: clients.filter(c => c.status === 'active').length,
                total_goals: goals.length,
                total_case_notes: caseNotes.length
            },
            generated_date: new Date().toISOString()
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});