import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { breach_id } = await req.json();

    // Get breach details
    const breaches = await base44.asServiceRole.entities.ComplianceBreach.filter({ id: breach_id });
    const breach = breaches[0];

    if (!breach) {
      return Response.json({ error: 'Breach not found' }, { status: 404 });
    }

    const prompt = `Draft a formal "Notice of Non-Compliance" communication for internal review. This is an NDIS compliance breach notification.

BREACH DETAILS:
Type: ${breach.breach_type}
Severity: ${breach.severity}
Description: ${breach.description}
NDIS Clauses: ${breach.ndis_clauses}
Evidence: ${breach.evidence}
Required Actions: ${breach.required_actions}

Draft a professional notice (300-400 words) that includes:

1. HEADER: Reference to NDIS Practice Standards and relevant clauses
2. BREACH IDENTIFICATION: Clear statement of the non-compliance
3. EVIDENCE: Factual summary of findings
4. REGULATORY CONTEXT: Specific NDIS Code/Practice Standards cited
5. REQUIRED ACTIONS: Numbered list of mandatory remediation steps
6. TIMEFRAME: Suggested compliance deadline (based on severity)
7. CONSEQUENCES: Potential implications if not addressed
8. CONTACT: Reference to management review process

Use formal, professional tone appropriate for compliance documentation. Be specific and actionable.`;

    const noticeContent = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
    });

    // Update breach record with draft notice
    await base44.asServiceRole.entities.ComplianceBreach.update(breach_id, {
      draft_notice_generated: true,
      notice_content: noticeContent,
      status: 'under_review',
    });

    return Response.json({
      breach_id,
      notice_content: noticeContent,
    });
  } catch (error) {
    console.error('Notice drafting error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});