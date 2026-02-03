import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Client Attrition & Growth Forecasting
 * Predicts retention risk and identifies growth opportunities
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch client and engagement data
    const [clients, billingRecords, caseNotes, communications, feedback] = await Promise.all([
      base44.entities.Client.list(),
      base44.entities.BillingRecord.list('-service_date', 200),
      base44.entities.CaseNote.list('-session_date', 300),
      base44.entities.ClientCommunication.list('-sent_date', 150),
      base44.entities.ClientFeedback.list('-created_date', 50)
    ]);

    // Calculate engagement metrics for each client
    const clientMetrics = clients.map(c => {
      const last90Days = new Date();
      last90Days.setDate(last90Days.getDate() - 90);

      const cBilling = billingRecords.filter(b => b.client_id === c.id);
      const cNotes = caseNotes.filter(cn => cn.client_id === c.id && new Date(cn.session_date) > last90Days);
      const cComms = communications.filter(cm => cm.client_id === c.id && new Date(cm.sent_date) > last90Days);
      const cFeedback = feedback.filter(f => f.client_id === c.id);

      // Calculate engagement score (0-100)
      const sessionsLast90 = cNotes.length;
      const communicationsLast90 = cComms.length;
      const avgBillingHours = cBilling.length > 0 
        ? cBilling.reduce((sum, b) => sum + (b.duration_hours || 0), 0) / cBilling.length
        : 0;
      
      const engagementScore = Math.min(100, 
        (sessionsLast90 * 5) + (communicationsLast90 * 3) + (avgBillingHours * 2)
      );

      // Calculate funding utilization
      const fundingUsagePercent = c.funding_allocated > 0 
        ? (c.funding_utilised / c.funding_allocated) * 100
        : 0;

      // Days until plan expiry
      const daysUntilExpiry = c.plan_end_date 
        ? Math.ceil((new Date(c.plan_end_date) - new Date()) / (1000 * 60 * 60 * 24))
        : null;

      // Average feedback rating
      const avgFeedback = cFeedback.length > 0
        ? cFeedback.reduce((sum, f) => sum + (f.rating || 0), 0) / cFeedback.length
        : null;

      return {
        client_id: c.id,
        client_name: c.full_name,
        service_type: c.service_type,
        risk_level: c.risk_level,
        status: c.status,
        engagement_score: engagementScore.toFixed(1),
        sessions_last_90d: sessionsLast90,
        communications_last_90d: communicationsLast90,
        avg_billing_hours: avgBillingHours.toFixed(2),
        funding_utilization: fundingUsagePercent.toFixed(1),
        days_until_plan_expiry: daysUntilExpiry,
        avg_feedback_rating: avgFeedback ? avgFeedback.toFixed(2) : null,
        total_sessions: cNotes.length,
        months_with_service: Math.ceil(cBilling.length / 4) // Rough estimate
      };
    });

    // Build forecasting context
    const forecastContext = `
CLIENT ENGAGEMENT & RETENTION ANALYSIS:

HIGH ENGAGEMENT CLIENTS (Retention Risk: LOW):
${clientMetrics.filter(m => parseFloat(m.engagement_score) >= 70).slice(0, 10).map(m =>
  `- ${m.client_name}: ${m.engagement_score}/100 engagement, ${m.sessions_last_90d} sessions`
).join('\n')}

MEDIUM ENGAGEMENT CLIENTS (Retention Risk: MODERATE):
${clientMetrics.filter(m => parseFloat(m.engagement_score) >= 40 && parseFloat(m.engagement_score) < 70).slice(0, 10).map(m =>
  `- ${m.client_name}: ${m.engagement_score}/100 engagement, ${m.sessions_last_90d} sessions`
).join('\n')}

LOW ENGAGEMENT CLIENTS (Retention Risk: HIGH):
${clientMetrics.filter(m => parseFloat(m.engagement_score) < 40).slice(0, 10).map(m =>
  `- ${m.client_name}: ${m.engagement_score}/100 engagement, ${m.sessions_last_90d} sessions, ${m.avg_feedback_rating ? 'Feedback: ' + m.avg_feedback_rating + '/5' : 'No feedback'}`
).join('\n')}

FUNDING UTILIZATION:
- High utilization (>80%): ${clientMetrics.filter(m => parseFloat(m.funding_utilization) > 80).length} clients
- Medium utilization (40-80%): ${clientMetrics.filter(m => parseFloat(m.funding_utilization) >= 40 && parseFloat(m.funding_utilization) <= 80).length} clients
- Low utilization (<40%): ${clientMetrics.filter(m => parseFloat(m.funding_utilization) < 40).length} clients

UPCOMING PLAN RENEWALS:
${clientMetrics.filter(m => m.days_until_plan_expiry && m.days_until_plan_expiry <= 90).slice(0, 10).map(m =>
  `- ${m.client_name}: Expires in ${m.days_until_plan_expiry} days`
).join('\n')}

SERVICE EXPANSION OPPORTUNITIES:
${clientMetrics.filter(m => parseFloat(m.funding_utilization) > 60 && parseFloat(m.funding_utilization) < 90 && parseFloat(m.engagement_score) > 60).slice(0, 10).map(m =>
  `- ${m.client_name}: High engagement (${m.engagement_score}/100), room for service growth`
).join('\n')}`;

    const forecast = await base44.integrations.Core.InvokeLLM({
      prompt: `${forecastContext}

Analyze client engagement and business trends to provide:

1. **Attrition Risk Assessment** - Clients at highest risk of disengagement or plan non-renewal
   - List top 5 at-risk clients with specific retention strategies
   
2. **Retention Strategies** - Specific actions to improve retention for at-risk clients
   
3. **Growth Opportunities** - Clients ideal for service expansion
   - Identify clients with capacity and engagement to take additional services
   - Suggest service combinations or expansions
   
4. **Revenue Optimization** - Underutilized funding that could be captured
   
5. **Plan Renewal Priorities** - Clients approaching plan expiry requiring proactive engagement
   
6. **Engagement Improvement Plan** - For low-engagement clients, specific actions to increase connection

7. **Business Forecasting** - Predict retention rate and potential revenue impact over next 12 months

Be specific with client names and actionable recommendations tied to actual metrics.`,
      response_json_schema: {
        type: "object",
        properties: {
          attrition_risk: {
            type: "array",
            items: {
              type: "object",
              properties: {
                client_name: { type: "string" },
                risk_level: { type: "string", enum: ["high", "medium", "low"] },
                risk_indicators: { type: "array", items: { type: "string" } },
                retention_strategy: { type: "string" }
              }
            }
          },
          growth_opportunities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                client_name: { type: "string" },
                current_service: { type: "string" },
                recommended_expansion: { type: "string" },
                revenue_potential: { type: "string" }
              }
            }
          },
          revenue_optimization: {
            type: "array",
            items: { type: "string" }
          },
          plan_renewal_priorities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                client_name: { type: "string" },
                days_until_expiry: { type: "number" },
                engagement_status: { type: "string" },
                renewal_action: { type: "string" }
              }
            }
          },
          engagement_improvements: { type: "array", items: { type: "string" } },
          business_forecast: {
            type: "object",
            properties: {
              predicted_retention_rate: { type: "string" },
              expected_revenue_impact: { type: "string" },
              growth_potential: { type: "string" },
              key_initiatives: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    });

    return Response.json({
      analysis_date: new Date().toISOString(),
      total_clients_analyzed: clientMetrics.length,
      client_metrics: clientMetrics,
      forecast_analysis: forecast,
      key_metrics: {
        high_engagement: clientMetrics.filter(m => parseFloat(m.engagement_score) >= 70).length,
        medium_engagement: clientMetrics.filter(m => parseFloat(m.engagement_score) >= 40 && parseFloat(m.engagement_score) < 70).length,
        low_engagement: clientMetrics.filter(m => parseFloat(m.engagement_score) < 40).length,
        high_funding_utilization: clientMetrics.filter(m => parseFloat(m.funding_utilization) > 80).length,
        approaching_plan_renewal: clientMetrics.filter(m => m.days_until_plan_expiry && m.days_until_plan_expiry <= 90).length
      }
    });

  } catch (error) {
    console.error('Client trends prediction error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});