import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { template_type, date_range_months = 3 } = await req.json();

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - date_range_months);

    const [
      incidents,
      breaches,
      riskAlerts,
      auditReports,
      restrictivePractices,
      clients
    ] = await Promise.all([
      base44.entities.Incident.list(),
      base44.entities.ComplianceBreach.list(),
      base44.entities.RiskAlert.list(),
      base44.entities.ComplianceAuditReport.list('-audit_date', 10),
      base44.entities.RestrictivePractice.list(),
      base44.entities.Client.filter({ status: 'active' }),
    ]);

    // Filter by date range
    const recentIncidents = incidents.filter(i => new Date(i.incident_date) > startDate);
    const recentBreaches = breaches.filter(b => new Date(b.detected_date) > startDate);
    const recentAlerts = riskAlerts.filter(a => new Date(a.triggered_date) > startDate);

    // NDIS reportable incidents
    const ndisReportable = recentIncidents.filter(i => i.ndis_reportable);
    
    // Restrictive practices analysis
    const activeRP = restrictivePractices.filter(rp => rp.status === 'active');
    const unauthorizedRP = recentIncidents.filter(i => 
      i.category === 'unauthorized_restrictive_practice'
    );

    const contextData = `
COMPLIANCE REPORT GENERATION
Template: ${template_type}
Period: Last ${date_range_months} months
Report Date: ${new Date().toISOString()}

INCIDENT REPORTING:
- Total Incidents: ${recentIncidents.length}
- NDIS Reportable: ${ndisReportable.length}
- High Severity: ${recentIncidents.filter(i => i.severity === 'high' || i.severity === 'critical').length}
- Categories: ${[...new Set(recentIncidents.map(i => i.category))].join(', ')}

COMPLIANCE BREACHES:
- Total Breaches: ${recentBreaches.length}
- By Type: ${[...new Set(recentBreaches.map(b => b.breach_type))].join(', ')}
- Critical: ${recentBreaches.filter(b => b.severity === 'critical').length}
- Remediated: ${recentBreaches.filter(b => b.status === 'remediated').length}

RESTRICTIVE PRACTICES:
- Active Authorizations: ${activeRP.length}
- Unauthorized Use: ${unauthorizedRP.length}

RISK MANAGEMENT:
- Alerts Triggered: ${recentAlerts.length}
- High Risk Clients: ${recentAlerts.filter(a => a.risk_level === 'high' || a.risk_level === 'critical').length}

RECENT AUDITS:
- Last Audit: ${auditReports[0]?.audit_date || 'No recent audits'}
- Compliance Score: ${auditReports[0]?.overall_compliance_score || 'N/A'}

ACTIVE CLIENTS: ${clients.length}

Generate a comprehensive compliance report following NDIS standards.`;

    const report = await base44.integrations.Core.InvokeLLM({
      prompt: `${contextData}\n\nGenerate a detailed compliance report suitable for NDIS submission and internal review.`,
      response_json_schema: {
        type: "object",
        properties: {
          executive_summary: { type: "string" },
          incident_analysis: {
            type: "object",
            properties: {
              overview: { type: "string" },
              trends: { type: "array", items: { type: "string" } },
              ndis_reportable_summary: { type: "string" },
              corrective_actions: { type: "array", items: { type: "string" } }
            }
          },
          compliance_status: {
            type: "object",
            properties: {
              overall_rating: { type: "string" },
              areas_of_concern: { type: "array", items: { type: "string" } },
              strengths: { type: "array", items: { type: "string" } },
              improvement_plan: { type: "array", items: { type: "string" } }
            }
          },
          restrictive_practices_report: {
            type: "object",
            properties: {
              summary: { type: "string" },
              authorization_status: { type: "string" },
              reduction_strategies: { type: "array", items: { type: "string" } }
            }
          },
          risk_management_summary: {
            type: "object",
            properties: {
              overview: { type: "string" },
              high_risk_clients: { type: "string" },
              mitigation_strategies: { type: "array", items: { type: "string" } }
            }
          },
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                area: { type: "string" },
                recommendation: { type: "string" },
                priority: { type: "string" },
                timeframe: { type: "string" }
              }
            }
          },
          next_steps: { type: "array", items: { type: "string" } }
        }
      }
    });

    return Response.json({
      report,
      metadata: {
        template_type,
        date_range_months,
        report_period: {
          start: startDate.toISOString(),
          end: new Date().toISOString(),
        },
        metrics: {
          total_incidents: recentIncidents.length,
          ndis_reportable: ndisReportable.length,
          active_breaches: recentBreaches.filter(b => b.status !== 'remediated').length,
          high_risk_alerts: recentAlerts.filter(a => a.risk_level === 'high' || a.risk_level === 'critical').length,
        },
      },
      generated_by: user.email,
      generated_date: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Compliance report generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});