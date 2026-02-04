import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      stakeholder_type, 
      report_period_start, 
      report_period_end,
      focus_areas = [],
      include_sections = []
    } = await req.json();

    // Gather data based on period and stakeholder needs
    const clients = await base44.entities.Client.list();
    const practitioners = await base44.entities.Practitioner.list();
    const incidents = await base44.entities.Incident.filter({ 
      incident_date: { $gte: report_period_start, $lte: report_period_end }
    });
    const compliance = await base44.entities.ComplianceItem.list();
    const performanceReports = await base44.entities.MonthlyPerformanceReport.list('-report_period_month', 3);

    // Define stakeholder-specific report templates
    const templates = {
      management: {
        title: "Executive Operations Summary",
        sections: ["executive_summary", "key_metrics", "risk_overview", "resource_utilization", "strategic_recommendations"],
        tone: "strategic and action-oriented"
      },
      compliance_body: {
        title: "NDIS Compliance Status Report",
        sections: ["compliance_overview", "incident_summary", "restrictive_practices", "safeguarding", "quality_assurance", "corrective_actions"],
        tone: "formal and audit-ready"
      },
      funder: {
        title: "Client Outcomes & Service Delivery Report",
        sections: ["service_overview", "client_outcomes", "goal_achievement", "funding_utilization", "quality_indicators"],
        tone: "outcome-focused and transparent"
      },
      board: {
        title: "Organizational Performance Report",
        sections: ["strategic_overview", "financial_summary", "operational_highlights", "risk_management", "growth_initiatives"],
        tone: "high-level and strategic"
      }
    };

    const template = templates[stakeholder_type] || templates.management;

    // Use AI to generate the report
    const reportResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a ${template.title} for ${stakeholder_type} covering the period ${report_period_start} to ${report_period_end}.

Tone: ${template.tone}
Required Sections: ${template.sections.join(', ')}
${focus_areas.length > 0 ? `Special Focus Areas: ${focus_areas.join(', ')}` : ''}

Available Data:
- Active Clients: ${clients.filter(c => c.status === 'active').length}
- Total Practitioners: ${practitioners.length}
- Incidents in Period: ${incidents.length}
- Compliance Status: ${compliance.filter(c => c.status === 'compliant').length}/${compliance.length} items compliant
- Recent Performance Data: ${JSON.stringify(performanceReports.slice(0, 2), null, 2)}

Generate a comprehensive report that:
1. Provides clear executive insights
2. Highlights achievements and areas of concern
3. Includes specific metrics and KPIs
4. Offers actionable recommendations
5. Maintains appropriate tone for ${stakeholder_type}

Format as JSON with:
- executive_summary: 2-3 paragraph overview
- sections: object with each required section containing detailed content
- key_metrics: array of {metric, value, trend, context}
- highlights: array of notable achievements or concerns
- recommendations: array of prioritized actions
- appendices: array of {title, content} for supporting data`,
      response_json_schema: {
        type: "object",
        properties: {
          executive_summary: { type: "string" },
          sections: { type: "object" },
          key_metrics: { 
            type: "array", 
            items: { 
              type: "object",
              properties: {
                metric: { type: "string" },
                value: { type: "string" },
                trend: { type: "string" },
                context: { type: "string" }
              }
            }
          },
          highlights: { type: "array", items: { type: "string" } },
          recommendations: { type: "array", items: { type: "string" } },
          appendices: { 
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                content: { type: "string" }
              }
            }
          }
        }
      }
    });

    // Create report record
    const reportRecord = await base44.asServiceRole.entities.MonthlyPerformanceReport.create({
      report_period_month: report_period_start.substring(0, 7),
      report_type: `stakeholder_${stakeholder_type}`,
      generated_date: new Date().toISOString(),
      generated_by: user.email,
      executive_summary: reportResponse.executive_summary,
      key_metrics: JSON.stringify(reportResponse.key_metrics),
      recommendations: reportResponse.recommendations,
      status: 'draft',
      data_sources: ['clients', 'practitioners', 'incidents', 'compliance', 'performance']
    });

    return Response.json({
      report_id: reportRecord.id,
      stakeholder_type,
      title: template.title,
      report: reportResponse,
      period: { start: report_period_start, end: report_period_end },
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Report generation error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});