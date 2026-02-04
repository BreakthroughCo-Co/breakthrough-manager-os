import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const [clients, billingRecords, goals] = await Promise.all([
      base44.asServiceRole.entities.Client.filter({ status: 'active' }),
      base44.asServiceRole.entities.BillingRecord.list('-service_date', 500),
      base44.asServiceRole.entities.ClientGoal.list()
    ]);

    const clientFundingProfiles = clients.map(client => {
      const allocated = client.funding_allocated || 0;
      const utilized = client.funding_utilised || 0;
      const remaining = allocated - utilized;
      const utilizationRate = allocated > 0 ? (utilized / allocated) * 100 : 0;

      const planStart = client.plan_start_date ? new Date(client.plan_start_date) : new Date();
      const planEnd = client.plan_end_date ? new Date(client.plan_end_date) : new Date();
      const totalDays = (planEnd - planStart) / (1000 * 60 * 60 * 24);
      const daysElapsed = (new Date() - planStart) / (1000 * 60 * 60 * 24);
      const daysRemaining = (planEnd - new Date()) / (1000 * 60 * 60 * 24);
      
      const expectedUtilizationRate = totalDays > 0 ? (daysElapsed / totalDays) * 100 : 0;
      const utilizationDelta = utilizationRate - expectedUtilizationRate;

      const clientBilling = billingRecords.filter(r => r.client_id === client.id);
      const last30DaysBilling = clientBilling.filter(r => {
        const serviceDate = new Date(r.service_date);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return serviceDate >= thirtyDaysAgo;
      });
      const monthlyBurnRate = last30DaysBilling.reduce((sum, r) => sum + (r.amount || 0), 0);

      const projectedExhaustionDays = monthlyBurnRate > 0 ? (remaining / (monthlyBurnRate / 30)) : 999;

      const clientGoals = goals.filter(g => g.client_id === client.id);
      const goalCompletionRate = clientGoals.length > 0 
        ? clientGoals.reduce((sum, g) => sum + (g.current_progress || 0), 0) / clientGoals.length
        : 0;

      return {
        client_id: client.id,
        client_name: client.full_name,
        funding_allocated: allocated,
        funding_utilized: utilized,
        funding_remaining: remaining,
        utilization_rate: utilizationRate,
        expected_utilization_rate: expectedUtilizationRate,
        utilization_delta: utilizationDelta,
        monthly_burn_rate: monthlyBurnRate,
        projected_exhaustion_days: projectedExhaustionDays,
        days_remaining_in_plan: daysRemaining,
        goal_completion_rate: goalCompletionRate,
        risk_level: utilizationDelta < -20 ? 'underspend_risk' : 
                    projectedExhaustionDays < 30 ? 'exhaustion_risk' : 
                    utilizationDelta > 20 ? 'overspend_risk' : 'on_track'
      };
    });

    const prompt = `
You are an NDIS funding optimization specialist analyzing client portfolio funding utilization.

CLIENT FUNDING PROFILES:
${clientFundingProfiles.slice(0, 30).map(p => 
  `- ${p.client_name}: $${p.funding_utilized.toFixed(0)}/$${p.funding_allocated.toFixed(0)} (${p.utilization_rate.toFixed(1)}%), Burn: $${p.monthly_burn_rate.toFixed(0)}/mo, Exhaustion: ${Math.round(p.projected_exhaustion_days)} days, Risk: ${p.risk_level}`
).join('\n')}

PORTFOLIO TOTALS:
- Total Allocated: $${clientFundingProfiles.reduce((sum, p) => sum + p.funding_allocated, 0).toFixed(0)}
- Total Utilized: $${clientFundingProfiles.reduce((sum, p) => sum + p.funding_utilized, 0).toFixed(0)}
- Average Utilization: ${(clientFundingProfiles.reduce((sum, p) => sum + p.utilization_rate, 0) / clientFundingProfiles.length).toFixed(1)}%

Provide comprehensive funding analysis:
1. BUDGET ALERTS: Clients requiring immediate attention
2. PORTFOLIO HEALTH: Overall funding position and trends
3. REALLOCATION OPPORTUNITIES: Strategic fund redistribution
4. FORECASTED NEEDS: Predicted budget requirements for next quarter
5. OPTIMIZATION STRATEGIES: Evidence-based recommendations
6. RISK MITIGATION: Actions to prevent funding crises

Use NDIS funding management best practices and outcome-focused service delivery principles.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          budget_alerts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                client_name: { type: "string" },
                alert_type: { type: "string" },
                severity: { type: "string" },
                funding_status: { type: "string" },
                immediate_action: { type: "string" },
                timeline: { type: "string" }
              }
            }
          },
          portfolio_health: {
            type: "object",
            properties: {
              overall_status: { type: "string" },
              total_utilization_rate: { type: "number" },
              clients_on_track: { type: "number" },
              clients_at_risk: { type: "number" },
              trend_analysis: { type: "string" }
            }
          },
          reallocation_opportunities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                opportunity: { type: "string" },
                from_client: { type: "string" },
                to_client: { type: "string" },
                amount_suggestion: { type: "number" },
                rationale: { type: "string" },
                expected_impact: { type: "string" }
              }
            }
          },
          forecasted_needs: {
            type: "object",
            properties: {
              next_quarter_budget: { type: "number" },
              funding_gap_predicted: { type: "number" },
              high_priority_clients: { type: "array", items: { type: "string" } },
              contingency_recommendation: { type: "string" }
            }
          },
          optimization_strategies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                strategy: { type: "string" },
                implementation_steps: { type: "array", items: { type: "string" } },
                expected_savings: { type: "string" },
                implementation_difficulty: { type: "string" }
              }
            }
          },
          risk_mitigation: {
            type: "array",
            items: {
              type: "string"
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      analysis: aiResponse,
      client_profiles: clientFundingProfiles,
      summary: {
        total_allocated: clientFundingProfiles.reduce((sum, p) => sum + p.funding_allocated, 0),
        total_utilized: clientFundingProfiles.reduce((sum, p) => sum + p.funding_utilized, 0),
        clients_analyzed: clientFundingProfiles.length
      },
      analyzed_at: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});