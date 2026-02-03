import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Can be called by automation or admin user
    let isScheduled = false;
    try {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    } catch {
      isScheduled = true;
    }

    const payload = await req.json().catch(() => ({}));
    const {
      report_type = 'monthly_compliance_summary',
      period_start,
      period_end,
      include_recommendations = true,
    } = payload;

    const today = new Date();
    const start = period_start ? new Date(period_start) : new Date(today.getFullYear(), today.getMonth(), 1);
    const end = period_end ? new Date(period_end) : new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Fetch compliance-related data for the period
    const complianceItems = await base44.asServiceRole.entities.ComplianceItem.list();
    const breaches = await base44.asServiceRole.entities.ComplianceBreach.list();
    const audits = await base44.asServiceRole.entities.ComplianceAudit.list('-audit_date', 50);
    const incidents = await base44.asServiceRole.entities.Incident.list('-incident_date', 100);
    const workerScreenings = await base44.asServiceRole.entities.WorkerScreening.list();
    const riskAlerts = await base44.asServiceRole.entities.RiskAlert.list('-triggered_date', 50);

    // Filter data for the period
    const periodBreaches = breaches.filter(b => {
      const breachDate = new Date(b.identified_date);
      return breachDate >= start && breachDate <= end;
    });

    const periodIncidents = incidents.filter(i => {
      const incidentDate = new Date(i.incident_date);
      return incidentDate >= start && incidentDate <= end;
    });

    const periodAlerts = riskAlerts.filter(a => {
      const alertDate = new Date(a.triggered_date);
      return alertDate >= start && alertDate <= end;
    });

    // Analyze compliance status
    const complianceByCategory = {};
    complianceItems.forEach(item => {
      const cat = item.category || 'Other';
      if (!complianceByCategory[cat]) {
        complianceByCategory[cat] = {
          total: 0,
          compliant: 0,
          attention_needed: 0,
          non_compliant: 0,
        };
      }
      complianceByCategory[cat].total++;
      complianceByCategory[cat][item.status] = (complianceByCategory[cat][item.status] || 0) + 1;
    });

    // Analyze breach patterns
    const breachByCategory = {};
    periodBreaches.forEach(breach => {
      const cat = breach.breach_category || 'Other';
      breachByCategory[cat] = (breachByCategory[cat] || 0) + 1;
    });

    // Analyze incident patterns
    const incidentByCategory = {};
    const incidentBySeverity = { low: 0, moderate: 0, high: 0, critical: 0 };
    periodIncidents.forEach(incident => {
      const cat = incident.category || 'Other';
      incidentByCategory[cat] = (incidentByCategory[cat] || 0) + 1;
      incidentBySeverity[incident.severity_level] = (incidentBySeverity[incident.severity_level] || 0) + 1;
    });

    // Check worker screening compliance
    const screeningsExpiringSoon = workerScreenings.filter(ws => {
      if (ws.expiry_date) {
        const expiryDate = new Date(ws.expiry_date);
        const daysUntilExpiry = (expiryDate - today) / (1000 * 60 * 60 * 24);
        return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
      }
      return false;
    });

    const aiPrompt = `You are an NDIS compliance officer generating a comprehensive compliance report.

REPORT TYPE: ${report_type}
REPORTING PERIOD: ${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}

COMPLIANCE STATUS BY CATEGORY:
${JSON.stringify(complianceByCategory, null, 2)}

BREACHES THIS PERIOD (${periodBreaches.length} total):
${JSON.stringify(breachByCategory, null, 2)}

INCIDENTS THIS PERIOD (${periodIncidents.length} total):
By Category: ${JSON.stringify(incidentByCategory, null, 2)}
By Severity: ${JSON.stringify(incidentBySeverity, null, 2)}

RISK ALERTS THIS PERIOD: ${periodAlerts.length}

WORKER SCREENING STATUS:
- Total screenings: ${workerScreenings.length}
- Expiring within 30 days: ${screeningsExpiringSoon.length}

RECENT AUDIT RESULTS:
${JSON.stringify(audits.slice(0, 3).map(a => ({ date: a.audit_date, finding_count: a.finding_count, score: a.overall_score })), null, 2)}

TASK:
Generate a professional compliance report with:
1. Executive Summary
2. Compliance Status Overview
3. Key Findings & Concerns
4. Breach Analysis & Root Causes
5. Incident Patterns & Trends
6. Risk Assessment
7. ${include_recommendations ? 'Recommendations & Action Items' : ''}
8. Compliance Score/Rating (0-100)

Be specific, data-driven, and actionable. Highlight both strengths and areas for improvement.

Output as JSON:
{
  "report_title": "string",
  "executive_summary": "2-3 paragraph summary",
  "compliance_score": 85,
  "status_overview": {
    "overall_status": "compliant|partially_compliant|non_compliant",
    "category_summaries": {
      "category_name": "status and notes"
    }
  },
  "key_findings": [
    {
      "finding": "description",
      "severity": "critical|high|medium|low",
      "category": "string",
      "impact": "business impact"
    }
  ],
  "breach_analysis": {
    "total_breaches": 5,
    "by_category": {},
    "root_causes": ["cause1", "cause2"],
    "trends": "description of patterns"
  },
  "incident_analysis": {
    "total_incidents": 10,
    "severity_distribution": {},
    "patterns": "description",
    "preventable_rate": "estimated %"
  },
  "risk_assessment": {
    "current_risk_level": "low|medium|high|critical",
    "emerging_risks": ["risk1", "risk2"],
    "mitigation_status": "description"
  },
  "recommendations": [
    {
      "recommendation": "specific action",
      "priority": "critical|high|medium|low",
      "target_category": "string",
      "expected_impact": "description",
      "implementation_timeline": "immediate|1 week|1 month|3 months"
    }
  ],
  "action_items": [
    {
      "action": "specific task",
      "responsible_party": "role",
      "due_date": "timeline",
      "status": "pending"
    }
  ],
  "conclusion": "final summary and outlook"
}`;

    const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: aiPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          report_title: { type: 'string' },
          executive_summary: { type: 'string' },
          compliance_score: { type: 'number' },
          status_overview: {
            type: 'object',
            properties: {
              overall_status: { type: 'string' },
              category_summaries: { type: 'object' },
            },
          },
          key_findings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                finding: { type: 'string' },
                severity: { type: 'string' },
                category: { type: 'string' },
                impact: { type: 'string' },
              },
            },
          },
          breach_analysis: { type: 'object' },
          incident_analysis: { type: 'object' },
          risk_assessment: { type: 'object' },
          recommendations: { type: 'array', items: { type: 'object' } },
          action_items: { type: 'array', items: { type: 'object' } },
          conclusion: { type: 'string' },
        },
      },
    });

    // Save report to database
    const savedReport = await base44.asServiceRole.entities.SavedReport.create({
      report_name: aiResult.report_title,
      report_type: report_type,
      report_category: 'compliance',
      period_start: start.toISOString().split('T')[0],
      period_end: end.toISOString().split('T')[0],
      report_data: JSON.stringify(aiResult),
      generated_by: isScheduled ? 'Automated System' : user?.email,
      generated_date: today.toISOString(),
    });

    return Response.json({
      success: true,
      report_id: savedReport.id,
      report: aiResult,
      metadata: {
        period: { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] },
        data_summary: {
          breaches: periodBreaches.length,
          incidents: periodIncidents.length,
          alerts: periodAlerts.length,
          compliance_items_reviewed: complianceItems.length,
        },
      },
    });
  } catch (error) {
    console.error('Auto compliance report generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});