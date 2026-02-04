import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { client_id } = await req.json();

        // Fetch comprehensive client and practitioner data
        const [client, clientGoals, clientCaseNotes, clientRiskProfile, practitioners, practitionerSkills, 
               performanceReports, clientFeedback, trainingProgress] = await Promise.all([
            base44.entities.Client.get(client_id),
            base44.entities.ClientGoal.filter({ client_id }),
            base44.entities.CaseNote.filter({ client_id }),
            base44.entities.ClientRiskProfile.filter({ client_id }),
            base44.entities.Practitioner.filter({ status: 'active' }),
            base44.entities.PractitionerSkill.list(),
            base44.entities.MonthlyPerformanceReport.list(),
            base44.entities.ClientFeedback.list(),
            base44.entities.TrainingProgress.list()
        ]);

        // Build practitioner profiles with performance data
        const practitionerProfiles = practitioners.map(p => {
            const skills = practitionerSkills.filter(s => s.practitioner_id === p.id);
            const recentPerformance = performanceReports
                .filter(pr => pr.practitioner_id === p.id)
                .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
            const feedback = clientFeedback.filter(f => f.practitioner_id === p.id);
            const training = trainingProgress.filter(t => t.practitioner_id === p.id);

            const avgRating = feedback.length > 0 
                ? feedback.reduce((sum, f) => sum + f.overall_satisfaction, 0) / feedback.length 
                : null;

            return {
                id: p.id,
                name: p.full_name,
                role: p.role,
                current_caseload: p.current_caseload || 0,
                caseload_capacity: p.caseload_capacity || 0,
                utilization: p.caseload_capacity ? (p.current_caseload / p.caseload_capacity) : 0,
                skills: skills.map(s => ({ skill: s.skill_name, proficiency: s.proficiency_level })),
                certifications: p.certifications || [],
                recent_performance: recentPerformance,
                average_client_rating: avgRating,
                feedback_count: feedback.length,
                completed_training: training.filter(t => t.status === 'completed').length
            };
        });

        // Use AI to analyze and recommend matches
        const response = await base44.integrations.Core.InvokeLLM({
            prompt: `You are an AI resource allocation specialist for an NDIS provider. Analyze the client's needs and recommend the most suitable practitioners.

Client Profile:
- Name: ${client.full_name}
- NDIS Number: ${client.ndis_number}
- Service Type: ${client.service_type}
- Risk Level: ${client.risk_level}
- Current Status: ${client.status}

Client Goals:
${JSON.stringify(clientGoals.map(g => ({ goal: g.goal_description, status: g.status })), null, 2)}

Recent Case Notes (last 5):
${JSON.stringify(clientCaseNotes.slice(0, 5).map(cn => ({ date: cn.session_date, summary: cn.notes?.substring(0, 200) })), null, 2)}

Risk Profile:
${JSON.stringify(clientRiskProfile[0] || {}, null, 2)}

Available Practitioners:
${JSON.stringify(practitionerProfiles, null, 2)}

Provide recommendations considering:
1. Practitioner skills and certifications matching client needs
2. Experience level appropriate for client risk level
3. Current workload and capacity
4. Historical performance and client satisfaction
5. Specialized training relevant to client goals
6. Geographic considerations if applicable

Rank practitioners by suitability and provide detailed rationale.`,
            response_json_schema: {
                type: "object",
                properties: {
                    recommendations: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                practitioner_id: { type: "string" },
                                practitioner_name: { type: "string" },
                                suitability_score: { type: "number" },
                                ranking: { type: "number" },
                                match_rationale: { type: "string" },
                                key_strengths: { type: "array", items: { type: "string" } },
                                potential_concerns: { type: "array", items: { type: "string" } },
                                recommended_priority: {
                                    type: "string",
                                    enum: ["highly_recommended", "recommended", "suitable", "consider_with_support"]
                                }
                            }
                        }
                    },
                    overall_analysis: { type: "string" },
                    critical_considerations: { type: "array", items: { type: "string" } }
                }
            }
        });

        return Response.json({
            success: true,
            client_id,
            client_name: client.full_name,
            recommendations: response.recommendations,
            overall_analysis: response.overall_analysis,
            critical_considerations: response.critical_considerations,
            generated_date: new Date().toISOString()
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});