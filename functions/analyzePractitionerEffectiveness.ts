import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Gather comprehensive practitioner performance and outcome data
        const practitioners = await base44.entities.Practitioner.filter({ status: 'active' });
        const performanceReports = await base44.entities.MonthlyPerformanceReport.list('-created_date', 500);
        const clientFeedback = await base44.entities.ClientFeedback.list('-created_date', 500);
        const trainingProgress = await base44.entities.TrainingProgress.list();
        const clientGoals = await base44.entities.ClientGoal.list();
        const incidents = await base44.entities.Incident.list('-created_date', 500);
        const clients = await base44.entities.Client.list();
        const trainingModules = await base44.entities.TrainingModule.list();

        // Build comprehensive practitioner effectiveness profiles
        const practitionerProfiles = practitioners.map(practitioner => {
            // Performance data
            const practReports = performanceReports.filter(r => r.practitioner_id === practitioner.id);
            const practFeedback = clientFeedback.filter(f => f.practitioner_id === practitioner.id);
            const practTraining = trainingProgress.filter(t => t.practitioner_id === practitioner.id);
            
            // Assigned clients and their outcomes
            const assignedClients = clients.filter(c => c.assigned_practitioner_id === practitioner.id);
            const clientIds = assignedClients.map(c => c.id);
            const clientGoalsData = clientGoals.filter(g => clientIds.includes(g.client_id));
            const clientIncidents = incidents.filter(i => clientIds.includes(i.client_id));

            // Calculate outcome metrics
            const goalsAchieved = clientGoalsData.filter(g => g.status === 'achieved').length;
            const goalsOnTrack = clientGoalsData.filter(g => g.status === 'on_track').length;
            const goalCompletionRate = clientGoalsData.length > 0 
                ? ((goalsAchieved + goalsOnTrack) / clientGoalsData.length) * 100 
                : 0;

            // Feedback analysis
            const avgOverallSatisfaction = practFeedback.length > 0
                ? practFeedback.reduce((sum, f) => sum + (f.overall_satisfaction || 0), 0) / practFeedback.length
                : null;
            const avgServiceQuality = practFeedback.length > 0
                ? practFeedback.reduce((sum, f) => sum + (f.service_quality_rating || 0), 0) / practFeedback.length
                : null;
            const avgCommunication = practFeedback.length > 0
                ? practFeedback.reduce((sum, f) => sum + (f.communication_rating || 0), 0) / practFeedback.length
                : null;
            const avgGoalProgress = practFeedback.length > 0
                ? practFeedback.reduce((sum, f) => sum + (f.goal_progress_rating || 0), 0) / practFeedback.length
                : null;

            // Training profile
            const completedTraining = practTraining.filter(t => t.status === 'completed');
            const avgQuizScore = completedTraining.length > 0
                ? completedTraining.reduce((sum, t) => sum + (t.quiz_score || 0), 0) / completedTraining.length
                : null;
            const trainingCategories = completedTraining.map(t => {
                const module = trainingModules.find(m => m.id === t.module_id);
                return module?.category;
            }).filter(Boolean);

            // Incident analysis
            const incidentCount = clientIncidents.length;
            const criticalIncidents = clientIncidents.filter(i => i.severity === 'critical' || i.severity === 'high').length;

            // Latest performance metrics
            const latestReport = practReports[0];

            return {
                practitioner_id: practitioner.id,
                practitioner_name: practitioner.full_name,
                role: practitioner.role,
                caseload_size: assignedClients.length,
                caseload_capacity: practitioner.caseload_capacity,
                utilization_rate: practitioner.caseload_capacity > 0 
                    ? (assignedClients.length / practitioner.caseload_capacity) * 100 
                    : 0,
                
                // Client outcomes
                total_client_goals: clientGoalsData.length,
                goals_achieved: goalsAchieved,
                goals_on_track: goalsOnTrack,
                goal_completion_rate: goalCompletionRate,
                incident_count: incidentCount,
                critical_incident_count: criticalIncidents,
                
                // Feedback metrics
                feedback_count: practFeedback.length,
                avg_overall_satisfaction: avgOverallSatisfaction,
                avg_service_quality: avgServiceQuality,
                avg_communication_rating: avgCommunication,
                avg_goal_progress_rating: avgGoalProgress,
                
                // Training profile
                training_modules_completed: completedTraining.length,
                avg_training_quiz_score: avgQuizScore,
                training_categories: [...new Set(trainingCategories)],
                
                // Performance report data
                billable_hours_actual: latestReport?.billable_hours_actual,
                billable_hours_target: latestReport?.billable_hours_target,
                compliance_score: latestReport?.compliance_score,
                documentation_quality_score: latestReport?.documentation_quality_score,
                
                // Time with organization
                tenure_months: practitioner.start_date 
                    ? Math.floor((new Date() - new Date(practitioner.start_date)) / (1000 * 60 * 60 * 24 * 30))
                    : null
            };
        });

        // AI Deep Analysis
        const prompt = `You are an AI assistant specializing in practitioner performance analysis for an NDIS service provider.

Analyze the following practitioner effectiveness data to provide deep insights, identify effective practices, and suggest personalized professional development paths:

PRACTITIONER PROFILES (${practitionerProfiles.length} active practitioners):
${JSON.stringify(practitionerProfiles, null, 2)}

Your analysis should provide:
1. Overall practitioner effectiveness summary
2. Correlation analysis between performance metrics and client outcomes
3. Identification of high-performing practitioners and their key success factors
4. Practitioners needing support with specific areas for improvement
5. Personalized professional development recommendations for each practitioner
6. Best practice insights that can be shared across the team

Consider correlations such as:
- Relationship between training completion and client outcomes
- Impact of feedback scores on goal achievement rates
- Connection between caseload utilization and service quality
- Influence of documentation quality on incident rates
- Effectiveness of specific practitioner roles in different scenarios

Provide actionable, evidence-based recommendations that align with NDIS practice standards and professional development best practices.`;

        const analysis = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    overall_effectiveness_summary: {
                        type: "string",
                        description: "Summary of overall practitioner effectiveness"
                    },
                    total_practitioners_analyzed: { type: "number" },
                    high_performers_count: { type: "number" },
                    needs_support_count: { type: "number" },
                    
                    key_correlations: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                correlation_name: { type: "string" },
                                description: { type: "string" },
                                strength: { type: "string", enum: ["strong", "moderate", "weak"] },
                                insight: { type: "string" }
                            }
                        }
                    },
                    
                    high_performers: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                practitioner_id: { type: "string" },
                                practitioner_name: { type: "string" },
                                key_strengths: {
                                    type: "array",
                                    items: { type: "string" }
                                },
                                success_factors: {
                                    type: "array",
                                    items: { type: "string" }
                                },
                                best_practices_to_share: {
                                    type: "array",
                                    items: { type: "string" }
                                }
                            }
                        }
                    },
                    
                    practitioners_needing_support: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                practitioner_id: { type: "string" },
                                practitioner_name: { type: "string" },
                                areas_for_improvement: {
                                    type: "array",
                                    items: { type: "string" }
                                },
                                identified_challenges: {
                                    type: "array",
                                    items: { type: "string" }
                                },
                                immediate_support_needs: {
                                    type: "array",
                                    items: { type: "string" }
                                }
                            }
                        }
                    },
                    
                    personalized_development_paths: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                practitioner_id: { type: "string" },
                                practitioner_name: { type: "string" },
                                development_priority: { type: "string", enum: ["high", "medium", "low"] },
                                recommended_training_areas: {
                                    type: "array",
                                    items: { type: "string" }
                                },
                                suggested_mentorship_opportunities: {
                                    type: "array",
                                    items: { type: "string" }
                                },
                                skill_building_focus: {
                                    type: "array",
                                    items: { type: "string" }
                                },
                                growth_trajectory: { type: "string" },
                                expected_outcomes: {
                                    type: "array",
                                    items: { type: "string" }
                                }
                            }
                        }
                    },
                    
                    team_wide_insights: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                insight_category: { type: "string" },
                                finding: { type: "string" },
                                recommended_action: { type: "string" }
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
            practitioners_analyzed: practitionerProfiles.length,
            practitioner_profiles: practitionerProfiles,
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error analyzing practitioner effectiveness:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});