import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Suggest Personalized Interventions for At-Risk Clients
 * Provides tailored intervention strategies and goal adjustments based on:
 * - Client's specific NDIS goals and domains
 * - Behavior support plan interventions already in place
 * - Client's engagement patterns and preferences
 * - Practitioner expertise and capacity
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json().catch(() => ({}));
    const { client_ids } = payload; // Optional: filter by specific clients

    // Fetch comprehensive data for intervention planning
    const [clients, goals, bsps, caseNotes, practitioners, massAssessments] = await Promise.all([
      base44.entities.Client.list(),
      base44.entities.ClientGoal.list(),
      base44.entities.BehaviourSupportPlan.list(),
      base44.entities.CaseNote.list('-session_date', 300),
      base44.entities.Practitioner.list(),
      base44.entities.MotivationAssessmentScale.list()
    ]);

    // Filter clients if specific IDs provided, otherwise get at-risk ones
    const targetClients = client_ids
      ? clients.filter(c => client_ids.includes(c.id))
      : clients.filter(c => c.status === 'active' && c.risk_level === 'high');

    const interventionSuggestions = [];

    for (const client of targetClients) {
      const clientGoals = goals.filter(g => g.client_id === client.id);
      const clientBsps = bsps.filter(b => b.client_id === client.id);
      const clientNotes = caseNotes.filter(n => n.client_id === client.id);
      const clientMas = massAssessments.find(m => m.client_id === client.id);
      const assignedPractitioner = practitioners.find(p => p.id === client.assigned_practitioner_id);

      // Group goals by domain
      const goalsByDomain = {};
      clientGoals.forEach(g => {
        const domain = g.ndis_domain || 'Other';
        if (!goalsByDomain[domain]) goalsByDomain[domain] = [];
        goalsByDomain[domain].push(g);
      });

      // Get recent session context
      const recentNotes = clientNotes.slice(0, 5);
      const recentProgressSummary = recentNotes
        .map(n => `${n.session_date}: ${n.progress_rating} - ${n.ai_summary || n.plan}`)
        .join('\n');

      // Get client motivation profile if available
      const motivationContext = clientMas
        ? `Primary motivation: ${clientMas.primary_motivation}. Secondary: ${clientMas.secondary_motivations?.join(', ')}`
        : 'No motivation assessment available';

      // Build intervention planning context
      const interventionContext = `
CLIENT INTERVENTION PLANNING:

Client: ${client.full_name}
Risk Level: ${client.risk_level}
Service Type: ${client.service_type}
Assigned Practitioner: ${assignedPractitioner?.full_name || 'Unassigned'}

ACTIVE GOALS BY DOMAIN:
${Object.entries(goalsByDomain).map(([domain, domainGoals]) =>
  `${domain}:\n${domainGoals.map(g => 
    `  - ${g.goal_description} (${g.status}): ${g.current_progress || 0}% complete`
  ).join('\n')}`
).join('\n')}

CURRENT BEHAVIOR SUPPORT PLANS: ${clientBsps.length} active
${clientBsps.slice(0, 3).map(b => `  - ${b.plan_name || 'BSP'}: Created ${b.created_date}`).join('\n')}

MOTIVATION PROFILE: ${motivationContext}

RECENT SESSION PROGRESS:
${recentProgressSummary || 'No recent sessions'}

Current Challenges:
- Goals at risk or not started: ${clientGoals.filter(g => g.status === 'at_risk' || g.status === 'not_started').length}
- Recent regression or no change sessions: ${recentNotes.filter(n => ['regression', 'no_change'].includes(n.progress_rating)).length}
`;

      // Get AI-powered intervention suggestions
      const interventions = await base44.integrations.Core.InvokeLLM({
        prompt: `${interventionContext}

Based on the client profile above, provide:

1. **Immediate Intervention Strategies** (Next 2-4 weeks)
   - Specific, actionable strategies tailored to client's motivation profile
   - How to adapt current BSP if needed
   - Quick wins to rebuild engagement

2. **Goal-Specific Adjustments** (Per domain)
   - Which goals need immediate focus or adjustment
   - Realistic timelines given current progress
   - Suggested interventions per goal

3. **Engagement Re-Entry Plan** (If disengaged)
   - Steps to re-establish trust and commitment
   - Frequency and format of contact that will work best
   - Early milestone targets

4. **Practitioner Support Recommendations**
   - Skills needed to effectively support this client
   - Potential practitioner-client fit improvements
   - Peer mentoring or consultation suggestions

5. **NDIS Plan Renewal Considerations** (If approaching expiry)
   - Realistic goal achievements for plan review
   - Areas for budget reallocation
   - New goals to propose based on progress

6. **Monitoring & Evaluation Plan**
   - Key metrics to track weekly
   - Trigger points for escalation
   - Timeline for reassessment`,
        response_json_schema: {
          type: "object",
          properties: {
            immediate_strategies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  strategy_name: { type: "string" },
                  description: { type: "string" },
                  implementation_steps: { type: "array", items: { type: "string" } },
                  expected_impact: { type: "string" },
                  timeline_weeks: { type: "number" }
                }
              }
            },
            goal_adjustments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  goal_description: { type: "string" },
                  ndis_domain: { type: "string" },
                  current_status: { type: "string" },
                  recommended_adjustment: { type: "string" },
                  new_timeline_months: { type: "number" },
                  suggested_interventions: { type: "array", items: { type: "string" } }
                }
              }
            },
            engagement_reentry_plan: {
              type: "object",
              properties: {
                trust_rebuilding_steps: { type: "array", items: { type: "string" } },
                preferred_contact_method: { type: "string" },
                contact_frequency_days: { type: "number" },
                first_month_milestones: { type: "array", items: { type: "string" } }
              }
            },
            practitioner_recommendations: {
              type: "object",
              properties: {
                skills_to_develop: { type: "array", items: { type: "string" } },
                coaching_focus_areas: { type: "array", items: { type: "string" } },
                consider_practitioner_change: { type: "boolean" },
                change_rationale: { type: "string" }
              }
            },
            monitoring_plan: {
              type: "object",
              properties: {
                weekly_metrics: { type: "array", items: { type: "string" } },
                escalation_triggers: { type: "array", items: { type: "string" } },
                reassessment_date_days: { type: "number" }
              }
            }
          }
        }
      });

      interventionSuggestions.push({
        client_id: client.id,
        client_name: client.full_name,
        analysis_date: new Date().toISOString(),
        assigned_practitioner: assignedPractitioner?.full_name || 'Unassigned',
        total_goals: clientGoals.length,
        goals_at_risk: clientGoals.filter(g => g.status === 'at_risk' || g.status === 'not_started').length,
        intervention_recommendations: interventions
      });

      // Create tasks for practitioner to implement interventions
      if (interventions.engagement_reentry_plan) {
        await base44.asServiceRole.entities.Task.create({
          title: `Engagement Re-entry Plan: ${client.full_name}`,
          description: `First contact method: ${interventions.engagement_reentry_plan.preferred_contact_method}. Frequency: Every ${interventions.engagement_reentry_plan.contact_frequency_days} days. First milestone: ${interventions.engagement_reentry_plan.first_month_milestones?.[0] || 'Re-establish contact'}`,
          category: 'Clinical',
          priority: 'high',
          status: 'pending',
          due_date: new Date().toISOString().split('T')[0],
          assigned_to: assignedPractitioner?.email
        });
      }
    }

    return Response.json({
      analysis_date: new Date().toISOString(),
      clients_analyzed: interventionSuggestions.length,
      interventions: interventionSuggestions
    });

  } catch (error) {
    console.error('Personalized intervention suggestion error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});