import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Gather aggregated organizational data
    const [feedback, complianceAudits, incidents, practitioners] = await Promise.all([
      base44.asServiceRole.entities.ClientFeedback.list('-feedback_date', 200),
      base44.asServiceRole.entities.ComplianceAudit.list('-audit_date', 50),
      base44.asServiceRole.entities.Incident.list('-incident_date', 100),
      base44.asServiceRole.entities.Practitioner.filter({ status: 'active' })
    ]);

    // Aggregate feedback trends
    const feedbackByPractitioner = {};
    feedback.forEach(f => {
      const pracId = f.practitioner_id;
      if (!feedbackByPractitioner[pracId]) {
        feedbackByPractitioner[pracId] = {
          practitioner_name: f.practitioner_name,
          count: 0,
          avg_satisfaction: 0,
          total_satisfaction: 0,
          improvement_areas: []
        };
      }
      feedbackByPractitioner[pracId].count++;
      feedbackByPractitioner[pracId].total_satisfaction += f.overall_satisfaction || 0;
      if (f.improvement_areas) {
        feedbackByPractitioner[pracId].improvement_areas.push(...f.improvement_areas);
      }
    });

    Object.values(feedbackByPractitioner).forEach(p => {
      p.avg_satisfaction = p.total_satisfaction / p.count;
    });

    // Compliance patterns
    const complianceIssues = {};
    complianceAudits.forEach(audit => {
      const findings = audit.findings || [];
      findings.forEach(finding => {
        const category = finding.category || 'Unknown';
        if (!complianceIssues[category]) {
          complianceIssues[category] = { count: 0, severity_sum: 0 };
        }
        complianceIssues[category].count++;
        complianceIssues[category].severity_sum += finding.severity === 'critical' ? 3 :
                                                      finding.severity === 'high' ? 2 : 1;
      });
    });

    // Incident patterns
    const incidentsByType = {};
    incidents.forEach(inc => {
      const type = inc.incident_type || 'Unknown';
      if (!incidentsByType[type]) {
        incidentsByType[type] = { count: 0, critical_count: 0 };
      }
      incidentsByType[type].count++;
      if (inc.severity === 'critical') {
        incidentsByType[type].critical_count++;
      }
    });

    const prompt = `
You are an organizational performance analyst identifying systemic trends for an NDIS provider.

FEEDBACK ANALYSIS (Last 200 Entries):
${Object.values(feedbackByPractitioner).slice(0, 10).map(p => 
  `- ${p.practitioner_name}: ${p.count} reviews, ${p.avg_satisfaction.toFixed(1)}/5 avg, common concerns: ${[...new Set(p.improvement_areas)].slice(0, 3).join(', ')}`
).join('\n')}

COMPLIANCE AUDIT PATTERNS (Last 50 Audits):
${Object.entries(complianceIssues).map(([category, data]) => 
  `- ${category}: ${data.count} findings, severity index: ${data.severity_sum}`
).join('\n')}

INCIDENT PATTERNS (Last 100 Incidents):
${Object.entries(incidentsByType).map(([type, data]) => 
  `- ${type}: ${data.count} incidents (${data.critical_count} critical)`
).join('\n')}

Conduct systemic trend analysis and provide:
1. SERVICE QUALITY TRENDS: Cross-organizational patterns in client satisfaction
2. COMPLIANCE RISK THEMES: Recurring non-compliance areas requiring attention
3. PRACTITIONER DEVELOPMENT NEEDS: Skills gaps identified from feedback/incidents
4. POLICY UPDATE RECOMMENDATIONS: Process improvements to prevent issues
5. TRAINING PRIORITIES: Targeted training based on identified gaps
6. ORGANIZATIONAL STRENGTHS: What's working well
7. CRITICAL INTERVENTIONS: Immediate organizational changes needed

Use organizational behavior and continuous improvement frameworks.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          service_quality_trends: {
            type: "array",
            items: {
              type: "object",
              properties: {
                trend: { type: "string" },
                prevalence: { type: "string" },
                impact: { type: "string" },
                root_cause: { type: "string" }
              }
            }
          },
          compliance_risk_themes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                theme: { type: "string" },
                frequency: { type: "number" },
                severity: { type: "string" },
                systemic_cause: { type: "string" },
                mitigation: { type: "string" }
              }
            }
          },
          practitioner_development_needs: {
            type: "array",
            items: {
              type: "object",
              properties: {
                skill_area: { type: "string" },
                gap_identified_from: { type: "string" },
                affected_practitioners: { type: "string" },
                training_recommendation: { type: "string" },
                priority: { type: "string" }
              }
            }
          },
          policy_update_recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                current_policy_area: { type: "string" },
                identified_issue: { type: "string" },
                recommended_change: { type: "string" },
                expected_impact: { type: "string" }
              }
            }
          },
          training_priorities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                training_topic: { type: "string" },
                urgency: { type: "string" },
                target_audience: { type: "string" },
                rationale: { type: "string" }
              }
            }
          },
          organizational_strengths: {
            type: "array",
            items: {
              type: "string"
            }
          },
          critical_interventions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                intervention: { type: "string" },
                urgency: { type: "string" },
                affected_area: { type: "string" },
                implementation_steps: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      analysis: aiResponse,
      summary: {
        total_feedback: feedback.length,
        total_audits: complianceAudits.length,
        total_incidents: incidents.length,
        active_practitioners: practitioners.length
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