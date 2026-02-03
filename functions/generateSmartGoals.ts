import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * AI-Powered Dynamic Goal Setting for NDIS Clients
 * Generates SMART goals based on client history and NDIS requirements
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_id, bsp_id, practitioner_input } = await req.json();

    // Fetch client and related data
    const [client, bsp, caseNotes, incidents] = await Promise.all([
      base44.entities.Client.filter({ id: client_id }).then(c => c[0]),
      bsp_id ? base44.entities.BehaviourSupportPlan.filter({ id: bsp_id }).then(b => b[0]) : null,
      base44.entities.CaseNote.filter({ client_id }),
      base44.entities.Incident.filter({ client_id }),
    ]);

    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    // Analyze client history for patterns
    const recentCaseNotes = caseNotes.slice(0, 10);
    const progressTrends = caseNotes.map(n => ({
      date: n.session_date,
      rating: n.progress_rating,
      note: n.assessment || n.objective
    })).slice(0, 5);

    const incidentSummary = {
      total: incidents.length,
      categories: [...new Set(incidents.map(i => i.category))],
      recentIncidents: incidents.slice(0, 3).map(i => ({
        date: i.incident_date,
        category: i.category,
        severity: i.severity
      }))
    };

    // Build context for AI
    const contextData = `
CLIENT: ${client.full_name}
Age/DOB: ${client.date_of_birth || 'Not provided'}
Service Type: ${client.service_type}
Risk Level: ${client.risk_level}
Plan Period: ${client.plan_start_date} to ${client.plan_end_date}

CURRENT SUPPORT PLAN:
${bsp ? `- Active BSP: v${bsp.plan_version}, Review: ${bsp.review_date}` : '- No active BSP'}
${bsp?.behaviour_summary ? `- Behaviour Summary: ${bsp.behaviour_summary.substring(0, 200)}` : ''}

PROGRESS PATTERNS:
${progressTrends.map(t => `- ${t.date}: ${t.rating} - ${t.note?.substring(0, 80)}`).join('\n')}

INCIDENT SUMMARY:
- Total Incidents: ${incidentSummary.total}
- Categories: ${incidentSummary.categories.join(', ')}
${incidentSummary.recentIncidents.map(i => `- ${i.date} (${i.severity}): ${i.category}`).join('\n')}

PRACTITIONER INPUT:
${practitioner_input || 'Generate goals based on client history and NDIS outcomes'}

NDIS Outcome Domains: Improved Daily Living, Improved Health and Wellbeing, Improved Relationships and Social, Improved Learning, Improved Work, Improved Community and Social, Improved Accommodation Support`;

    // Generate SMART goals using AI
    const aiGoals = await base44.integrations.Core.InvokeLLM({
      prompt: `${contextData}

Based on this client's history, current functioning, and NDIS outcomes, generate 3-5 SMART goals that are:
1. Specific - clear and detailed
2. Measurable - quantifiable progress indicators
3. Achievable - realistic within 6-12 months with appropriate support
4. Relevant - aligned with NDIS plan outcomes and client/family priorities
5. Time-bound - with specific review dates

For each goal, also suggest:
- Baseline (current level of performance)
- Target outcome (desired result)
- Progress metrics (how to track)
- Recommended interventions (specific strategies to support achievement)
- NDIS domain alignment

Output as structured JSON with individual goal objects.`,
      response_json_schema: {
        type: "object",
        properties: {
          goals: {
            type: "array",
            items: {
              type: "object",
              properties: {
                goal_title: { type: "string" },
                specific: { type: "string" },
                measurable: { type: "string" },
                achievable: { type: "string" },
                relevant: { type: "string" },
                time_bound: { type: "string" },
                ndis_domain: { type: "string" },
                baseline: { type: "string" },
                target_outcome: { type: "string" },
                progress_metric: { type: "string" },
                interventions: { type: "array", items: { type: "string" } },
                rationale: { type: "string" },
                priority: { type: "string", enum: ["low", "medium", "high"] }
              }
            }
          },
          summary: { type: "string" }
        }
      }
    });

    // Create ClientGoal entities from AI suggestions
    const createdGoals = [];
    for (const aiGoal of aiGoals.goals) {
      const goalData = {
        client_id,
        client_name: client.full_name,
        bsp_id: bsp_id || null,
        goal_description: aiGoal.goal_title,
        specific: aiGoal.specific,
        measurable: aiGoal.measurable,
        achievable: aiGoal.achievable,
        relevant: aiGoal.relevant,
        time_bound: aiGoal.time_bound,
        ndis_domain: aiGoal.ndis_domain,
        baseline: aiGoal.baseline,
        target_outcome: aiGoal.target_outcome,
        progress_metric: aiGoal.progress_metric,
        interventions_required: JSON.stringify(aiGoal.interventions),
        priority: aiGoal.priority,
        ai_generated: true,
        ai_rationale: aiGoal.rationale,
        current_progress: 0,
        status: 'not_started',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        review_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };

      const created = await base44.entities.ClientGoal.create(goalData);
      createdGoals.push(created);
    }

    return Response.json({
      client_id,
      client_name: client.full_name,
      goals_generated: createdGoals.length,
      goals: createdGoals,
      ai_summary: aiGoals.summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Goal generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});