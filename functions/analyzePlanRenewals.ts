import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * NDIS Plan Renewal Analysis & Management
 * Analyzes upcoming renewals for budget adjustments, suggests goal adjustments, generates communications
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch plan and client data
    const [clients, goals, caseNotes, billingRecords, incidents] = await Promise.all([
      base44.entities.Client.list(),
      base44.entities.ClientGoal.list(),
      base44.entities.CaseNote.list('-session_date', 300),
      base44.entities.BillingRecord.list('-service_date', 200),
      base44.entities.Incident.list('-incident_date', 100)
    ]);

    // Identify clients with upcoming plan renewals (next 90 days)
    const now = new Date();
    const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const upcomingRenewals = clients.filter(c =>
      c.plan_end_date &&
      new Date(c.plan_end_date) > now &&
      new Date(c.plan_end_date) <= in90Days
    );

    // Analyze each renewal candidate
    const renewalAnalysis = upcomingRenewals.map(client => {
      const clientGoals = goals.filter(g => g.client_id === client.id);
      const clientNotes = caseNotes.filter(cn => cn.client_id === client.id);
      const clientBilling = billingRecords.filter(b => b.client_id === client.id);
      const clientIncidents = incidents.filter(i => i.client_id === client.id);

      // Calculate service utilization
      const totalBilled = clientBilling.reduce((sum, b) => sum + (b.total_amount || 0), 0);
      const utilizationRate = (totalBilled / client.funding_allocated) * 100;

      // Analyze goal progress
      const achievedGoals = clientGoals.filter(g => g.status === 'achieved').length;
      const progressingGoals = clientGoals.filter(g => g.status === 'in_progress' || g.status === 'on_track').length;

      return {
        client_id: client.id,
        client_name: client.full_name,
        current_plan_end: client.plan_end_date,
        months_remaining: Math.ceil((new Date(client.plan_end_date) - now) / (30 * 24 * 60 * 60 * 1000)),
        current_funding: client.funding_allocated,
        funding_utilised: client.funding_utilised,
        utilization_percentage: utilizationRate.toFixed(1),
        total_goals: clientGoals.length,
        achieved_goals: achievedGoals,
        progressing_goals: progressingGoals,
        recent_session_count: clientNotes.length,
        recent_incidents: clientIncidents.length
      };
    });

    // Build renewal analysis context
    const renewalContext = `
PLAN RENEWAL ANALYSIS - ${upcomingRenewals.length} clients

UPCOMING RENEWALS:
${renewalAnalysis.slice(0, 10).map(r =>
  `- ${r.client_name}: Expires ${r.current_plan_end}, ${r.months_remaining}m remaining, ${r.utilization_percentage}% utilized, ${r.achieved_goals}/${r.total_goals} goals achieved`
).join('\n')}`;

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: `${renewalContext}

Analyze NDIS plan renewals and provide:

1. **Budget Adjustment Forecast** (For each renewal candidate)
   - Current plan funding
   - Projected spend by renewal date
   - Recommended adjustment (increase/decrease/maintain)
   - Rationale for adjustment
   - Risk if not adjusted

2. **Goal Adjustment Recommendations**
   - Goals likely to be achieved by renewal date
   - Goals requiring continuation/modification
   - New goals based on predicted outcomes
   - NDIS domain alignment

3. **Service Intensity Recommendations**
   - Current intensity vs optimal intensity
   - Rationale for changes
   - Expected outcome impact

4. **Plan Review Communication Draft** (For each client)
   - Client-friendly summary of progress
   - Achievements to celebrate
   - Areas for continued focus
   - Proposed adjustments explained
   - Next steps and timeline

5. **Risk Factors for Renewal**
   - Clients likely to disengage
   - Funding gaps or shortfalls
   - Emerging needs not yet captured
   - Service gaps

6. **Timeline & Milestones**
   - When to initiate renewal conversation (weeks before expiry)
   - Documentation deadlines
   - Communication schedule
   - Approval milestones

7. **Batch Processing Recommendation**
   - Prioritization of renewals by urgency
   - Resource planning for renewal workload

Focus on practical NDIS planning considerations and realistic budget scenarios.`,
      response_json_schema: {
        type: "object",
        properties: {
          renewal_candidates: {
            type: "array",
            items: {
              type: "object",
              properties: {
                client_name: { type: "string" },
                plan_end_date: { type: "string" },
                current_funding: { type: "string" },
                budget_adjustment_recommendation: { type: "string" },
                adjustment_rationale: { type: "string" },
                new_budget_estimate: { type: "string" },
                goal_adjustments: { type: "array", items: { type: "string" } },
                service_intensity_recommendation: { type: "string" },
                key_risks: { type: "array", items: { type: "string" } }
              }
            }
          },
          plan_review_templates: {
            type: "array",
            items: {
              type: "object",
              properties: {
                client_name: { type: "string" },
                progress_summary: { type: "string" },
                achievements: { type: "array", items: { type: "string" } },
                continued_focus: { type: "array", items: { type: "string" } },
                proposed_changes: { type: "string" },
                next_steps: { type: "string" }
              }
            }
          },
          renewal_timeline: {
            type: "array",
            items: {
              type: "object",
              properties: {
                weeks_before_expiry: { type: "number" },
                action: { type: "string" },
                responsible_person: { type: "string" }
              }
            }
          },
          batch_processing_plan: {
            type: "object",
            properties: {
              total_renewals: { type: "number" },
              priority_order: { type: "array", items: { type: "string" } },
              estimated_workload_hours: { type: "string" },
              resource_recommendation: { type: "string" }
            }
          }
        }
      }
    });

    return Response.json({
      analysis_date: new Date().toISOString(),
      upcoming_renewals_count: upcomingRenewals.length,
      renewal_summaries: renewalAnalysis,
      analysis
    });

  } catch (error) {
    console.error('Plan renewal analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});