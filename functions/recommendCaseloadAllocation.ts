import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all active practitioners with credentials and training
    const practitioners = await base44.entities.Practitioner.filter({ status: 'active' });
    const credentials = await base44.entities.PractitionerCredential.list();
    const trainingRecords = await base44.entities.TrainingRecord.list();
    
    // Fetch all active clients with funding and risk profiles
    const clients = await base44.entities.Client.filter({ status: 'active' });
    const riskProfiles = await base44.entities.ClientRiskProfile.list();

    // Build practitioner profiles with capacity and credential health
    const practitionerProfiles = practitioners.map(p => {
      const cred = credentials.filter(c => c.practitioner_id === p.id);
      const training = trainingRecords.filter(t => t.practitioner_id === p.id);
      
      const expiredCreds = cred.filter(c => new Date(c.expiry_date) < new Date());
      const expiringSoon = cred.filter(c => {
        const daysUntil = (new Date(c.expiry_date) - new Date()) / (1000 * 60 * 60 * 24);
        return daysUntil > 0 && daysUntil <= 90;
      });
      
      const expiredTraining = training.filter(t => t.status === 'expired');
      const capacityUtilisation = (p.current_caseload || 0) / (p.caseload_capacity || 1);
      
      return {
        practitioner_id: p.id,
        name: p.full_name,
        role: p.role,
        specialisations: p.specialisations || [],
        caseload_capacity: p.caseload_capacity || 0,
        current_caseload: p.current_caseload || 0,
        capacity_utilisation: capacityUtilisation,
        capacity_status: capacityUtilisation >= 0.9 ? 'at_capacity' : capacityUtilisation >= 0.7 ? 'high' : 'available',
        expired_credentials: expiredCreds.length,
        expiring_soon: expiringSoon.length,
        expired_training: expiredTraining.length,
        compliance_risk: expiredCreds.length > 0 || expiredTraining.length > 0,
        billable_hours_actual: p.billable_hours_actual || 0,
        billable_hours_target: p.billable_hours_target || 0,
        hours_efficiency: (p.billable_hours_actual || 0) / (p.billable_hours_target || 1)
      };
    });

    // Build client needs profiles
    const clientNeeds = clients.map(c => {
      const risk = riskProfiles.find(r => r.client_id === c.id);
      return {
        client_id: c.id,
        name: c.full_name,
        service_type: c.service_type,
        risk_level: c.risk_level,
        ai_risk_score: c.ai_risk_score || 0,
        assigned_practitioner_id: c.assigned_practitioner_id,
        funding_utilised: c.funding_utilised || 0,
        funding_allocated: c.funding_allocated || 0
      };
    });

    // Generate allocation recommendations
    const recommendations = [];
    const flaggedPractitioners = [];

    // Identify practitioners with compliance issues
    practitionerProfiles.forEach(p => {
      if (p.compliance_risk || p.capacity_status === 'at_capacity') {
        flaggedPractitioners.push({
          practitioner_id: p.practitioner_id,
          name: p.name,
          issues: [
            ...(p.expired_credentials > 0 ? [`${p.expired_credentials} expired credentials`] : []),
            ...(p.expiring_soon > 0 ? [`${p.expiring_soon} credentials expiring within 90 days`] : []),
            ...(p.expired_training > 0 ? [`${p.expired_training} expired mandatory training modules`] : []),
            ...(p.capacity_status === 'at_capacity' ? [`At capacity (${Math.round(p.capacity_utilisation * 100)}%)`] : []),
            ...(p.capacity_status === 'high' ? [`High utilisation (${Math.round(p.capacity_utilisation * 100)}%)`] : [])
          ],
          severity: p.capacity_status === 'at_capacity' ? 'critical' : p.compliance_risk ? 'high' : 'medium'
        });
      }
    });

    // For clients without assigned practitioners or at-risk, suggest allocations
    clientNeeds.forEach(client => {
      if (!client.assigned_practitioner_id || client.ai_risk_score > 0.6) {
        // Find best-match practitioners based on service type and available capacity
        const candidates = practitionerProfiles
          .filter(p => 
            p.capacity_status !== 'at_capacity' &&
            !p.compliance_risk &&
            (p.specialisations.includes(client.service_type) || p.role.includes('Senior'))
          )
          .sort((a, b) => a.capacity_utilisation - b.capacity_utilisation);

        if (candidates.length > 0) {
          recommendations.push({
            client_id: client.client_id,
            client_name: client.name,
            service_type: client.service_type,
            risk_level: client.risk_level,
            current_assignment: client.assigned_practitioner_id || 'Unassigned',
            recommended_practitioners: candidates.slice(0, 3).map(c => ({
              practitioner_id: c.practitioner_id,
              name: c.name,
              capacity_available: c.caseload_capacity - c.current_caseload,
              specialisation_match: c.specialisations.includes(client.service_type) ? 'strong' : 'adequate',
              efficiency_score: c.hours_efficiency
            })),
            rationale: `High-availability practitioner with matching specialisations. Current capacity utilisation optimal for ${client.service_type} service continuity.`
          });
        }
      }
    });

    // Caseload rebalancing suggestions for over-utilised practitioners
    const overUtilised = practitionerProfiles.filter(p => p.capacity_status === 'high');
    const rebalanceSuggestions = overUtilised.map(p => ({
      practitioner_id: p.practitioner_id,
      name: p.name,
      current_caseload: p.current_caseload,
      capacity: p.caseload_capacity,
      utilisation_percent: Math.round(p.capacity_utilisation * 100),
      recommended_offload: Math.ceil((p.current_caseload - (p.caseload_capacity * 0.7))),
      billable_efficiency: Math.round(p.hours_efficiency * 100)
    }));

    return Response.json({
      timestamp: new Date().toISOString(),
      allocation_recommendations: recommendations,
      flagged_practitioners: flaggedPractitioners,
      rebalance_suggestions: rebalanceSuggestions,
      summary: {
        total_practitioners_reviewed: practitionerProfiles.length,
        practitioners_at_capacity: practitionerProfiles.filter(p => p.capacity_status === 'at_capacity').length,
        practitioners_compliance_risk: flaggedPractitioners.length,
        clients_needing_assignment: clientNeeds.filter(c => !c.assigned_practitioner_id).length,
        unassigned_at_risk_clients: clientNeeds.filter(c => !c.assigned_practitioner_id && c.ai_risk_score > 0.6).length
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});