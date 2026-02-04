import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Aggregate organizational data
    const [incidents, complianceFindings, feedback, clients, practitioners, billingRecords] = await Promise.all([
      base44.asServiceRole.entities.Incident.list('-incident_date', 100),
      base44.asServiceRole.entities.ComplianceAuditFinding.list('-finding_date', 50),
      base44.asServiceRole.entities.ClientFeedback.list('-feedback_date', 100),
      base44.asServiceRole.entities.Client.filter({ status: 'active' }),
      base44.asServiceRole.entities.Practitioner.filter({ status: 'active' }),
      base44.asServiceRole.entities.BillingRecord.list('-service_date', 200)
    ]);

    // Calculate temporal patterns
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    const last90Days = new Date();
    last90Days.setDate(last90Days.getDate() - 90);

    const recentIncidents = incidents.filter(i => new Date(i.incident_date) >= last90Days);
    const criticalIncidents = incidents.filter(i => i.severity === 'critical');
    const incidentsByType = {};
    incidents.forEach(i => {
      incidentsByType[i.incident_type] = (incidentsByType[i.incident_type] || 0) + 1;
    });

    const criticalFindings = complianceFindings.filter(f => f.severity === 'critical' || f.severity === 'high');
    const findingsByCategory = {};
    complianceFindings.forEach(f => {
      findingsByCategory[f.category] = (findingsByCategory[f.category] || 0) + 1;
    });

    const recentFeedback = feedback.filter(f => new Date(f.feedback_date) >= last90Days);
    const lowSatisfactionFeedback = recentFeedback.filter(f => f.overall_satisfaction < 3);
    const improvementThemes = {};
    feedback.forEach(f => {
      f.improvement_areas?.forEach(area => {
        improvementThemes[area] = (improvementThemes[area] || 0) + 1;
      });
    });

    // Funding analysis
    const fundingAtRisk = clients.filter(c => {
      const utilization = c.funding_allocated > 0 ? (c.funding_utilised / c.funding_allocated) * 100 : 0;
      return utilization > 90 || utilization < 30;
    }).length;

    // Workforce analysis
    const overloadedPractitioners = practitioners.filter(p => {
      const clients = base44.asServiceRole.entities.Client.filter({ assigned_practitioner_id: p.id });
      return clients.length > (p.caseload_capacity || 20);
    }).length;

    const prompt = `
You are an organizational risk management specialist conducting systemic risk analysis for an NDIS provider.

INCIDENT ANALYSIS:
- Total Incidents (90 days): ${recentIncidents.length}
- Critical Incidents: ${criticalIncidents.length}
- Incident Types: ${JSON.stringify(incidentsByType)}
- Recurring Patterns: ${incidents.filter(i => i.similar_incidents?.length > 0).length} incidents with recurrence

COMPLIANCE STATUS:
- Critical/High Findings: ${criticalFindings.length}
- Finding Categories: ${JSON.stringify(findingsByCategory)}

CLIENT SATISFACTION:
- Low Satisfaction Reports (90 days): ${lowSatisfactionFeedback.length} of ${recentFeedback.length}
- Common Improvement Areas: ${JSON.stringify(improvementThemes)}

OPERATIONAL METRICS:
- Active Clients: ${clients.length}
- Active Practitioners: ${practitioners.length}
- Funding Risk Clients: ${fundingAtRisk}
- Overloaded Practitioners: ${overloadedPractitioners}

Conduct comprehensive systemic risk analysis and provide:
1. RISK MATRIX: Categorized organizational risks with likelihood and impact ratings
2. EMERGING PATTERNS: Systemic issues not yet critical but trending negatively
3. ROOT CAUSE ANALYSIS: Underlying organizational factors driving risks
4. IMPACT PREDICTIONS: Potential consequences if risks materialize
5. MITIGATION STRATEGIES: Prioritized interventions with implementation pathways
6. MONITORING INDICATORS: KPIs to track risk evolution

Use NDIS governance frameworks and risk management best practices.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          risk_matrix: {
            type: "array",
            items: {
              type: "object",
              properties: {
                risk_category: { type: "string" },
                risk_description: { type: "string" },
                likelihood: { type: "string" },
                impact: { type: "string" },
                risk_score: { type: "number" },
                current_status: { type: "string" },
                affected_domains: { type: "array", items: { type: "string" } }
              }
            }
          },
          emerging_patterns: {
            type: "array",
            items: {
              type: "object",
              properties: {
                pattern: { type: "string" },
                evidence: { type: "string" },
                trajectory: { type: "string" },
                early_warning_signs: { type: "array", items: { type: "string" } }
              }
            }
          },
          root_causes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                root_cause: { type: "string" },
                contributing_factors: { type: "array", items: { type: "string" } },
                affected_processes: { type: "array", items: { type: "string" } },
                remediation_complexity: { type: "string" }
              }
            }
          },
          impact_predictions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                risk_area: { type: "string" },
                predicted_impact: { type: "string" },
                timeframe: { type: "string" },
                affected_stakeholders: { type: "array", items: { type: "string" } },
                financial_impact: { type: "string" }
              }
            }
          },
          mitigation_strategies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                strategy: { type: "string" },
                priority: { type: "string" },
                implementation_steps: { type: "array", items: { type: "string" } },
                resources_required: { type: "string" },
                expected_outcome: { type: "string" },
                implementation_timeline: { type: "string" }
              }
            }
          },
          monitoring_indicators: {
            type: "array",
            items: {
              type: "object",
              properties: {
                indicator: { type: "string" },
                current_value: { type: "string" },
                target_value: { type: "string" },
                monitoring_frequency: { type: "string" },
                escalation_threshold: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      risk_analysis: aiResponse,
      data_summary: {
        incidents_analyzed: incidents.length,
        compliance_findings: complianceFindings.length,
        feedback_analyzed: feedback.length,
        clients_assessed: clients.length
      },
      analyzed_at: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});