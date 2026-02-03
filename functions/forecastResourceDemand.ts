import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * AI-Powered Resource Allocation Optimization
 * Forecasts service demand and recommends staffing/resource deployment
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all necessary data
    const [clients, practitioners, billingRecords, programs, tasks] = await Promise.all([
      base44.asServiceRole.entities.Client.list(),
      base44.asServiceRole.entities.Practitioner.list(),
      base44.asServiceRole.entities.BillingRecord.list('-service_date', 200),
      base44.asServiceRole.entities.Program.list(),
      base44.asServiceRole.entities.Task.list('-due_date', 50)
    ]);

    // Analyze service demand by type
    const serviceDemand = {};
    clients.forEach(c => {
      const type = c.service_type || 'General';
      serviceDemand[type] = (serviceDemand[type] || 0) + 1;
    });

    // Analyze billing patterns
    const last90Days = new Date();
    last90Days.setDate(last90Days.getDate() - 90);
    
    const recentBilling = billingRecords.filter(b => new Date(b.service_date) > last90Days);
    const hoursUtilized = {};
    const serviceTypeHours = {};

    recentBilling.forEach(b => {
      const type = b.service_type || 'General';
      hoursUtilized[type] = (hoursUtilized[type] || 0) + (b.duration_hours || 0);
    });

    // Analyze practitioner capacity
    const practitionerUtilization = practitioners.map(p => ({
      id: p.id,
      name: p.full_name,
      role: p.role,
      caseload: p.current_caseload,
      capacity: p.caseload_capacity,
      utilization: (p.current_caseload / p.caseload_capacity * 100).toFixed(1)
    }));

    // Analyze upcoming plan renewals
    const next90Days = new Date();
    next90Days.setDate(next90Days.getDate() + 90);
    
    const upcomingRenewals = clients.filter(c => 
      c.plan_end_date && 
      new Date(c.plan_end_date) > new Date() &&
      new Date(c.plan_end_date) < next90Days
    );

    // Build forecasting context
    const forecastContext = `
RESOURCE ALLOCATION FORECAST:

CURRENT CLIENT DISTRIBUTION BY SERVICE:
${Object.entries(serviceDemand).map(([type, count]) => `- ${type}: ${count} clients`).join('\n')}

RECENT SERVICE UTILIZATION (90 days):
${Object.entries(hoursUtilized).map(([type, hours]) => `- ${type}: ${hours.toFixed(0)} hours`).join('\n')}

PRACTITIONER UTILIZATION:
${practitionerUtilization.map(p => `- ${p.name} (${p.role}): ${p.utilization}% (${p.caseload}/${p.capacity})`).join('\n')}

UPCOMING PLAN RENEWALS (Next 90 days): ${upcomingRenewals.length} clients
${upcomingRenewals.slice(0, 10).map(c => `- ${c.full_name}: Renewal ${new Date(c.plan_end_date).toLocaleDateString()}, Current service: ${c.service_type}`).join('\n')}

ACTIVE PROGRAMS: ${programs.filter(p => p.status === 'active').length}
${programs.filter(p => p.status === 'active').slice(0, 5).map(p => `- ${p.name}: ${p.current_participants}/${p.max_participants} participants`).join('\n')}`;

    const forecast = await base44.integrations.Core.InvokeLLM({
      prompt: `${forecastContext}

Analyze resource allocation and provide:

1. **Service Demand Forecast** (Next 12 months)
   - Demand growth by service type
   - Seasonality patterns
   - Peak periods requiring additional capacity
   - Underutilized service opportunities

2. **Staffing Recommendations**
   - Current gaps vs. future needs
   - Specific practitioner type requirements
   - Recruitment timeline
   - Roles/seniority levels needed
   - Estimated costs

3. **Practitioner Reallocation Opportunities**
   - Unbalanced caseloads (overloaded vs. underutilized)
   - Skill-service matching optimization
   - Cross-training recommendations
   - Mentoring assignments

4. **Program & Resource Expansion**
   - High-demand service expansion opportunities
   - Low-utilization programs to review
   - New program recommendations based on client needs
   - LEGO Therapy expansion feasibility

5. **Efficiency Optimization**
   - Capacity improvements without new hiring
   - Process/workflow enhancements
   - Technology/automation opportunities
   - Cost reduction strategies

6. **Action Plan** (Next 30/90/180 days)
   - Immediate decisions required
   - Recruitment timeline
   - Restructuring/reallocation
   - Monitoring metrics

Be specific with numbers, timelines, and financial implications where possible.`,
      response_json_schema: {
        type: "object",
        properties: {
          demand_forecast: {
            type: "array",
            items: {
              type: "object",
              properties: {
                service_type: { type: "string" },
                current_clients: { type: "number" },
                projected_growth: { type: "string" },
                capacity_gap: { type: "string" },
                priority: { type: "string" }
              }
            }
          },
          staffing_requirements: {
            type: "array",
            items: {
              type: "object",
              properties: {
                position: { type: "string" },
                quantity: { type: "number" },
                urgency: { type: "string" },
                estimated_cost: { type: "string" },
                recruitment_timeline: { type: "string" }
              }
            }
          },
          reallocation_opportunities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                practitioner_name: { type: "string" },
                current_load: { type: "string" },
                recommendation: { type: "string" },
                rationale: { type: "string" }
              }
            }
          },
          program_recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                program_name: { type: "string" },
                type: { type: "string", enum: ["expand", "launch", "review", "sunset"] },
                reasoning: { type: "string" },
                estimated_demand: { type: "string" },
                resource_requirement: { type: "string" }
              }
            }
          },
          efficiency_improvements: { type: "array", items: { type: "string" } },
          action_plan: {
            type: "array",
            items: {
              type: "object",
              properties: {
                phase: { type: "string" },
                actions: { type: "array", items: { type: "string" } },
                timeline: { type: "string" },
                expected_outcome: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({
      forecast_date: new Date().toISOString(),
      total_clients: clients.length,
      total_practitioners: practitioners.length,
      avg_practitioner_utilization: (
        practitionerUtilization.reduce((sum, p) => sum + parseFloat(p.utilization), 0) / practitioners.length
      ).toFixed(1),
      upcoming_plan_renewals: upcomingRenewals.length,
      forecast_analysis: forecast
    });

  } catch (error) {
    console.error('Resource demand forecast error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});