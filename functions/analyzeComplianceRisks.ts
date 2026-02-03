import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Proactive NDIS Compliance Risk Analysis
 * Analyzes incident reports, audit findings, compliance items to identify risks
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch compliance data
    const [complianceItems, incidents, auditReports, breaches, riskAlerts] = await Promise.all([
      base44.asServiceRole.entities.ComplianceItem.list(),
      base44.asServiceRole.entities.Incident.list('-incident_date', 50),
      base44.asServiceRole.entities.ComplianceAuditReport.list('-audit_date', 20),
      base44.asServiceRole.entities.ComplianceBreach.list('-breach_date', 30),
      base44.asServiceRole.entities.RiskAlert.filter({ status: 'active' })
    ]);

    // Analyze compliance status
    const complianceStatus = {
      compliant: complianceItems.filter(c => c.status === 'compliant').length,
      attention_needed: complianceItems.filter(c => c.status === 'attention_needed').length,
      non_compliant: complianceItems.filter(c => c.status === 'non_compliant').length,
      pending_review: complianceItems.filter(c => c.status === 'pending_review').length
    };

    const nonCompliantItems = complianceItems.filter(c => c.status === 'non_compliant' || c.status === 'attention_needed');
    const criticalItems = nonCompliantItems.filter(c => c.priority === 'critical' || c.priority === 'high');

    // Analyze incident patterns
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    const recentIncidents = incidents.filter(i => new Date(i.incident_date) > last30Days);

    const incidentsByCategory = {};
    recentIncidents.forEach(i => {
      const cat = i.category || 'other';
      incidentsByCategory[cat] = (incidentsByCategory[cat] || 0) + 1;
    });

    // Build risk analysis context
    const riskContext = `
COMPLIANCE RISK ASSESSMENT:

COMPLIANCE STATUS:
- Compliant: ${complianceStatus.compliant}
- Attention Needed: ${complianceStatus.attention_needed}
- Non-Compliant: ${complianceStatus.non_compliant}
- Pending Review: ${complianceStatus.pending_review}

CRITICAL/HIGH PRIORITY GAPS: ${criticalItems.length}
${criticalItems.slice(0, 10).map(c => `- ${c.title} (${c.priority}): Due ${c.due_date}`).join('\n')}

RECENT INCIDENTS (Last 30 Days): ${recentIncidents.length}
${Object.entries(incidentsByCategory).map(([cat, count]) => `- ${cat}: ${count}`).join('\n')}

COMPLIANCE BREACHES: ${breaches.length}
${breaches.slice(0, 5).map(b => `- ${b.breach_type}: ${b.severity}`).join('\n')}

ACTIVE RISK ALERTS: ${riskAlerts.length}`;

    const riskAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt: `${riskContext}

Conduct a comprehensive NDIS compliance risk assessment:

1. **Critical Risk Areas** - Highest priority compliance risks
   - Risk identification and severity (critical, high, medium)
   - NDIS Standard affected
   - Regulatory impact
   - Immediate mitigation actions (next 7 days)

2. **Root Cause Analysis** - Why are these risks occurring?
   - Process gaps
   - Resource constraints
   - Knowledge/training gaps
   - System/documentation issues

3. **Risk Escalation Patterns** - Are risks worsening?
   - Trend analysis (improving vs. deteriorating)
   - Repeat incident patterns
   - Systemic vs. isolated issues

4. **Compliance Score** - Overall risk rating
   - Current compliance health (0-100)
   - Risk trajectory
   - Months to critical if unaddressed

5. **Mitigation Strategy** - Prioritized action plan
   - Quick wins (implement in 1-2 weeks)
   - Medium-term fixes (1-3 months)
   - Long-term improvements (3-12 months)
   - Success metrics for each phase

6. **Regulatory Exposure** - Potential consequences
   - NDIS suspension risk
   - Audit findings likelihood
   - Financial/reputational impact
   - Reporting obligations

Be specific to NDIS Quality Standards and NDIS Code of Conduct.`,
      response_json_schema: {
        type: "object",
        properties: {
          compliance_score: { type: "number", minimum: 0, maximum: 100 },
          risk_level: { type: "string", enum: ["critical", "high", "medium", "low"] },
          critical_risks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                risk: { type: "string" },
                severity: { type: "string" },
                ndis_standard: { type: "string" },
                immediate_action: { type: "string" },
                timeframe: { type: "string" }
              }
            }
          },
          root_causes: { type: "array", items: { type: "string" } },
          risk_trends: {
            type: "object",
            properties: {
              direction: { type: "string", enum: ["improving", "stable", "deteriorating"] },
              repeat_patterns: { type: "array", items: { type: "string" } },
              systemic_issues: { type: "array", items: { type: "string" } }
            }
          },
          mitigation_roadmap: {
            type: "array",
            items: {
              type: "object",
              properties: {
                phase: { type: "string" },
                actions: { type: "array", items: { type: "string" } },
                timeline: { type: "string" },
                success_metrics: { type: "array", items: { type: "string" } }
              }
            }
          },
          regulatory_exposure: {
            type: "object",
            properties: {
              suspension_risk: { type: "string" },
              audit_finding_likelihood: { type: "string" },
              reporting_obligations: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    });

    // Create risk forecast records
    for (const risk of riskAnalysis.critical_risks.slice(0, 5)) {
      await base44.asServiceRole.entities.ComplianceRiskForecast.create({
        risk_area: risk.risk,
        risk_category: risk.ndis_standard,
        probability: risk.severity === 'critical' ? 95 : 75,
        impact: risk.severity,
        contributing_factors: JSON.stringify(riskAnalysis.root_causes),
        recommended_actions: JSON.stringify([risk.immediate_action]),
        forecast_date: new Date().toISOString().split('T')[0],
        confidence_score: 85,
        time_to_materialize: 'immediate',
        status: 'forecasted'
      });
    }

    return Response.json({
      analysis_date: new Date().toISOString(),
      compliance_status: complianceStatus,
      total_non_compliant: nonCompliantItems.length,
      critical_items: criticalItems.length,
      recent_incidents_30d: recentIncidents.length,
      active_breaches: breaches.length,
      active_risk_alerts: riskAlerts.length,
      analysis: riskAnalysis
    });

  } catch (error) {
    console.error('Compliance risk analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});