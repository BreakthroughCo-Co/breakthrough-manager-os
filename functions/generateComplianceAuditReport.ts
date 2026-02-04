import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Run comprehensive compliance analysis
    const complianceData = await base44.asServiceRole.functions.invoke('analyzeNDISCompliance');
    
    if (!complianceData.data?.success) {
      throw new Error('Compliance analysis failed');
    }

    const analysis = complianceData.data;

    const prompt = `
You are an NDIS compliance auditor generating a comprehensive audit report for management.

COMPLIANCE ANALYSIS DATA:
- Overall Score: ${analysis.compliance_score}/100
- Total Issues Identified: ${analysis.total_issues}
- Critical Issues: ${analysis.critical_issues}
- High Priority: ${analysis.high_priority}
- Medium Priority: ${analysis.medium_priority}

ISSUE BREAKDOWN:
${JSON.stringify(analysis.issues_by_category, null, 2)}

Generate a comprehensive compliance audit report including:
1. EXECUTIVE SUMMARY: High-level overview of compliance status
2. CRITICAL FINDINGS: Immediate attention items with specific NDIS Practice Standards
3. COMPLIANCE GAPS: Systematic issues requiring remediation
4. RISK ASSESSMENT: Potential regulatory exposure and consequences
5. ACTIONABLE RECOMMENDATIONS: Prioritized steps with responsible parties
6. NDIS PRACTICE STANDARDS MAPPING: Specific standards requiring attention with section references
7. TIMELINE FOR REMEDIATION: Realistic implementation schedule
8. MONITORING PLAN: How to prevent recurrence

Reference specific NDIS Practice Standards (e.g., Core Module 1.1, Registration Module 5.2).
Use audit-ready language suitable for NDIS Commission review.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          executive_summary: { type: "string" },
          compliance_status: { type: "string" },
          audit_date: { type: "string" },
          critical_findings: {
            type: "array",
            items: {
              type: "object",
              properties: {
                finding: { type: "string" },
                ndis_standard: { type: "string" },
                section_reference: { type: "string" },
                severity: { type: "string" },
                immediate_action: { type: "string" },
                responsible_party: { type: "string" }
              }
            }
          },
          compliance_gaps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                gap_area: { type: "string" },
                affected_processes: { type: "array", items: { type: "string" } },
                root_cause: { type: "string" },
                remediation_strategy: { type: "string" }
              }
            }
          },
          risk_assessment: {
            type: "object",
            properties: {
              overall_risk_level: { type: "string" },
              regulatory_exposure: { type: "string" },
              potential_consequences: { type: "array", items: { type: "string" } },
              mitigation_priority: { type: "string" }
            }
          },
          actionable_recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                recommendation: { type: "string" },
                priority: { type: "string" },
                responsible_role: { type: "string" },
                estimated_effort: { type: "string" },
                dependencies: { type: "array", items: { type: "string" } }
              }
            }
          },
          ndis_standards_attention: {
            type: "array",
            items: {
              type: "object",
              properties: {
                standard_module: { type: "string" },
                standard_number: { type: "string" },
                standard_title: { type: "string" },
                compliance_status: { type: "string" },
                required_actions: { type: "array", items: { type: "string" } }
              }
            }
          },
          remediation_timeline: {
            type: "array",
            items: {
              type: "object",
              properties: {
                phase: { type: "string" },
                duration: { type: "string" },
                deliverables: { type: "array", items: { type: "string" } },
                milestones: { type: "array", items: { type: "string" } }
              }
            }
          },
          monitoring_plan: {
            type: "object",
            properties: {
              review_frequency: { type: "string" },
              key_indicators: { type: "array", items: { type: "string" } },
              reporting_structure: { type: "string" },
              escalation_criteria: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    });

    // Create audit report record
    const reportRecord = await base44.asServiceRole.entities.ComplianceAuditReport.create({
      audit_date: new Date().toISOString(),
      overall_compliance_score: analysis.compliance_score,
      critical_findings_count: analysis.critical_issues,
      report_summary: aiResponse.executive_summary,
      status: 'draft',
      generated_by: user.email
    }).catch(() => null);

    return Response.json({
      success: true,
      audit_report: aiResponse,
      raw_analysis: analysis,
      report_id: reportRecord?.id,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});