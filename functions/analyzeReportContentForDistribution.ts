import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { report_id } = body;

    if (!report_id) {
      return Response.json({ error: 'report_id required' }, { status: 400 });
    }

    // Fetch report
    const reports = await base44.entities.MonthlyPerformanceReport.filter({ id: report_id });
    const report = reports?.[0];

    if (!report) {
      return Response.json({ error: 'Report not found' }, { status: 404 });
    }

    // Use LLM to analyze content against distribution rule thresholds
    const prompt = `
    Analyze the following report for distribution rule triggering:
    
    Report Type: ${report.report_type}
    Period: ${report.report_period}
    Status: ${report.status}
    
    Content Summary: ${report.executive_summary}
    Compliance Findings: ${report.compliance_findings}
    Risk Highlights: ${report.risk_highlights}
    
    Extract and quantify:
    {
      critical_incident_rate: number,
      compliance_score: number (0-100),
      risk_level: "critical|high|medium|low",
      goal_attainment_rate: number,
      practitioner_performance_variance: number,
      funding_utilization_percent: number,
      compliance_breaches_count: number,
      content_flags: {
        has_critical_incidents: boolean,
        has_compliance_breaches: boolean,
        shows_declining_trend: boolean,
        requires_escalation: boolean
      },
      distribution_urgency: "immediate|high|standard|low"
    }
    `;

    const contentAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          critical_incident_rate: { type: 'number' },
          compliance_score: { type: 'number' },
          risk_level: { type: 'string' },
          goal_attainment_rate: { type: 'number' },
          practitioner_performance_variance: { type: 'number' },
          funding_utilization_percent: { type: 'number' },
          compliance_breaches_count: { type: 'number' },
          content_flags: {
            type: 'object',
            properties: {
              has_critical_incidents: { type: 'boolean' },
              has_compliance_breaches: { type: 'boolean' },
              shows_declining_trend: { type: 'boolean' },
              requires_escalation: { type: 'boolean' }
            }
          },
          distribution_urgency: { type: 'string' }
        }
      }
    });

    return Response.json({
      success: true,
      report_id,
      content_analysis: contentAnalysis,
      rules_triggered: {
        critical_incident_threshold_exceeded: contentAnalysis.critical_incident_rate > 0.1,
        compliance_score_below_threshold: contentAnalysis.compliance_score < 85,
        requires_immediate_distribution: contentAnalysis.content_flags.requires_escalation,
        requires_escalation_alert: contentAnalysis.content_flags.has_critical_incidents || contentAnalysis.content_flags.has_compliance_breaches
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});