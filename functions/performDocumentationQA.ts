import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { document_type, document_id } = await req.json();

    let document, relatedData = {};

    if (document_type === 'case_note') {
      document = await base44.asServiceRole.entities.CaseNote.get(document_id);
      const [client, bsp, goals] = await Promise.all([
        base44.asServiceRole.entities.Client.get(document.client_id).catch(() => null),
        base44.asServiceRole.entities.BehaviourSupportPlan.filter({ 
          client_id: document.client_id, 
          status: 'active' 
        }).then(p => p[0]).catch(() => null),
        base44.asServiceRole.entities.ClientGoal.filter({ client_id: document.client_id })
      ]);
      relatedData = { client, bsp, goals };
    } else if (document_type === 'service_report') {
      document = await base44.asServiceRole.entities.MonthlyPerformanceReport.get(document_id);
    }

    const prompt = `
You are conducting automated quality assurance on NDIS documentation for compliance and completeness.

DOCUMENT TYPE: ${document_type}
DOCUMENT CONTENT:
${JSON.stringify(document, null, 2)}

${relatedData.client ? `
CLIENT CONTEXT:
- Service Type: ${relatedData.client.service_type}
- Risk Level: ${relatedData.client.risk_level || 'medium'}

ACTIVE BSP: ${relatedData.bsp ? 'Yes' : 'No'}
ACTIVE GOALS: ${relatedData.goals?.length || 0}
` : ''}

Conduct comprehensive QA check against NDIS Practice Standards and internal policies:

REQUIRED CHECKS:
1. COMPLETENESS: All mandatory fields populated
2. COMPLIANCE: Adherence to NDIS reporting requirements
3. CONSISTENCY: Internal data consistency and logic
4. CLINICAL QUALITY: Professional language, objective observations
5. GOAL ALIGNMENT: Progress linked to client goals
6. RISK DOCUMENTATION: Adequate risk assessment and management
7. EVIDENCE BASE: Interventions justified and documented
8. AUDIT READINESS: Sufficient detail for external review

For case notes specifically:
- Observations must be objective and measurable
- Interventions must reference support plan
- Progress must be quantifiable
- Risk considerations documented
- NDIS billable time justified

For service reports specifically:
- All required metrics present
- Data consistent with source records
- Compliance statements accurate
- Recommendations evidence-based

Identify gaps, flag concerns, suggest corrections.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          overall_compliance_score: { type: "number" },
          compliance_status: { type: "string" },
          critical_issues: {
            type: "array",
            items: {
              type: "object",
              properties: {
                issue: { type: "string" },
                severity: { type: "string" },
                ndis_standard_reference: { type: "string" },
                required_action: { type: "string" }
              }
            }
          },
          completeness_check: {
            type: "object",
            properties: {
              missing_fields: { type: "array", items: { type: "string" } },
              incomplete_sections: { type: "array", items: { type: "string" } },
              completeness_percentage: { type: "number" }
            }
          },
          quality_issues: {
            type: "array",
            items: {
              type: "object",
              properties: {
                section: { type: "string" },
                issue_type: { type: "string" },
                description: { type: "string" },
                suggestion: { type: "string" }
              }
            }
          },
          compliance_gaps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                gap: { type: "string" },
                standard: { type: "string" },
                impact: { type: "string" },
                remediation: { type: "string" }
              }
            }
          },
          audit_readiness: {
            type: "object",
            properties: {
              audit_ready: { type: "boolean" },
              concerns: { type: "array", items: { type: "string" } },
              recommendations: { type: "array", items: { type: "string" } }
            }
          },
          corrective_actions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                priority: { type: "string" },
                action: { type: "string" },
                field_to_update: { type: "string" },
                suggested_content: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      qa_result: aiResponse,
      document_metadata: {
        document_type,
        document_id,
        reviewed_by: 'AI QA System'
      },
      reviewed_at: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});