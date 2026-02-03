import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * AI-Assisted Audit Preparation
 * Identifies and collates documentation based on audit criteria
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { 
      audit_type,
      ndis_standards,
      date_range_start,
      date_range_end,
      client_ids,
      practitioner_ids
    } = await req.json();

    // Fetch audit-relevant data
    const [clients, documents, caseNotes, incidents, complianceItems, practitioners, billingRecords, bsps] = await Promise.all([
      base44.asServiceRole.entities.Client.list(),
      base44.asServiceRole.entities.ClientDocument.list(),
      base44.asServiceRole.entities.CaseNote.list('-session_date', 200),
      base44.asServiceRole.entities.Incident.list('-incident_date', 150),
      base44.asServiceRole.entities.ComplianceItem.list(),
      base44.asServiceRole.entities.Practitioner.list(),
      base44.asServiceRole.entities.BillingRecord.list('-service_date', 200),
      base44.asServiceRole.entities.BehaviourSupportPlan.list()
    ]);

    // Filter by criteria
    const relevantClients = client_ids?.length > 0 
      ? clients.filter(c => client_ids.includes(c.id))
      : clients;

    const dateStart = new Date(date_range_start);
    const dateEnd = new Date(date_range_end);

    // Categorize documents by type
    const documentsByType = {};
    const documentChecklists = {
      'Quality & Safeguards': {
        required: ['incident_reports', 'risk_assessments', 'bsp_approvals'],
        docs: []
      },
      'Worker Screening': {
        required: ['worker_screening', 'certifications', 'induction_records'],
        docs: []
      },
      'Clinical Governance': {
        required: ['case_notes', 'assessments', 'goal_documentation', 'progress_tracking'],
        docs: []
      },
      'Documentation': {
        required: ['client_intakes', 'consent_forms', 'service_agreements', 'communications'],
        docs: []
      }
    };

    // Organize documents
    relevantClients.forEach(client => {
      const clientDocs = documents.filter(d => d.client_id === client.id);
      const clientCaseNotes = caseNotes.filter(cn => cn.client_id === client.id && new Date(cn.session_date) >= dateStart && new Date(cn.session_date) <= dateEnd);
      const clientIncidents = incidents.filter(i => i.client_id === client.id && new Date(i.incident_date) >= dateStart && new Date(i.incident_date) <= dateEnd);
      const clientBsps = bsps.filter(b => b.client_id === client.id);

      if (!documentsByType[client.id]) {
        documentsByType[client.id] = {
          client_name: client.full_name,
          documents: clientDocs,
          case_notes: clientCaseNotes.length,
          incidents: clientIncidents.length,
          bsps: clientBsps.length,
          risk_level: client.risk_level
        };
      }
    });

    // Build audit context
    const auditContext = `
AUDIT PARAMETERS:
- Type: ${audit_type}
- Standards: ${ndis_standards.join(', ')}
- Date Range: ${date_range_start} to ${date_range_end}
- Clients: ${relevantClients.length}

DOCUMENTATION SUMMARY:
- Total Client Documents: ${documents.length}
- Case Notes (period): ${caseNotes.filter(cn => new Date(cn.session_date) >= dateStart && new Date(cn.session_date) <= dateEnd).length}
- Incidents (period): ${incidents.filter(i => new Date(i.incident_date) >= dateStart && new Date(i.incident_date) <= dateEnd).length}
- Active BSPs: ${bsps.filter(b => b.status === 'active').length}
- Compliance Items: ${complianceItems.length}

DOCUMENT TYPES AVAILABLE:
${documents.slice(0, 10).map(d => `- ${d.document_type}: ${d.document_name}`).join('\n')}

COMPLIANCE ITEM STATUS:
- Compliant: ${complianceItems.filter(c => c.status === 'compliant').length}
- Attention Needed: ${complianceItems.filter(c => c.status === 'attention_needed').length}
- Non-compliant: ${complianceItems.filter(c => c.status === 'non_compliant').length}`;

    // Use AI to identify gaps and prepare summary
    const auditPrep = await base44.integrations.Core.InvokeLLM({
      prompt: `${auditContext}

Based on this audit data, provide:

1. **Audit-Ready Documentation Summary** - What documentation is available and properly organized
2. **Documentation Gaps** - Specific missing or incomplete documents needed for audit
3. **Priority Documents** - Most critical files to review first
4. **Compliance Item Review** - Status of each NDIS standard requirement
5. **Evidence Collation Strategy** - Recommended file organization and naming for auditors
6. **Risk Areas** - Any compliance gaps or concerning patterns that auditors will likely focus on
7. **Remediation Timeline** - For any gaps, how quickly they could be addressed
8. **Executive Summary** - Overall audit readiness assessment

Be specific about document types, standards, and audit requirements.`,
      response_json_schema: {
        type: "object",
        properties: {
          audit_readiness: {
            type: "string",
            enum: ["fully_ready", "mostly_ready", "needs_preparation", "significant_gaps"]
          },
          readiness_summary: { type: "string" },
          documentation_available: {
            type: "array",
            items: {
              type: "object",
              properties: {
                document_type: { type: "string" },
                count: { type: "number" },
                date_range: { type: "string" }
              }
            }
          },
          critical_gaps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                gap: { type: "string" },
                standard: { type: "string" },
                affected_clients: { type: "string" },
                resolution_time: { type: "string" }
              }
            }
          },
          priority_documents: { type: "array", items: { type: "string" } },
          compliance_status: {
            type: "array",
            items: {
              type: "object",
              properties: {
                standard: { type: "string" },
                status: { type: "string" },
                evidence_available: { type: "string" }
              }
            }
          },
          evidence_organization: { type: "array", items: { type: "string" } },
          risk_areas: { type: "array", items: { type: "string" } },
          remediation_plan: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string" },
                timeline: { type: "string" },
                responsible: { type: "string" }
              }
            }
          }
        }
      }
    });

    // Create audit preparation task
    await base44.asServiceRole.entities.Task.create({
      title: `Audit Preparation: ${audit_type} - ${ndis_standards.join(', ')}`,
      description: `AI-generated audit preparation report. See attached documentation collation. Critical gaps identified: ${auditPrep.critical_gaps.length}. Audit readiness: ${auditPrep.audit_readiness}`,
      category: 'Compliance',
      priority: auditPrep.audit_readiness === 'significant_gaps' ? 'urgent' : 'high',
      status: 'pending',
      due_date: dateEnd
    });

    return Response.json({
      audit_date: new Date().toISOString(),
      audit_type,
      clients_reviewed: relevantClients.length,
      documents_collated: documents.length,
      preparation_summary: auditPrep,
      document_inventory: documentsByType,
      collation_status: {
        total_clients: relevantClients.length,
        documents_found: Object.values(documentsByType).reduce((sum, c) => sum + c.documents.length, 0),
        case_notes_collected: Object.values(documentsByType).reduce((sum, c) => sum + c.case_notes, 0),
        incidents_documented: Object.values(documentsByType).reduce((sum, c) => sum + c.incidents, 0)
      }
    });

  } catch (error) {
    console.error('Audit preparation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});