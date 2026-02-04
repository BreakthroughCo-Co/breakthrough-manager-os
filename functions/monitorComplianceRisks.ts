import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const [incidents, caseNotes, serviceReports, audits, bsps, restrictivePractices] = await Promise.all([
      base44.asServiceRole.entities.Incident.list('-incident_date', 100),
      base44.asServiceRole.entities.CaseNote.list('-session_date', 200),
      base44.asServiceRole.entities.MonthlyPerformanceReport.list('-generated_date', 50),
      base44.asServiceRole.entities.ComplianceAudit.list('-audit_date', 50),
      base44.asServiceRole.entities.BehaviourSupportPlan.filter({ status: 'active' }),
      base44.asServiceRole.entities.RestrictivePractice.list('-date_used', 100)
    ]);

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const recentIncidents = incidents.filter(i => new Date(i.incident_date) >= last30Days);
    const criticalIncidents = incidents.filter(i => i.severity === 'critical' || i.severity === 'serious_injury');
    const uninvestigatedIncidents = incidents.filter(i => i.status === 'reported' && 
      (new Date() - new Date(i.incident_date)) / (1000 * 60 * 60 * 24) > 5);

    const incompleteCaseNotes = caseNotes.filter(n => 
      n.status === 'draft' || !n.observations || !n.progress_against_goals
    );

    const outdatedBSPs = bsps.filter(b => {
      const reviewDate = new Date(b.next_review_date);
      return reviewDate < new Date();
    });

    const recentRP = restrictivePractices.filter(rp => new Date(rp.date_used) >= last30Days);
    const unauthorizedRP = restrictivePractices.filter(rp => !rp.authorization_status || rp.authorization_status !== 'authorized');

    const prompt = `
You are conducting proactive NDIS compliance monitoring across organizational operations.

INCIDENT MANAGEMENT COMPLIANCE:
- Total Incidents (30d): ${recentIncidents.length}
- Critical/Serious: ${criticalIncidents.length}
- Uninvestigated >5 days: ${uninvestigatedIncidents.length}
- Reportable to NDIS Commission: ${incidents.filter(i => i.severity === 'critical').length}

DOCUMENTATION QUALITY:
- Incomplete Case Notes: ${incompleteCaseNotes.length}
- Draft Service Reports: ${serviceReports.filter(r => r.status === 'draft').length}
- Missing Compliance Items: ${audits.filter(a => a.overall_compliance_score < 80).length}

BEHAVIOUR SUPPORT COMPLIANCE:
- Active BSPs: ${bsps.length}
- Overdue Reviews: ${outdatedBSPs.length}
- Restrictive Practices (30d): ${recentRP.length}
- Unauthorized RP Usage: ${unauthorizedRP.length}

NDIS PRACTICE STANDARDS ANALYSIS:
Assess compliance against:
1. Core Module (Governance & Operational Management)
2. Incident Management & Reporting
3. Behaviour Support & Restrictive Practices
4. Rights & Safeguarding
5. Service Provision & Documentation Quality

Provide:
1. COMPLIANCE RISK ASSESSMENT: Overall risk score and status
2. CRITICAL VIOLATIONS: Immediate attention required
3. DOCUMENTATION GAPS: Incomplete or non-compliant records
4. SYSTEMIC PATTERNS: Recurring compliance issues
5. AUDIT READINESS: Preparedness for external review
6. REMEDIATION ACTIONS: Prioritized corrective measures

Optimize for audit readiness and NDIS Commission compliance.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          overall_compliance_score: { type: "number" },
          compliance_status: { type: "string" },
          risk_level: { type: "string" },
          critical_violations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                violation_type: { type: "string" },
                ndis_standard: { type: "string" },
                severity: { type: "string" },
                affected_records: { type: "string" },
                immediate_action: { type: "string" },
                deadline: { type: "string" }
              }
            }
          },
          documentation_gaps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                gap_type: { type: "string" },
                module: { type: "string" },
                count: { type: "number" },
                impact: { type: "string" },
                remediation: { type: "string" }
              }
            }
          },
          systemic_patterns: {
            type: "array",
            items: {
              type: "object",
              properties: {
                pattern: { type: "string" },
                frequency: { type: "string" },
                root_cause: { type: "string" },
                organizational_fix: { type: "string" }
              }
            }
          },
          audit_readiness: {
            type: "object",
            properties: {
              overall_readiness: { type: "string" },
              strengths: { type: "array", items: { type: "string" } },
              vulnerabilities: { type: "array", items: { type: "string" } },
              preparation_timeline: { type: "string" }
            }
          },
          remediation_plan: {
            type: "array",
            items: {
              type: "object",
              properties: {
                priority: { type: "string" },
                action: { type: "string" },
                responsible_role: { type: "string" },
                deadline: { type: "string" },
                verification_method: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      compliance_assessment: aiResponse,
      data_analyzed: {
        incidents: incidents.length,
        case_notes: caseNotes.length,
        active_bsps: bsps.length,
        recent_audits: audits.length
      },
      assessed_at: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});