import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Gather comprehensive incident and risk data
        const incidents = await base44.entities.Incident.list('-created_date', 500);
        const clientRiskProfiles = await base44.entities.ClientRiskProfile.list();
        const caseNotes = await base44.entities.CaseNote.list('-created_date', 1000);
        const clients = await base44.entities.Client.list();
        const abcRecords = await base44.entities.ABCRecord.list('-observation_date', 500);
        const restrictivePractices = await base44.entities.RestrictivePractice.list();
        const clientGoals = await base44.entities.ClientGoal.list();

        // Build comprehensive risk analysis dataset
        const clientRiskAnalysis = clients.map(client => {
            const clientIncidents = incidents.filter(i => i.client_id === client.id);
            const riskProfile = clientRiskProfiles.find(r => r.client_id === client.id);
            const clientNotes = caseNotes.filter(n => n.client_id === client.id);
            const clientABCs = abcRecords.filter(a => a.client_id === client.id);
            const clientRP = restrictivePractices.filter(r => r.client_id === client.id);
            const clientGoalData = clientGoals.filter(g => g.client_id === client.id);

            // Incident pattern analysis
            const last30Days = new Date();
            last30Days.setDate(last30Days.getDate() - 30);
            const last90Days = new Date();
            last90Days.setDate(last90Days.getDate() - 90);

            const recentIncidents = clientIncidents.filter(i => new Date(i.incident_date) > last90Days);
            const criticalIncidents = clientIncidents.filter(i => 
                i.severity === 'critical' || i.severity === 'high'
            );

            // ABC data patterns
            const recentABCs = clientABCs.filter(a => new Date(a.observation_date) > last30Days);
            const highIntensityBehaviours = clientABCs.filter(a => 
                a.behaviour_intensity === 'high' || a.behaviour_intensity === 'severe'
            );

            // Risk indicators
            const hasRestrictivePractices = clientRP.length > 0;
            const unauthorisedRP = clientRP.filter(r => r.authorisation_status === 'unauthorised').length;
            
            // Goal progress
            const goalsAtRisk = clientGoalData.filter(g => g.status === 'at_risk' || g.status === 'not_achieved').length;

            return {
                client_id: client.id,
                client_name: client.full_name,
                current_risk_level: client.risk_level || riskProfile?.overall_risk_level,
                
                // Incident history
                total_incidents: clientIncidents.length,
                recent_incidents_90d: recentIncidents.length,
                critical_incidents: criticalIncidents.length,
                incident_types: [...new Set(clientIncidents.map(i => i.incident_type))],
                
                // Behaviour patterns
                recent_abc_records_30d: recentABCs.length,
                high_intensity_behaviours: highIntensityBehaviours.length,
                identified_functions: [...new Set(clientABCs.map(a => a.hypothesised_function).filter(Boolean))],
                
                // Risk factors
                has_restrictive_practices: hasRestrictivePractices,
                unauthorised_restrictive_practices: unauthorisedRP,
                risk_factors: riskProfile?.identified_risks || [],
                protective_factors: riskProfile?.protective_factors || [],
                
                // Support context
                support_intensity: riskProfile?.support_intensity,
                goals_at_risk: goalsAtRisk,
                
                // Case note indicators (extract patterns)
                recent_case_notes_count: clientNotes.filter(n => new Date(n.created_date) > last30Days).length,
                case_note_sample: clientNotes.slice(0, 5).map(n => ({
                    date: n.created_date,
                    content_snippet: n.content?.substring(0, 200)
                }))
            };
        });

        // AI Predictive Analysis
        const prompt = `You are an AI assistant specializing in predictive risk analysis and incident prevention for NDIS service providers.

Analyze the following comprehensive risk data to predict potential future incidents, identify high-risk clients and situations, and suggest preventative actions:

CLIENT RISK ANALYSIS DATA (${clientRiskAnalysis.length} clients):
${JSON.stringify(clientRiskAnalysis.slice(0, 50), null, 2)}

RECENT INCIDENT PATTERNS:
${JSON.stringify(incidents.slice(0, 30).map(i => ({
    client_id: i.client_id,
    incident_type: i.incident_type,
    severity: i.severity,
    date: i.incident_date,
    description_snippet: i.description?.substring(0, 150)
})), null, 2)}

Your analysis should provide:
1. Overall incident risk landscape summary
2. High-risk clients requiring immediate attention
3. Predicted incident scenarios with likelihood estimates
4. Pattern-based risk indicators (e.g., escalation patterns, environmental triggers)
5. Preventative actions and specific supports to mitigate risks
6. Early warning signs to monitor
7. System-level risk trends

Consider correlations such as:
- Frequency and severity of past incidents
- Behaviour escalation patterns from ABC data
- Unauthorised restrictive practices
- Goals not being achieved
- Changes in case note frequency or content tone
- Combinations of risk factors

Provide actionable, compliance-aware recommendations that prioritize safety while respecting client rights and NDIS obligations. All predictions should be framed as probabilities, not certainties.`;

        const analysis = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    overall_risk_summary: {
                        type: "string",
                        description: "Summary of overall incident risk landscape"
                    },
                    total_clients_analyzed: { type: "number" },
                    high_risk_clients_count: { type: "number" },
                    
                    high_risk_clients: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                client_id: { type: "string" },
                                client_name: { type: "string" },
                                risk_level: { type: "string", enum: ["critical", "high", "medium"] },
                                predicted_incident_likelihood: { type: "string" },
                                risk_indicators: {
                                    type: "array",
                                    items: { type: "string" }
                                },
                                escalation_patterns: {
                                    type: "array",
                                    items: { type: "string" }
                                },
                                immediate_concerns: {
                                    type: "array",
                                    items: { type: "string" }
                                }
                            }
                        }
                    },
                    
                    predicted_incident_scenarios: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                client_id: { type: "string" },
                                client_name: { type: "string" },
                                scenario_description: { type: "string" },
                                likelihood: { type: "string", enum: ["high", "moderate", "low"] },
                                potential_severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
                                predicted_timeframe: { type: "string" },
                                contributing_factors: {
                                    type: "array",
                                    items: { type: "string" }
                                },
                                preventative_actions: {
                                    type: "array",
                                    items: { type: "string" }
                                },
                                specific_supports_needed: {
                                    type: "array",
                                    items: { type: "string" }
                                }
                            }
                        }
                    },
                    
                    early_warning_signs: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                warning_sign: { type: "string" },
                                indicator_description: { type: "string" },
                                monitoring_action: { type: "string" }
                            }
                        }
                    },
                    
                    proactive_alert_recommendations: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                alert_type: { type: "string" },
                                client_id: { type: "string" },
                                client_name: { type: "string" },
                                severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
                                title: { type: "string" },
                                description: { type: "string" },
                                suggested_actions: {
                                    type: "array",
                                    items: { type: "string" }
                                }
                            }
                        }
                    },
                    
                    system_level_risk_trends: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                trend: { type: "string" },
                                description: { type: "string" },
                                impact: { type: "string" },
                                organizational_response: { type: "string" }
                            }
                        }
                    },
                    
                    strategic_recommendations: {
                        type: "array",
                        items: { type: "string" }
                    }
                }
            }
        });

        return Response.json({
            analysis: analysis,
            clients_analyzed: clientRiskAnalysis.length,
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error predicting incidents:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});