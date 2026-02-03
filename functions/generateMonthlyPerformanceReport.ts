import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { report_type, report_month } = await req.json();

    if (!report_type || !report_month) {
      return Response.json({ error: 'Missing report_type or report_month' }, { status: 400 });
    }

    // Fetch comprehensive data
    const [
      sessions,
      sessionLogs,
      sessionNotes,
      practitioners,
      careerPathways,
      trainingRecommendations,
      clients,
      billingRecords,
      complianceItems,
      riskProfiles
    ] = await Promise.all([
      base44.entities.SessionContext.list(),
      base44.entities.SessionSupportLog.list(),
      base44.entities.SessionNote.list(),
      base44.entities.Practitioner.list(),
      base44.entities.CareerPathway.list(),
      base44.entities.TrainingRecommendation.list(),
      base44.entities.Client.list(),
      base44.entities.BillingRecord.list(),
      base44.entities.ComplianceItem.list(),
      base44.entities.ClientRiskProfile.list()
    ]);

    // Filter data for the report month
    const monthDate = new Date(report_month + '-01');
    const monthStart = monthDate;
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

    const monthSessions = sessions?.filter(s => {
      const sDate = new Date(s.session_date);
      return sDate >= monthStart && sDate <= monthEnd;
    }) || [];

    const monthNotes = sessionNotes?.filter(n => {
      const nDate = new Date(n.session_date);
      return nDate >= monthStart && nDate <= monthEnd;
    }) || [];

    const monthBilling = billingRecords?.filter(b => {
      const bDate = new Date(b.service_date);
      return bDate >= monthStart && bDate <= monthEnd;
    }) || [];

    // Build aggregated metrics
    const practitionerMetrics = {};
    practitioners?.forEach(p => {
      const pSessions = monthSessions.filter(s => s.practitioner_id === p.id);
      const pBilling = monthBilling.filter(b => b.practitioner_id === p.id);
      
      practitionerMetrics[p.id] = {
        name: p.full_name,
        sessions_conducted: pSessions.length,
        billable_hours: pBilling.reduce((sum, b) => sum + (b.duration_hours || 0), 0),
        revenue_generated: pBilling.reduce((sum, b) => sum + (b.total_amount || 0), 0),
        notes_completed: monthNotes.filter(n => n.practitioner_id === p.id).length,
        avg_engagement_score: pSessions.length > 0 
          ? (pSessions.reduce((sum, s) => sum + (s.client_engagement_level || 0), 0) / pSessions.length).toFixed(1)
          : 'N/A'
      };
    });

    // Compile analysis data
    const reportData = {
      report_month,
      total_sessions: monthSessions.length,
      total_billable_hours: monthBilling.reduce((sum, b) => sum + (b.duration_hours || 0), 0),
      total_revenue: monthBilling.reduce((sum, b) => sum + (b.total_amount || 0), 0),
      active_practitioners: practitioners?.length || 0,
      active_clients: clients?.filter(c => c.status === 'active').length || 0,
      compliance_items_status: {
        compliant: complianceItems?.filter(c => c.status === 'compliant').length || 0,
        attention_needed: complianceItems?.filter(c => c.status === 'attention_needed').length || 0,
        non_compliant: complianceItems?.filter(c => c.status === 'non_compliant').length || 0
      },
      high_risk_clients: riskProfiles?.filter(r => r.overall_risk_level === 'high' || r.overall_risk_level === 'critical').length || 0,
      practitioner_metrics: practitionerMetrics,
      training_completions: trainingRecommendations?.filter(t => t.status === 'completed').length || 0
    };

    const prompt = `
Generate a monthly performance and compliance report for an NDIS Behaviour Support provider.

REPORT DATA:
${JSON.stringify(reportData, null, 2)}

Generate comprehensive report in JSON format:
{
  "executive_summary": "High-level overview suitable for senior leadership",
  "key_metrics": {
    "total_sessions_month": number,
    "billable_hours_month": number,
    "revenue_generated": number,
    "practitioner_utilization": "percentage or descriptive",
    "client_engagement_average": "score or percentage"
  },
  "practitioner_highlights": {
    "top_performers": ["name - metric"],
    "areas_of_concern": ["name - issue"],
    "training_completed": number,
    "development_progress": "summary"
  },
  "client_outcomes": {
    "active_clients": number,
    "high_risk_identified": number,
    "engagement_trend": "improving|stable|declining",
    "goal_progress_summary": "summary"
  },
  "compliance_status": {
    "overall_compliance": "percentage",
    "items_requiring_attention": number,
    "critical_items": ["item1", "item2"],
    "audit_readiness": "assessment"
  },
  "financial_overview": {
    "revenue_vs_target": "comparison",
    "billing_accuracy": "assessment",
    "outstanding_issues": ["issue1"]
  },
  "risk_assessment": {
    "high_risk_clients": number,
    "emerging_risks": ["risk1"],
    "recommended_actions": ["action1"]
  },
  "recommendations": [
    "actionable recommendation 1",
    "actionable recommendation 2"
  ],
  "areas_for_improvement": ["area1", "area2"],
  "commendations": ["positive finding 1"]
}

Focus on:
- Objective metrics and compliance status
- Clear identification of areas needing management attention
- Actionable recommendations aligned with NDIS standards
- Recognition of positive outcomes`;

    const reportContent = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          executive_summary: { type: 'string' },
          key_metrics: { type: 'object' },
          practitioner_highlights: { type: 'object' },
          client_outcomes: { type: 'object' },
          compliance_status: { type: 'object' },
          financial_overview: { type: 'object' },
          risk_assessment: { type: 'object' },
          recommendations: { type: 'array', items: { type: 'string' } },
          areas_for_improvement: { type: 'array', items: { type: 'string' } },
          commendations: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    // Create report record
    const report = await base44.entities.MonthlyPerformanceReport.create({
      report_period_month: report_month,
      report_type,
      generated_date: new Date().toISOString(),
      generated_by: user.full_name,
      executive_summary: reportContent.executive_summary,
      key_metrics: JSON.stringify(reportContent.key_metrics),
      practitioner_data: JSON.stringify(reportContent.practitioner_highlights),
      client_outcomes: reportContent.client_outcomes.engagement_trend ? JSON.stringify(reportContent.client_outcomes) : null,
      compliance_findings: JSON.stringify(reportContent.compliance_status),
      risk_highlights: JSON.stringify(reportContent.risk_assessment),
      recommendations: reportContent.recommendations,
      status: 'draft',
      data_sources: ['SessionContext', 'SessionNote', 'CareerPathway', 'BillingRecord', 'ComplianceItem', 'ClientRiskProfile']
    });

    return Response.json({
      success: true,
      report_id: report.id,
      report_period: report_month,
      report_type,
      executive_summary: reportContent.executive_summary
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});