import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * AI-Powered Financial Report Generation & Analysis
 * Generates monthly expenditure summaries, utilization reports, revenue forecasts
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { report_type = 'monthly', year_month = null } = await req.json();

    // Fetch financial data
    const [billingRecords, clients, practitioners] = await Promise.all([
      base44.asServiceRole.entities.BillingRecord.list('-service_date', 500),
      base44.asServiceRole.entities.Client.list(),
      base44.asServiceRole.entities.Practitioner.list()
    ]);

    // Calculate reporting period
    let periodStart, periodEnd;
    if (year_month) {
      const [year, month] = year_month.split('-');
      periodStart = new Date(year, parseInt(month) - 1, 1);
      periodEnd = new Date(year, parseInt(month), 0);
    } else {
      periodEnd = new Date();
      periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1);
    }

    // Filter billing records for period
    const periodBilling = billingRecords.filter(b => {
      const date = new Date(b.service_date);
      return date >= periodStart && date <= periodEnd;
    });

    // Analyze financial metrics
    const totalRevenue = periodBilling.reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const totalHours = periodBilling.reduce((sum, b) => sum + (b.duration_hours || 0), 0);
    const avgHourlyRate = totalHours > 0 ? totalRevenue / totalHours : 0;

    // Analyze by service type
    const revenueByService = {};
    const hoursByService = {};
    periodBilling.forEach(b => {
      const service = b.service_type || 'Other';
      revenueByService[service] = (revenueByService[service] || 0) + (b.total_amount || 0);
      hoursByService[service] = (hoursByService[service] || 0) + (b.duration_hours || 0);
    });

    // Analyze by practitioner
    const revenueByPractitioner = {};
    const clientsByPractitioner = {};
    periodBilling.forEach(b => {
      const prac = b.practitioner_name || 'Unassigned';
      revenueByPractitioner[prac] = (revenueByPractitioner[prac] || 0) + (b.total_amount || 0);
    });

    // Identify billing anomalies (outliers)
    const billingAnomalies = [];
    const avgAmount = totalRevenue / periodBilling.length;
    const stdDev = Math.sqrt(periodBilling.reduce((sum, b) => sum + Math.pow((b.total_amount || 0) - avgAmount, 2), 0) / periodBilling.length);
    
    periodBilling.forEach(b => {
      if (Math.abs((b.total_amount || 0) - avgAmount) > 2 * stdDev) {
        billingAnomalies.push({
          client: b.client_name,
          service: b.service_type,
          amount: b.total_amount,
          date: b.service_date,
          hours: b.duration_hours
        });
      }
    });

    // Build analysis context
    const financialContext = `
FINANCIAL PERIOD: ${periodStart.toLocaleDateString()} to ${periodEnd.toLocaleDateString()}

SUMMARY METRICS:
- Total Revenue: $${totalRevenue.toFixed(2)}
- Total Hours Billed: ${totalHours.toFixed(1)}
- Average Hourly Rate: $${avgHourlyRate.toFixed(2)}
- Billing Records: ${periodBilling.length}

REVENUE BY SERVICE:
${Object.entries(revenueByService).map(([service, revenue]) => {
  const hours = hoursByService[service] || 0;
  return `- ${service}: $${revenue.toFixed(2)} (${hours.toFixed(1)}h @ $${hours > 0 ? (revenue/hours).toFixed(2) : 0}/h)`;
}).join('\n')}

TOP PRACTITIONERS BY REVENUE:
${Object.entries(revenueByPractitioner).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, revenue]) => {
  return `- ${name}: $${revenue.toFixed(2)}`;
}).join('\n')}

ACTIVE CLIENTS: ${clients.filter(c => c.status === 'active').length}
PLAN UTILIZATION: ${(clients.reduce((sum, c) => sum + ((c.funding_utilised / c.funding_allocated) * 100), 0) / clients.length).toFixed(1)}% avg

BILLING ANOMALIES DETECTED: ${billingAnomalies.length}`;

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: `${financialContext}

Analyze financial data and provide:

1. **Executive Summary**
   - Revenue trend (vs previous period if available)
   - Key metrics and KPIs
   - Overall financial health

2. **Service Performance Analysis**
   - Revenue contributors
   - Utilization by service type
   - Underperforming services

3. **Billing Efficiency Review**
   - Billing accuracy assessment
   - Anomalies detected and explanation
   - Data quality issues

4. **Revenue Optimization Opportunities**
   - Potential billing discrepancies to investigate
   - Underutilized capacity areas
   - Service pricing recommendations
   - Cross-selling/expansion opportunities

5. **Practitioner Productivity**
   - Top performers
   - Billable vs non-billable hour ratio
   - Productivity improvement opportunities

6. **Financial Forecast** (Next 90 days)
   - Projected revenue based on current trajectory
   - Plan renewal impact
   - Seasonal adjustments

7. **Action Items** (Priority order)
   - Immediate financial optimization steps
   - Process improvements
   - Investigation required

Be specific with numbers and provide actionable recommendations.`,
      response_json_schema: {
        type: "object",
        properties: {
          executive_summary: { type: "string" },
          revenue_trend: {
            type: "object",
            properties: {
              current_total: { type: "string" },
              status: { type: "string" },
              key_metrics: { type: "array", items: { type: "string" } }
            }
          },
          service_analysis: {
            type: "array",
            items: {
              type: "object",
              properties: {
                service_type: { type: "string" },
                revenue: { type: "string" },
                utilization: { type: "string" },
                performance: { type: "string" }
              }
            }
          },
          billing_efficiency: {
            type: "object",
            properties: {
              accuracy_assessment: { type: "string" },
              anomalies: { type: "array", items: { type: "string" } },
              quality_issues: { type: "array", items: { type: "string" } }
            }
          },
          optimization_opportunities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                opportunity: { type: "string" },
                potential_impact: { type: "string" },
                priority: { type: "string" }
              }
            }
          },
          practitioner_metrics: {
            type: "array",
            items: {
              type: "object",
              properties: {
                practitioner: { type: "string" },
                revenue: { type: "string" },
                productivity: { type: "string" },
                recommendation: { type: "string" }
              }
            }
          },
          revenue_forecast: {
            type: "object",
            properties: {
              ninety_day_projection: { type: "string" },
              plan_renewal_impact: { type: "string" },
              risk_factors: { type: "array", items: { type: "string" } }
            }
          },
          action_items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string" },
                priority: { type: "string" },
                expected_outcome: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({
      report_type,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      total_revenue: totalRevenue,
      total_hours: totalHours,
      avg_hourly_rate: avgHourlyRate,
      billing_records_count: periodBilling.length,
      anomalies_detected: billingAnomalies.length,
      analysis
    });

  } catch (error) {
    console.error('Financial report generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});