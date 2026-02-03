import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { report_id, recipient_role } = body;

    if (!report_id || !recipient_role) {
      return Response.json({ error: 'report_id and recipient_role required' }, { status: 400 });
    }

    // Fetch the report
    const reports = await base44.entities.MonthlyPerformanceReport.filter({ id: report_id });
    const report = reports?.[0];

    if (!report) {
      return Response.json({ error: 'Report not found' }, { status: 404 });
    }

    // Determine role-specific context and prompting
    const roleContext = {
      clinical_lead: {
        focus: 'clinical effectiveness, risk management, intervention outcomes, practitioner capability',
        tone: 'clinical-focused, evidence-based'
      },
      finance_manager: {
        focus: 'funding utilization, billing efficiency, cost trends, resource allocation',
        tone: 'financial, analytical'
      },
      compliance_officer: {
        focus: 'compliance status, risk breaches, audit findings, regulatory alignment',
        tone: 'formal, audit-focused'
      },
      admin: {
        focus: 'operational metrics, workload, staffing, process efficiency',
        tone: 'operational, actionable'
      }
    };

    const context = roleContext[recipient_role] || roleContext.admin;

    const prompt = `
    Generate a concise, role-specific executive summary for a ${recipient_role}:
    
    Report Type: ${report.report_type}
    Report Period: ${report.report_period}
    Executive Summary: ${report.executive_summary}
    
    Key Metrics: ${report.key_metrics}
    Compliance Findings: ${report.compliance_findings}
    Risk Highlights: ${report.risk_highlights}
    Recommendations: ${report.recommendations?.join(', ')}
    
    Role Context: Focus on ${context.focus}
    Tone: ${context.tone}
    
    Create a 2-3 paragraph summary tailored to this role's decision-making needs:
    {
      role_specific_summary: "...",
      key_takeaways: ["..."],
      action_items_for_role: ["..."],
      escalation_flags: ["..."],
      supporting_metrics: { key: "value" }
    }
    `;

    const summary = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          role_specific_summary: { type: 'string' },
          key_takeaways: { type: 'array', items: { type: 'string' } },
          action_items_for_role: { type: 'array', items: { type: 'string' } },
          escalation_flags: { type: 'array', items: { type: 'string' } },
          supporting_metrics: { type: 'object' }
        }
      }
    });

    return Response.json({
      success: true,
      report_id,
      recipient_role,
      role_specific_summary: summary,
      generated_date: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});