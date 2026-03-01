import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 });

        const { client_id, session_type, current_draft } = await req.json();
        if (!client_id) return Response.json({ error: 'client_id required' }, { status: 400 });

        const [client, fbas, bsps, recentNotes, goals] = await Promise.all([
            base44.asServiceRole.entities.Client.get(client_id).catch(() => null),
            base44.asServiceRole.entities.FunctionalBehaviourAssessment.filter({ client_id }, '-assessment_date', 2).catch(() => []),
            base44.asServiceRole.entities.BehaviourSupportPlan.filter({ client_id }, '-start_date', 1).catch(() => []),
            base44.asServiceRole.entities.CaseNote.filter({ client_id }, '-session_date', 5).catch(() => []),
            base44.asServiceRole.entities.ClientGoal.filter({ client_id }).catch(() => [])
        ]);

        const latestFBA = fbas[0];
        const latestBSP = bsps[0];

        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `You are an NDIS Behaviour Support clinical advisor. Provide structured, evidence-based suggestions for a practitioner writing a case note. No conversational text — output JSON only.

CLIENT: ${client?.full_name || 'Unknown'} | Service: ${client?.service_type || 'N/A'} | Session: ${session_type || 'direct_support'}

ACTIVE GOALS:
${goals.map(g => `- ${g.goal_description || g.title || 'Goal'} (${g.status || 'active'})`).join('\n') || 'None on file.'}

LATEST FBA:
${latestFBA ? `Function: ${latestFBA.hypothesised_function || 'N/A'} | Targets: ${latestFBA.target_behaviours || 'N/A'} | Antecedents: ${latestFBA.antecedents || 'N/A'} | Recommendations: ${latestFBA.recommendations || 'None'}` : 'No FBA on file.'}

LATEST BSP STRATEGIES:
${latestBSP ? `Environmental: ${latestBSP.environmental_strategies || 'None'} | Skill Building: ${latestBSP.skill_building_strategies || 'None'} | Reactive: ${latestBSP.reactive_strategies || 'None'}` : 'No BSP on file.'}

RECENT PROGRESS (last 5 notes):
${recentNotes.map(n => `- ${n.session_date}: ${n.progress_rating}, Goals: ${n.goals_addressed || 'not recorded'}`).join('\n') || 'No prior notes.'}

CURRENT DRAFT:
${current_draft || 'Not yet drafted.'}`,
            response_json_schema: {
                type: "object",
                properties: {
                    suggested_goals: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                goal_text: { type: "string" },
                                ndis_domain: { type: "string" },
                                rationale: { type: "string" }
                            }
                        }
                    },
                    suggested_strategies: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                strategy: { type: "string" },
                                strategy_type: { type: "string" },
                                evidence_basis: { type: "string" }
                            }
                        }
                    },
                    compliance_flags: { type: "array", items: { type: "string" } },
                    progress_assessment: { type: "string" }
                }
            }
        });

        return Response.json({ success: true, suggestions: result });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});