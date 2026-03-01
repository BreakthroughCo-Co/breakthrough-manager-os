import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all compliance data
    const complianceItems = await base44.entities.ComplianceItem.list();
    const scanResults = await base44.entities.ComplianceScanResult.list();
    const credentials = await base44.entities.PractitionerCredential.list();
    const trainingRecords = await base44.entities.TrainingRecord.list();
    const practitioners = await base44.entities.Practitioner.filter({ status: 'active' });

    // Calculate audit readiness metrics
    const metrics = {
      total_compliance_items: complianceItems.length,
      compliant_items: complianceItems.filter(ci => ci.status === 'compliant').length,
      compliance_percentage: (complianceItems.filter(ci => ci.status === 'compliant').length / complianceItems.length) * 100,
      recent_audit_score: scanResults.length > 0 ? scanResults[scanResults.length - 1]?.audit_readiness_score : 0,
      expired_credentials: credentials.filter(c => new Date(c.expiry_date) < new Date()).length,
      expiring_soon_credentials: credentials.filter(c => {
        const daysUntil = (new Date(c.expiry_date) - new Date()) / (1000 * 60 * 60 * 24);
        return daysUntil > 0 && daysUntil <= 90;
      }).length,
      expired_training: trainingRecords.filter(t => t.status === 'expired').length,
      outstanding_training: trainingRecords.filter(t => t.status === 'not_completed').length,
      practitioners_fully_compliant: practitioners.filter(p => {
        const pCreds = credentials.filter(c => c.practitioner_id === p.id);
        const pTraining = trainingRecords.filter(t => t.practitioner_id === p.id);
        return pCreds.every(c => new Date(c.expiry_date) > new Date()) &&
               pTraining.every(t => t.status === 'current');
      }).length
    };

    // Generate narrative report via LLM
    const reportContent = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate an annual NDIS compliance summary report based on these metrics:

Compliance Items: ${metrics.compliant_items}/${metrics.total_compliance_items} compliant (${metrics.compliance_percentage.toFixed(1)}%)
Latest Audit Readiness Score: ${metrics.recent_audit_score}/100
Expired Credentials: ${metrics.expired_credentials}
Expiring Soon (90 days): ${metrics.expiring_soon_credentials}
Expired Training Modules: ${metrics.expired_training}
Outstanding Training Assignments: ${metrics.outstanding_training}
Practitioners Fully Compliant: ${metrics.practitioners_fully_compliant}/${practitioners.length}

Create report with: Executive Summary, Key Findings, Risk Assessment, Compliance Status by Category, Recommendations for 2026, Audit Preparation Checklist.`,
      response_json_schema: {
        type: 'object',
        properties: {
          executive_summary: { type: 'string' },
          key_findings: { type: 'array', items: { type: 'string' } },
          risk_assessment: { type: 'string' },
          compliance_status: { type: 'object', additionalProperties: { type: 'string' } },
          recommendations: { type: 'array', items: { type: 'string' } },
          audit_checklist: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    // Save report
    const savedReport = await base44.asServiceRole.entities.SavedReport.create({
      report_type: 'annual_compliance_summary',
      report_date: new Date().toISOString().split('T')[0],
      period_start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      period_end: new Date().toISOString().split('T')[0],
      content: JSON.stringify({ metrics, report: reportContent }),
      generated_by: user.email
    });

    return Response.json({
      report_id: savedReport.id,
      generated_date: new Date().toISOString(),
      metrics,
      report: reportContent
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});