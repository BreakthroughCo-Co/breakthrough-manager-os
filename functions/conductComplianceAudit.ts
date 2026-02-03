import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Simulated NDIS Compliance Audit System
 * Proactively reviews client files, incidents, and compliance logs against NDIS standards
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch audit data
    const [clients, caseNotes, incidents, complianceItems, bsps, documents] = await Promise.all([
      base44.asServiceRole.entities.Client.list(),
      base44.asServiceRole.entities.CaseNote.list('-session_date', 200),
      base44.asServiceRole.entities.Incident.list('-incident_date', 100),
      base44.asServiceRole.entities.ComplianceItem.list(),
      base44.asServiceRole.entities.BehaviourSupportPlan.list(),
      base44.asServiceRole.entities.ClientDocument.list()
    ]);

    // Build audit context
    const auditContext = `
COMPLIANCE AUDIT SIMULATION - ${new Date().toLocaleDateString()}

CLIENTS AUDITED: ${clients.length}
CASE NOTES REVIEWED: ${caseNotes.length}
INCIDENTS REVIEWED: ${incidents.length}
COMPLIANCE ITEMS: ${complianceItems.length}

COMPLIANCE STATUS:
- Compliant: ${complianceItems.filter(c => c.status === 'compliant').length}
- Attention Needed: ${complianceItems.filter(c => c.status === 'attention_needed').length}
- Non-Compliant: ${complianceItems.filter(c => c.status === 'non_compliant').length}

DOCUMENTATION STATUS:
- Total Documents: ${documents.length}
- BSPs: ${bsps.length}

RECENT INCIDENTS: ${incidents.slice(0, 10).map(i => `${i.category || 'uncat'}: ${i.description?.substring(0, 50) || 'N/A'}`).join('; ')}

COMPLIANCE ITEMS AT RISK:
${complianceItems.filter(c => c.status !== 'compliant').slice(0, 5).map(c => `- ${c.title} (${c.category}): ${c.description}`).join('\n')}`;

    const auditFindings = await base44.integrations.Core.InvokeLLM({
      prompt: `${auditContext}

Conduct a simulated NDIS compliance audit and identify:

1. **NDIS Quality Standards Assessment** (Against all 6 standards)
   - Standard 1: Worker Screening & Suitability
   - Standard 2: NDIS Practice Standards
   - Standard 3: Safeguarding of Participants
   - Standard 4: Incident Management
   - Standard 5: Service User Outcomes
   - Standard 6: Governance & Operations

2. **Specific Audit Findings** (For each identified gap)
   - Finding type (observation, minor, major, critical)
   - Which standard(s) affected
   - Detailed description with evidence
   - Root cause analysis
   - Affected client/practitioner details

3. **High-Risk Areas** (Most critical)
   - Worker screening/record completeness
   - Safeguarding incident response
   - Documentation completeness
   - Plan alignment with service delivery
   - Incident investigation quality

4. **Corrective Actions** (Specific, actionable)
   - Priority ranking
   - Responsible party
   - Timeline (immediate/7 days/30 days/ongoing)
   - Success criteria
   - Evidence required

5. **Systemic vs Isolated Issues**
   - Pattern analysis
   - Whether issues are organizational or individual
   - Preventive measures recommended

6. **Mock Audit Report Sections**
   - Executive summary
   - Detailed findings
   - Risk assessment
   - Recommendations
   - Compliance confidence rating (0-100%)

7. **Previous Audit Follow-up** (If applicable)
   - Status of remediation from prior findings
   - Whether previously identified issues recur
   - Effectiveness of prior corrective actions

Be specific and realistic about findings. Assume some level of compliance despite gaps.`,
      response_json_schema: {
        type: "object",
        properties: {
          audit_date: { type: "string" },
          audit_type: { type: "string" },
          total_clients_reviewed: { type: "number" },
          overall_compliance_rating: { type: "number", minimum: 0, maximum: 100 },
          findings: {
            type: "array",
            items: {
              type: "object",
              properties: {
                finding_number: { type: "string" },
                finding_type: { type: "string" },
                ndis_standard: { type: "string" },
                description: { type: "string" },
                evidence: { type: "string" },
                root_cause: { type: "string" },
                affected_clients: { type: "array", items: { type: "string" } },
                corrective_actions: { type: "array", items: { type: "string" } },
                priority: { type: "string" },
                target_date: { type: "string" }
              }
            }
          },
          high_risk_areas: { type: "array", items: { type: "string" } },
          systemic_issues: { type: "array", items: { type: "string" } },
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                recommendation: { type: "string" },
                area: { type: "string" },
                timeline: { type: "string" },
                resource_requirement: { type: "string" }
              }
            }
          },
          previous_audit_follow_up: {
            type: "object",
            properties: {
              prior_findings_count: { type: "number" },
              remediated_count: { type: "number" },
              outstanding_count: { type: "number" },
              recurring_issues: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    });

    // Create audit findings records
    for (const finding of auditFindings.findings.slice(0, 10)) {
      await base44.asServiceRole.entities.ComplianceAuditFinding.create({
        audit_date: new Date().toISOString().split('T')[0],
        finding_type: finding.finding_type.toLowerCase().replace(/ /g, '_'),
        ndis_standard: finding.ndis_standard,
        finding_description: finding.description,
        evidence: finding.evidence,
        root_cause: finding.root_cause,
        corrective_actions: JSON.stringify(finding.corrective_actions),
        target_remediation_date: finding.target_date,
        priority: finding.priority.toLowerCase(),
        status: 'open'
      });
    }

    return Response.json({
      audit_date: new Date().toISOString(),
      audit_findings: auditFindings,
      findings_created: Math.min(auditFindings.findings.length, 10)
    });

  } catch (error) {
    console.error('Compliance audit error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});