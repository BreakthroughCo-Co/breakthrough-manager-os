import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch funding data for all active clients
    const clients = await base44.entities.Client.filter({ status: 'active' });
    const fundingReports = await base44.entities.FundingUtilisationReport.list();

    // Calculate practice-wide funding metrics
    const totalFunding = clients.reduce((sum, c) => sum + (c.funding_allocated || 0), 0);
    const totalUtilised = clients.reduce((sum, c) => sum + (c.funding_utilised || 0), 0);
    const overUtilisedClients = clients.filter(c => c.funding_utilised > c.funding_allocated).length;
    const underUtilisedClients = clients.filter(c => (c.funding_utilised / c.funding_allocated) < 0.3).length;

    // AI-driven trend analysis
    const trendAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyse funding utilisation trends for practice-wide reporting:

Total Allocated Funding: $${totalFunding.toFixed(2)}
Total Utilised to Date: $${totalUtilised.toFixed(2)}
Utilisation Rate: ${(totalUtilised / totalFunding * 100).toFixed(1)}%
Over-Utilised Clients: ${overUtilisedClients}
Under-Utilised Clients: ${underUtilisedClients}
Total Active Clients: ${clients.length}

Recent funding reports: ${fundingReports.slice(-10).map(fr => 
  `${fr.client_name}: $${fr.remaining_funding.toFixed(0)} remaining, ${fr.risk_level} risk`
).join('; ')}

Provide:
1. Funding Trend Summary (YTD utilisation rate vs forecast)
2. Risk Analysis (clients likely to over/under-utilise)
3. Revenue Forecasting (Q1-Q4 estimated claims)
4. Recommendations for optimisation`,
      response_json_schema: {
        type: 'object',
        properties: {
          trend_summary: { type: 'string' },
          risk_analysis: { type: 'string' },
          revenue_forecast: { type: 'object', properties: { q1: { type: 'number' }, q2: { type: 'number' }, q3: { type: 'number' }, q4: { type: 'number' } } },
          optimisation_recommendations: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    // Save report
    const savedReport = await base44.asServiceRole.entities.SavedReport.create({
      report_type: 'funding_utilisation_trend',
      report_date: new Date().toISOString().split('T')[0],
      content: JSON.stringify({
        practice_metrics: {
          total_allocated: totalFunding,
          total_utilised: totalUtilised,
          utilisation_percentage: (totalUtilised / totalFunding * 100).toFixed(1),
          over_utilised_clients: overUtilisedClients,
          under_utilised_clients: underUtilisedClients,
          active_clients: clients.length
        },
        analysis: trendAnalysis
      }),
      generated_by: user.email
    });

    return Response.json({
      report_id: savedReport.id,
      generated_date: new Date().toISOString(),
      practice_metrics: {
        total_allocated: totalFunding,
        total_utilised: totalUtilised,
        utilisation_percentage: (totalUtilised / totalFunding * 100).toFixed(1)
      },
      analysis: trendAnalysis
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});