import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Clinical Risk Early-Warning System
 * Calculates risk scores for participants, practitioners, and organisation
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Service role for comprehensive analysis
    const clients = await base44.asServiceRole.entities.Client.list();
    const practitioners = await base44.asServiceRole.entities.Practitioner.list();
    const incidents = await base44.asServiceRole.entities.IncidentReport.list();
    const restrictivePractices = await base44.asServiceRole.entities.RestrictivePractice.list();
    const billingRecords = await base44.asServiceRole.entities.BillingRecord.list();
    const caseNotes = await base44.asServiceRole.entities.CaseNote.list();
    const abcRecords = await base44.asServiceRole.entities.ABCRecord.list();
    
    const alerts = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);

    // ===== PARTICIPANT RISK SCORING =====
    for (const client of clients.filter(c => c.status === 'active')) {
      const clientIncidents = incidents.filter(i => 
        i.participants_involved?.some(p => p.participant_id === client.id) &&
        new Date(i.incident_date) > thirtyDaysAgo
      );
      
      const clientRP = restrictivePractices.filter(rp =>
        rp.participant_id === client.id &&
        new Date(rp.last_used_date || rp.created_date) > thirtyDaysAgo
      );
      
      const clientABC = abcRecords.filter(a =>
        a.client_id === client.id &&
        new Date(a.date) > thirtyDaysAgo
      );
      
      let riskScore = 0;
      const flags = [];
      
      // Incident frequency scoring (0-40 points)
      const incidentCount = clientIncidents.length;
      if (incidentCount >= 10) {
        riskScore += 40;
        flags.push(`High incident frequency: ${incidentCount} incidents in 30 days`);
      } else if (incidentCount >= 5) {
        riskScore += 25;
        flags.push(`Elevated incident frequency: ${incidentCount} incidents in 30 days`);
      } else if (incidentCount >= 2) {
        riskScore += 10;
      }
      
      // Restrictive practice usage (0-30 points)
      const rpUsageCount = clientRP.reduce((sum, rp) => 
        sum + (rp.usage_incidents?.length || 0), 0
      );
      if (rpUsageCount >= 5) {
        riskScore += 30;
        flags.push(`Frequent restrictive practice use: ${rpUsageCount} times`);
      } else if (rpUsageCount >= 2) {
        riskScore += 15;
        flags.push(`Restrictive practice used ${rpUsageCount} times`);
      }
      
      // ABC data severity trend (0-20 points)
      const highIntensityABC = clientABC.filter(a => 
        a.behaviour?.intensity === 'high' || a.behaviour?.intensity === 'severe'
      );
      const intensityRatio = clientABC.length > 0 ? highIntensityABC.length / clientABC.length : 0;
      if (intensityRatio > 0.5) {
        riskScore += 20;
        flags.push(`High behaviour intensity: ${Math.round(intensityRatio * 100)}% of incidents`);
      } else if (intensityRatio > 0.3) {
        riskScore += 10;
      }
      
      // Plan utilisation velocity (0-10 points)
      if (client.funding_allocated && client.funding_utilised) {
        const utilisation = client.funding_utilised / client.funding_allocated;
        const planStart = new Date(client.plan_start_date);
        const planEnd = new Date(client.plan_end_date);
        const planDuration = (planEnd - planStart) / (1000 * 60 * 60 * 24);
        const elapsed = (now - planStart) / (1000 * 60 * 60 * 24);
        const expectedUtilisation = elapsed / planDuration;
        
        if (utilisation > expectedUtilisation + 0.2) {
          riskScore += 10;
          flags.push(`Funding burn rate exceeds expected: ${Math.round(utilisation * 100)}% used, ${Math.round(expectedUtilisation * 100)}% expected`);
        }
      }
      
      const riskLevel = riskScore >= 70 ? 'critical' : riskScore >= 50 ? 'high' : riskScore >= 30 ? 'moderate' : 'low';
      
      if (riskScore >= 30) {
        alerts.push({
          alert_type: 'participant_risk',
          entity_type: 'client',
          entity_id: client.id,
          entity_name: client.full_name,
          risk_score: riskScore,
          risk_level: riskLevel,
          alert_category: 'incident_frequency',
          metrics: JSON.stringify({
            incident_count: incidentCount,
            rp_usage_count: rpUsageCount,
            high_intensity_ratio: intensityRatio,
            abc_count: clientABC.length,
          }),
          flags: JSON.stringify(flags),
          recommendations: JSON.stringify(generateClientRecommendations(riskScore, flags)),
          severity: riskLevel === 'critical' ? 'critical' : riskLevel === 'high' ? 'urgent' : 'warning',
          status: 'active',
        });
      }
    }

    // ===== PRACTITIONER RISK FLAGS =====
    for (const practitioner of practitioners.filter(p => p.status === 'active')) {
      const practitionerClients = clients.filter(c => c.assigned_practitioner_id === practitioner.id);
      const practitionerIncidents = incidents.filter(i =>
        practitionerClients.some(pc => i.participants_involved?.some(p => p.participant_id === pc.id))
      );
      
      const practitionerCaseNotes = caseNotes.filter(cn =>
        practitionerClients.some(pc => cn.client_id === pc.id) &&
        new Date(cn.session_date) > thirtyDaysAgo
      );
      
      let riskScore = 0;
      const flags = [];
      
      // Caseload capacity (0-30 points)
      if (practitioner.current_caseload > practitioner.caseload_capacity) {
        const overload = practitioner.current_caseload - practitioner.caseload_capacity;
        riskScore += Math.min(30, overload * 5);
        flags.push(`Caseload exceeds capacity by ${overload} clients`);
      }
      
      // Documentation lag (0-25 points)
      const expectedNotes = practitionerClients.length * 2; // Expect 2 notes per client per month
      if (practitionerCaseNotes.length < expectedNotes * 0.5) {
        riskScore += 25;
        flags.push(`Documentation lag: ${practitionerCaseNotes.length}/${expectedNotes} expected notes`);
      } else if (practitionerCaseNotes.length < expectedNotes * 0.7) {
        riskScore += 15;
      }
      
      // High-risk client concentration (0-25 points)
      const highRiskClients = practitionerClients.filter(c => c.risk_level === 'high');
      if (highRiskClients.length >= 5) {
        riskScore += 25;
        flags.push(`High concentration of high-risk clients: ${highRiskClients.length}`);
      } else if (highRiskClients.length >= 3) {
        riskScore += 15;
      }
      
      // Billable hours vs target (0-20 points)
      if (practitioner.billable_hours_target && practitioner.billable_hours_actual) {
        const achievementRatio = practitioner.billable_hours_actual / practitioner.billable_hours_target;
        if (achievementRatio < 0.6) {
          riskScore += 20;
          flags.push(`Low billable hours: ${Math.round(achievementRatio * 100)}% of target`);
        } else if (achievementRatio < 0.75) {
          riskScore += 10;
        }
      }
      
      const riskLevel = riskScore >= 60 ? 'critical' : riskScore >= 40 ? 'high' : riskScore >= 25 ? 'moderate' : 'low';
      
      if (riskScore >= 25) {
        alerts.push({
          alert_type: 'practitioner_flag',
          entity_type: 'practitioner',
          entity_id: practitioner.id,
          entity_name: practitioner.full_name,
          risk_score: riskScore,
          risk_level: riskLevel,
          alert_category: 'workload',
          metrics: JSON.stringify({
            caseload: practitioner.current_caseload,
            capacity: practitioner.caseload_capacity,
            high_risk_clients: highRiskClients.length,
            case_notes_count: practitionerCaseNotes.length,
          }),
          flags: JSON.stringify(flags),
          recommendations: JSON.stringify(generatePractitionerRecommendations(flags)),
          severity: riskLevel === 'critical' ? 'critical' : riskLevel === 'high' ? 'urgent' : 'warning',
          status: 'active',
        });
      }
    }

    // ===== ORGANISATIONAL HEATMAP =====
    const totalIncidents = incidents.filter(i => new Date(i.incident_date) > thirtyDaysAgo).length;
    const totalRP = restrictivePractices.filter(rp => 
      new Date(rp.last_used_date || rp.created_date) > thirtyDaysAgo
    ).length;
    const activeClients = clients.filter(c => c.status === 'active').length;
    
    const orgRiskScore = calculateOrgRiskScore({
      totalIncidents,
      totalRP,
      activeClients,
      practitioners: practitioners.filter(p => p.status === 'active'),
      clients,
    });
    
    if (orgRiskScore >= 30) {
      alerts.push({
        alert_type: 'organisational_risk',
        entity_type: 'organisation',
        entity_id: 'org',
        entity_name: 'Breakthrough Coaching & Consulting',
        risk_score: orgRiskScore,
        risk_level: orgRiskScore >= 70 ? 'critical' : orgRiskScore >= 50 ? 'high' : 'moderate',
        alert_category: 'quality',
        metrics: JSON.stringify({
          total_incidents: totalIncidents,
          total_rp_usage: totalRP,
          active_clients: activeClients,
          incident_rate: (totalIncidents / activeClients).toFixed(2),
        }),
        flags: JSON.stringify(['Organisational risk indicators detected']),
        recommendations: JSON.stringify(['Review system-wide processes', 'Conduct safety audit']),
        severity: orgRiskScore >= 70 ? 'critical' : orgRiskScore >= 50 ? 'urgent' : 'warning',
        status: 'active',
      });
    }

    // Store alerts
    for (const alert of alerts) {
      await base44.asServiceRole.entities.RiskAlert.create(alert);
    }

    return Response.json({
      success: true,
      alerts_generated: alerts.length,
      breakdown: {
        participant_alerts: alerts.filter(a => a.alert_type === 'participant_risk').length,
        practitioner_alerts: alerts.filter(a => a.alert_type === 'practitioner_flag').length,
        organisational_alerts: alerts.filter(a => a.alert_type === 'organisational_risk').length,
      },
    });
  } catch (error) {
    console.error('Risk calculation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateClientRecommendations(score, flags) {
  const recommendations = [];
  if (score >= 70) {
    recommendations.push('Immediate clinical review required');
    recommendations.push('Consider crisis response plan activation');
  }
  if (flags.some(f => f.includes('incident frequency'))) {
    recommendations.push('Review and update BSP');
    recommendations.push('Increase monitoring frequency');
  }
  if (flags.some(f => f.includes('restrictive practice'))) {
    recommendations.push('Review restrictive practice authorization');
    recommendations.push('Assess alternative strategies');
  }
  return recommendations;
}

function generatePractitionerRecommendations(flags) {
  const recommendations = [];
  if (flags.some(f => f.includes('Caseload'))) {
    recommendations.push('Redistribute caseload');
    recommendations.push('Provide additional administrative support');
  }
  if (flags.some(f => f.includes('Documentation'))) {
    recommendations.push('Schedule dedicated documentation time');
    recommendations.push('Review documentation templates');
  }
  return recommendations;
}

function calculateOrgRiskScore({ totalIncidents, totalRP, activeClients, practitioners, clients }) {
  let score = 0;
  
  const incidentRate = activeClients > 0 ? totalIncidents / activeClients : 0;
  if (incidentRate > 0.5) score += 30;
  else if (incidentRate > 0.3) score += 15;
  
  const rpRate = activeClients > 0 ? totalRP / activeClients : 0;
  if (rpRate > 0.2) score += 25;
  else if (rpRate > 0.1) score += 10;
  
  const overloadedPractitioners = practitioners.filter(p => 
    p.current_caseload > p.caseload_capacity
  ).length;
  if (overloadedPractitioners > practitioners.length * 0.3) score += 20;
  
  const highRiskClients = clients.filter(c => c.risk_level === 'high').length;
  const highRiskRatio = activeClients > 0 ? highRiskClients / activeClients : 0;
  if (highRiskRatio > 0.3) score += 25;
  
  return score;
}