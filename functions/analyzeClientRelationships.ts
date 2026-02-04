import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Gather comprehensive client relationship data
        const clients = await base44.entities.Client.filter({ status: 'active' });
        const caseNotes = await base44.entities.CaseNote.list('-created_date', 1000);
        const communications = await base44.entities.ClientCommunication.list('-created_date', 500);
        const feedback = await base44.entities.ClientFeedback.list('-created_date', 500);
        const appointments = await base44.entities.Appointment.list('-created_date', 1000);
        const clientGoals = await base44.entities.ClientGoal.list();

        // Build client profiles with communication metrics
        const clientProfiles = clients.map(client => {
            const clientCaseNotes = caseNotes.filter(n => n.client_id === client.id);
            const clientComms = communications.filter(c => c.client_id === client.id);
            const clientFeedback = feedback.filter(f => f.client_id === client.id);
            const clientAppointments = appointments.filter(a => a.client_id === client.id);
            const clientGoalData = clientGoals.filter(g => g.client_id === client.id);

            // Calculate interaction frequency
            const last30Days = new Date();
            last30Days.setDate(last30Days.getDate() - 30);
            const recentNotes = clientCaseNotes.filter(n => new Date(n.created_date) > last30Days);
            const recentComms = clientComms.filter(c => new Date(c.created_date) > last30Days);
            const recentAppointments = clientAppointments.filter(a => new Date(a.appointment_date) > last30Days);

            // Calculate average feedback score
            const avgFeedback = clientFeedback.length > 0
                ? clientFeedback.reduce((sum, f) => sum + (f.overall_satisfaction || 0), 0) / clientFeedback.length
                : null;

            return {
                client_id: client.id,
                client_name: client.full_name,
                practitioner_id: client.assigned_practitioner_id,
                interaction_frequency_30d: recentNotes.length + recentComms.length + recentAppointments.length,
                total_case_notes: clientCaseNotes.length,
                total_communications: clientComms.length,
                total_appointments: clientAppointments.length,
                avg_feedback_score: avgFeedback,
                recent_feedback_count: clientFeedback.filter(f => new Date(f.created_date) > last30Days).length,
                goal_count: clientGoalData.length,
                goals_on_track: clientGoalData.filter(g => g.status === 'on_track' || g.status === 'achieved').length,
                recent_case_notes: recentNotes.slice(0, 3).map(n => n.content?.substring(0, 200)),
                recent_communications: recentComms.slice(0, 3).map(c => c.content?.substring(0, 200)),
                last_interaction_date: [
                    ...recentNotes.map(n => n.created_date),
                    ...recentComms.map(c => c.created_date),
                    ...recentAppointments.map(a => a.appointment_date)
                ].sort().reverse()[0] || null
            };
        });

        // AI Analysis
        const prompt = `You are an AI assistant specializing in client relationship management for an NDIS service provider.

Analyze the following client relationship data to predict satisfaction levels, identify disengagement risks, and suggest proactive interventions:

CLIENT PROFILES (${clientProfiles.length} active clients):
${JSON.stringify(clientProfiles.slice(0, 50), null, 2)}

Your analysis should provide:
1. Overall relationship health summary
2. High-risk clients (disengagement risk) with specific reasons
3. Satisfaction predictions for each client based on interaction patterns
4. Proactive outreach strategies for at-risk clients
5. Recommended interventions tailored to each risk profile

Consider factors such as:
- Interaction frequency trends
- Feedback scores and patterns
- Goal achievement rates
- Communication sentiment (inferred from frequency and feedback)
- Time since last interaction

Provide actionable, compliance-aware recommendations suitable for NDIS service delivery.`;

        const analysis = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    overall_health_summary: {
                        type: "string",
                        description: "Summary of overall client relationship health"
                    },
                    total_clients_analyzed: { type: "number" },
                    high_satisfaction_count: { type: "number" },
                    at_risk_count: { type: "number" },
                    high_risk_clients: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                client_id: { type: "string" },
                                client_name: { type: "string" },
                                risk_level: { type: "string", enum: ["critical", "high", "medium"] },
                                risk_factors: {
                                    type: "array",
                                    items: { type: "string" }
                                },
                                predicted_satisfaction: { type: "string" },
                                disengagement_indicators: {
                                    type: "array",
                                    items: { type: "string" }
                                },
                                recommended_interventions: {
                                    type: "array",
                                    items: { type: "string" }
                                },
                                suggested_outreach_strategy: { type: "string" }
                            }
                        }
                    },
                    client_satisfaction_predictions: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                client_id: { type: "string" },
                                client_name: { type: "string" },
                                predicted_satisfaction_level: { type: "string" },
                                confidence_score: { type: "number" },
                                key_indicators: {
                                    type: "array",
                                    items: { type: "string" }
                                }
                            }
                        }
                    },
                    general_outreach_strategies: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                strategy_name: { type: "string" },
                                target_segment: { type: "string" },
                                description: { type: "string" },
                                expected_impact: { type: "string" }
                            }
                        }
                    },
                    recommendations_summary: {
                        type: "array",
                        items: { type: "string" }
                    }
                }
            }
        });

        return Response.json({
            analysis: analysis,
            client_profiles_analyzed: clientProfiles.length,
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error analyzing client relationships:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});