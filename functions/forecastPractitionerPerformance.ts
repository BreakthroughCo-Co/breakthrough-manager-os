import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const payload = await req.json();
    const { practitioner_id } = payload;

    if (!practitioner_id) {
      return Response.json({ error: 'Missing practitioner_id' }, { status: 400 });
    }

    // Fetch practitioner data
    const practitioner = await base44.asServiceRole.entities.Practitioner.filter({ id: practitioner_id });
    if (!practitioner.length) {
      return Response.json({ error: 'Practitioner not found' }, { status: 404 });
    }

    const practitionerData = practitioner[0];

    // Fetch billing records for this practitioner (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const billingRecords = await base44.asServiceRole.entities.BillingRecord.filter({
      practitioner_id: practitioner_id
    });

    // Fetch assigned clients
    const clients = await base44.asServiceRole.entities.Client.filter({
      assigned_practitioner_id: practitioner_id
    });

    // Fetch credentials and training for compliance score
    const credentials = await base44.asServiceRole.entities.PractitionerCredential.filter({
      practitioner_id: practitioner_id
    });

    const trainingRecords = await base44.asServiceRole.entities.TrainingRecord.filter({
      practitioner_id: practitioner_id
    });

    // Calculate historical billable hours (average per month)
    const billableByMonth = {};
    billingRecords.forEach((br) => {
      const month = new Date(br.service_date).toISOString().slice(0, 7);
      billableByMonth[month] = (billableByMonth[month] || 0) + (br.duration_hours || 0);
    });

    const averageBillableHours =
      Object.values(billableByMonth).length > 0
        ? Object.values(billableByMonth).reduce((a, b) => a + b, 0) / Object.values(billableByMonth).length
        : 0;

    // Calculate caseload efficiency
    const caseloadUsagePercent = practitionerData.caseload_capacity
      ? (practitionerData.current_caseload / practitionerData.caseload_capacity) * 100
      : 0;

    // Calculate compliance score
    const activeCredentials = credentials.filter((c) => c.status === 'active').length;
    const currentTraining = trainingRecords.filter((t) => t.status === 'current').length;
    const mandatoryTraining = trainingRecords.filter((t) => t.is_mandatory && t.status === 'current').length;
    const totalMandatory = trainingRecords.filter((t) => t.is_mandatory).length;

    const complianceScore = totalMandatory > 0 ? (mandatoryTraining / totalMandatory) * 100 : 100;

    // Prepare data for LLM analysis
    const analysisPrompt = `
You are an NDIS practice performance analyst. Analyze the following practitioner performance data and provide predictive insights.

Practitioner: ${practitionerData.full_name}
Role: ${practitionerData.role}
Specialisations: ${(practitionerData.specialisations || []).join(', ') || 'None listed'}

Current Caseload: ${practitionerData.current_caseload || 0} / ${practitionerData.caseload_capacity || 'N/A'}
Caseload Efficiency: ${caseloadUsagePercent.toFixed(1)}%

Historical Billable Hours (6 months):
- Average per month: ${averageBillableHours.toFixed(1)} hours
- Target: ${practitionerData.billable_hours_target || 'Not set'} hours
- Recent trend: ${billingRecords.length} recent records

Client Risk Profile:
${clients
  .map((c) => `- ${c.full_name}: Risk Level ${c.risk_level}`)
  .join('\n') || 'No assigned clients'}

Compliance Status:
- Active Credentials: ${activeCredentials}/${credentials.length}
- Mandatory Training Completion: ${mandatoryTraining}/${totalMandatory}
- Overall Compliance Score: ${complianceScore.toFixed(0)}%

Based on this data:
1. Predict billable hours for the next month/quarter
2. Assess caseload efficiency and workload balance
3. Evaluate burnout risk based on capacity and client complexity
4. Provide specific recommendations for caseload adjustment, training, or support

Return JSON with:
{
  "predicted_billable_hours_next_month": number,
  "caseload_efficiency_assessment": "string",
  "burnout_risk_detected": boolean,
  "burnout_risk_score": number (0-100),
  "workload_recommendation": "string",
  "training_gaps": "string or null",
  "overall_recommendations": "string"
}
`;

    const llmResponse = await base44.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          predicted_billable_hours_next_month: { type: 'number' },
          caseload_efficiency_assessment: { type: 'string' },
          burnout_risk_detected: { type: 'boolean' },
          burnout_risk_score: { type: 'number' },
          workload_recommendation: { type: 'string' },
          training_gaps: { type: ['string', 'null'] },
          overall_recommendations: { type: 'string' }
        }
      }
    });

    // Create PerformanceMetric record
    const today = new Date().toISOString().split('T')[0];
    const performanceMetric = await base44.asServiceRole.entities.PerformanceMetric.create({
      practitioner_id: practitioner_id,
      practitioner_name: practitionerData.full_name,
      metric_date: today,
      predicted_billable_hours: llmResponse.predicted_billable_hours_next_month,
      actual_billable_hours: averageBillableHours,
      billable_hours_target: practitionerData.billable_hours_target,
      caseload_efficiency_score: caseloadUsagePercent,
      current_caseload: practitionerData.current_caseload || 0,
      caseload_capacity: practitionerData.caseload_capacity,
      risk_of_burnout: llmResponse.burnout_risk_detected,
      burnout_score: llmResponse.burnout_risk_score,
      compliance_score: complianceScore,
      ai_recommendations: llmResponse.overall_recommendations,
      variance_from_target: (llmResponse.predicted_billable_hours_next_month - (practitionerData.billable_hours_target || 0)) || 0,
      variance_from_prediction: llmResponse.predicted_billable_hours_next_month - averageBillableHours
    });

    // Create audit trail
    await base44.asServiceRole.entities.ComplianceAuditTrail.create({
      event_type: 'practitioner_credential_action',
      event_description: `Performance forecast generated for ${practitionerData.full_name}`,
      related_entity_type: 'PerformanceMetric',
      related_entity_id: performanceMetric.id,
      trigger_source: 'Performance Forecast System',
      timestamp: new Date().toISOString(),
      triggered_by_user: 'System',
      ai_insight: llmResponse.overall_recommendations
    });

    return Response.json({
      status: 'success',
      metric_id: performanceMetric.id,
      practitioner_name: practitionerData.full_name,
      predicted_billable_hours: llmResponse.predicted_billable_hours_next_month,
      caseload_efficiency_score: caseloadUsagePercent.toFixed(1),
      burnout_risk: llmResponse.burnout_risk_detected,
      burnout_score: llmResponse.burnout_risk_score,
      compliance_score: complianceScore.toFixed(0),
      key_recommendation: llmResponse.workload_recommendation
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});