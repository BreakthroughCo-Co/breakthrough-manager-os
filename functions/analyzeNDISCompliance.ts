import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Gather comprehensive compliance data
    const [clients, practitioners, bsps, serviceAgreements, incidents, caseNotes] = await Promise.all([
      base44.asServiceRole.entities.Client.list(),
      base44.asServiceRole.entities.Practitioner.list(),
      base44.asServiceRole.entities.BehaviourSupportPlan.list(),
      base44.asServiceRole.entities.ServiceAgreement.list().catch(() => []),
      base44.asServiceRole.entities.Incident.list('-incident_date', 100),
      base44.asServiceRole.entities.CaseNote.list('-created_date', 500)
    ]);

    const complianceIssues = [];
    const documentationGaps = [];
    const riskFlags = [];

    // 1. Plan Management Compliance
    const now = new Date();
    clients.forEach(client => {
      if (!client.plan_end_date) {
        documentationGaps.push({
          severity: 'high',
          category: 'plan_management',
          entity_type: 'Client',
          entity_id: client.id,
          entity_name: client.full_name,
          issue: 'Missing NDIS plan end date',
          required_action: 'Update client record with current NDIS plan dates',
          compliance_standard: 'NDIS Practice Standards - Service Delivery'
        });
      } else {
        const daysToExpiry = Math.floor((new Date(client.plan_end_date) - now) / (1000 * 60 * 60 * 24));
        if (daysToExpiry < 0) {
          complianceIssues.push({
            severity: 'critical',
            category: 'expired_plan',
            entity_type: 'Client',
            entity_id: client.id,
            entity_name: client.full_name,
            issue: `NDIS plan expired ${Math.abs(daysToExpiry)} days ago`,
            required_action: 'Immediate plan renewal required - service delivery at risk',
            compliance_standard: 'NDIS Pricing Arrangements - Valid Plans Required'
          });
        }
      }

      // Service Agreement compliance
      const hasAgreement = serviceAgreements.some(sa => sa.client_id === client.id && sa.status === 'active');
      if (!hasAgreement && client.status === 'active') {
        complianceIssues.push({
          severity: 'high',
          category: 'service_agreement',
          entity_type: 'Client',
          entity_id: client.id,
          entity_name: client.full_name,
          issue: 'No active service agreement',
          required_action: 'Establish and execute service agreement with participant',
          compliance_standard: 'NDIS Practice Standards - Core Module 1.1'
        });
      }

      // Practitioner assignment
      if (!client.assigned_practitioner_id && client.status === 'active') {
        complianceIssues.push({
          severity: 'medium',
          category: 'service_delivery',
          entity_type: 'Client',
          entity_id: client.id,
          entity_name: client.full_name,
          issue: 'No practitioner assigned',
          required_action: 'Assign qualified practitioner to client',
          compliance_standard: 'NDIS Practice Standards - Service Delivery Accountability'
        });
      }
    });

    // 2. BSP Compliance (for behavior support clients)
    const behaviorSupportClients = clients.filter(c => 
      c.service_type?.toLowerCase().includes('behaviour') || c.service_type?.toLowerCase().includes('behavior')
    );

    behaviorSupportClients.forEach(client => {
      const clientBSP = bsps.find(b => b.client_id === client.id && ['active', 'in_review'].includes(b.status));
      
      if (!clientBSP) {
        complianceIssues.push({
          severity: 'critical',
          category: 'bsp_missing',
          entity_type: 'Client',
          entity_id: client.id,
          entity_name: client.full_name,
          issue: 'Behaviour Support client without active BSP',
          required_action: 'Develop and implement Behaviour Support Plan',
          compliance_standard: 'NDIS Practice Standards - Module 5: Behaviour Support'
        });
      } else {
        // Check BSP review dates
        if (clientBSP.last_review_date) {
          const daysSinceReview = Math.floor((now - new Date(clientBSP.last_review_date)) / (1000 * 60 * 60 * 24));
          if (daysSinceReview > 180) {
            complianceIssues.push({
              severity: 'high',
              category: 'bsp_review_overdue',
              entity_type: 'BehaviourSupportPlan',
              entity_id: clientBSP.id,
              entity_name: client.full_name,
              issue: `BSP review overdue by ${daysSinceReview - 180} days`,
              required_action: 'Schedule and complete BSP review',
              compliance_standard: 'NDIS Practice Standards - Module 5.2: Regular Review'
            });
          }
        }
      }
    });

    // 3. Incident Management Compliance
    const unresolvedIncidents = incidents.filter(i => !['resolved', 'closed'].includes(i.status));
    unresolvedIncidents.forEach(incident => {
      const daysSinceIncident = Math.floor((now - new Date(incident.incident_date)) / (1000 * 60 * 60 * 24));
      
      if (daysSinceIncident > 5 && incident.severity === 'critical') {
        riskFlags.push({
          severity: 'critical',
          category: 'incident_management',
          entity_type: 'Incident',
          entity_id: incident.id,
          entity_name: incident.client_name,
          issue: `Critical incident unresolved for ${daysSinceIncident} days`,
          required_action: 'Complete incident investigation and close with documented outcomes',
          compliance_standard: 'NDIS Practice Standards - Incident Management'
        });
      }
    });

    // 4. Documentation Quality & Frequency
    const activeClientsWithPractitioner = clients.filter(c => c.status === 'active' && c.assigned_practitioner_id);
    
    activeClientsWithPractitioner.forEach(client => {
      const clientNotes = caseNotes.filter(n => n.client_id === client.id);
      const recentNotes = clientNotes.filter(n => {
        const noteDate = new Date(n.created_date);
        const daysSince = Math.floor((now - noteDate) / (1000 * 60 * 60 * 24));
        return daysSince <= 30;
      });

      if (recentNotes.length === 0) {
        documentationGaps.push({
          severity: 'medium',
          category: 'documentation_frequency',
          entity_type: 'Client',
          entity_id: client.id,
          entity_name: client.full_name,
          issue: 'No case notes in last 30 days',
          required_action: 'Ensure regular documentation of service delivery',
          compliance_standard: 'NDIS Practice Standards - Core Module 1.2: Service Delivery'
        });
      }
    });

    // 5. Practitioner Qualifications & Compliance
    practitioners.forEach(prac => {
      if (prac.status === 'active') {
        // Worker screening check (assuming field exists)
        if (!prac.worker_screening_clearance || !prac.worker_screening_expiry) {
          complianceIssues.push({
            severity: 'critical',
            category: 'worker_screening',
            entity_type: 'Practitioner',
            entity_id: prac.id,
            entity_name: prac.full_name,
            issue: 'Missing worker screening clearance',
            required_action: 'Obtain and verify worker screening check',
            compliance_standard: 'NDIS Worker Screening Requirements'
          });
        } else {
          const expiryDate = new Date(prac.worker_screening_expiry);
          const daysToExpiry = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));
          
          if (daysToExpiry < 0) {
            complianceIssues.push({
              severity: 'critical',
              category: 'worker_screening_expired',
              entity_type: 'Practitioner',
              entity_id: prac.id,
              entity_name: prac.full_name,
              issue: 'Worker screening clearance expired',
              required_action: 'Renew worker screening immediately - cannot deliver services',
              compliance_standard: 'NDIS Worker Screening Requirements'
            });
          } else if (daysToExpiry < 30) {
            riskFlags.push({
              severity: 'high',
              category: 'worker_screening_expiring',
              entity_type: 'Practitioner',
              entity_id: prac.id,
              entity_name: prac.full_name,
              issue: `Worker screening expires in ${daysToExpiry} days`,
              required_action: 'Initiate renewal process',
              compliance_standard: 'NDIS Worker Screening Requirements'
            });
          }
        }
      }
    });

    // Compile comprehensive compliance report
    const allIssues = [...complianceIssues, ...documentationGaps, ...riskFlags];
    const criticalCount = allIssues.filter(i => i.severity === 'critical').length;
    const highCount = allIssues.filter(i => i.severity === 'high').length;

    const summary = {
      analysis_date: now.toISOString(),
      total_issues: allIssues.length,
      critical_issues: criticalCount,
      high_priority_issues: highCount,
      medium_priority_issues: allIssues.filter(i => i.severity === 'medium').length,
      compliance_score: Math.max(0, 100 - (criticalCount * 10 + highCount * 5)),
      categories: {
        plan_management: allIssues.filter(i => i.category === 'plan_management' || i.category === 'expired_plan').length,
        bsp_compliance: allIssues.filter(i => i.category?.includes('bsp')).length,
        incident_management: allIssues.filter(i => i.category === 'incident_management').length,
        documentation: allIssues.filter(i => i.category?.includes('documentation')).length,
        worker_screening: allIssues.filter(i => i.category?.includes('worker_screening')).length,
        service_agreements: allIssues.filter(i => i.category === 'service_agreement').length
      }
    };

    return Response.json({
      success: true,
      summary,
      issues: allIssues.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3);
      }),
      recommendations: generateRecommendations(summary, allIssues)
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});

function generateRecommendations(summary, issues) {
  const recommendations = [];

  if (summary.critical_issues > 0) {
    recommendations.push({
      priority: 'immediate',
      action: 'Address all critical compliance issues within 24 hours',
      impact: 'Service delivery risk, potential audit findings'
    });
  }

  if (summary.categories.worker_screening > 0) {
    recommendations.push({
      priority: 'urgent',
      action: 'Review all practitioner worker screening clearances',
      impact: 'Legal requirement for service delivery'
    });
  }

  if (summary.categories.bsp_compliance > 3) {
    recommendations.push({
      priority: 'high',
      action: 'Conduct organization-wide BSP compliance audit',
      impact: 'Core service quality and regulatory compliance'
    });
  }

  if (summary.compliance_score < 70) {
    recommendations.push({
      priority: 'strategic',
      action: 'Implement systematic compliance monitoring processes',
      impact: 'Organizational risk and audit readiness'
    });
  }

  return recommendations;
}