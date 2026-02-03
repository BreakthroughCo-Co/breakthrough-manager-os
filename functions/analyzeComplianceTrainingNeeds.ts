import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Compliance-Specific Training Needs Analysis
 * Analyzes compliance breaches, audit findings, and incident patterns
 * to identify compliance team skill gaps
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch compliance and breach data
    const [complianceBreaches, complianceItems, complianceAudits, incidents, practitioners] = await Promise.all([
      base44.asServiceRole.entities.ComplianceBreach.list('-breach_date', 100),
      base44.asServiceRole.entities.ComplianceItem.list(),
      base44.asServiceRole.entities.ComplianceAuditReport.list('-audit_date', 30),
      base44.asServiceRole.entities.Incident.filter({ category: 'compliance_violation' }, '-incident_date', 50),
      base44.asServiceRole.entities.Practitioner.list()
    ]);

    // Analyze breach patterns
    const breachPatterns = {};
    complianceBreaches.forEach(breach => {
      const key = breach.breach_type || 'unknown';
      if (!breachPatterns[key]) {
        breachPatterns[key] = {
          type: breach.breach_type,
          count: 0,
          severity: [],
          root_causes: [],
          dates: []
        };
      }
      breachPatterns[key].count += 1;
      breachPatterns[key].severity.push(breach.severity);
      if (breach.root_cause) {
        breachPatterns[key].root_causes.push(breach.root_cause);
      }
      breachPatterns[key].dates.push(breach.breach_date);
    });

    // Analyze audit findings
    const auditFindings = {};
    complianceAudits.forEach(audit => {
      try {
        const findings = JSON.parse(audit.findings || '[]');
        findings.forEach(f => {
          const key = f.standard || f.category || 'other';
          if (!auditFindings[key]) {
            auditFindings[key] = {
              standard: key,
              occurrences: 0,
              severity: [],
              findings: []
            };
          }
          auditFindings[key].occurrences += 1;
          auditFindings[key].severity.push(f.severity || 'medium');
          auditFindings[key].findings.push(f.issue);
        });
      } catch (e) {
        // Parse error, skip
      }
    });

    // Analyze compliance item status
    const complianceGaps = complianceItems.filter(c => c.status !== 'compliant');
    const highPriorityGaps = complianceGaps.filter(c => c.priority === 'critical' || c.priority === 'high');

    // Build analysis context
    const complianceContext = `
COMPLIANCE BREACH ANALYSIS:
Total Breaches (Last 100): ${complianceBreaches.length}
By Type:
${Object.values(breachPatterns).map(p => `- ${p.type}: ${p.count} occurrences (avg severity: ${p.severity.length > 0 ? (p.severity.reduce((a,b) => (a==='critical'?3:a==='high'?2:1)+(b==='critical'?3:b==='high'?2:1))/p.severity.length).toFixed(1) : 'N/A'})`).join('\n')}

COMPLIANCE AUDIT FINDINGS:
Total Standards with Gaps: ${Object.keys(auditFindings).length}
${Object.values(auditFindings).slice(0, 10).map(f => `- ${f.standard}: ${f.occurrences} instances (${f.findings.slice(0, 2).join(', ')})`).join('\n')}

COMPLIANCE ITEM STATUS:
- Non-compliant: ${complianceItems.filter(c => c.status === 'non_compliant').length}
- Attention Needed: ${complianceItems.filter(c => c.status === 'attention_needed').length}
- High Priority Gaps: ${highPriorityGaps.length}

COMPLIANCE VIOLATION INCIDENTS:
${incidents.slice(0, 10).map(i => `- ${i.incident_date}: ${i.description?.substring(0, 80)}`).join('\n') || 'No recent violations'}

ROOT CAUSE ANALYSIS:
${Object.values(breachPatterns).flatMap(p => p.root_causes).slice(0, 10).map(rc => `- ${rc}`).join('\n') || 'Insufficient data'}`;

    const complianceTrainingAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt: `${complianceContext}

Analyze compliance breach patterns, audit findings, and incident data to identify:

1. **Critical Compliance Gaps** - Most frequently violated standards and requirements
   - Rank by frequency and severity
   - Link to specific NDIS quality standards

2. **Compliance Team Skill Gaps** - What knowledge/skills are missing
   - Specific compliance areas showing repeated failures
   - Gaps in process understanding vs. knowledge

3. **Recommended Compliance Training** - Specific training modules needed
   - For each major gap, recommend specific training
   - Prioritize by breach frequency and severity impact

4. **Root Cause Analysis** - Why are these breaches happening?
   - Pattern analysis of root causes
   - Systemic issues vs. individual knowledge gaps

5. **Compliance Process Improvements** - Beyond training, what processes need enhancement
   - Documentation improvements
   - Review procedures
   - Staff support/resources

6. **Implementation Roadmap** - Phased approach to address gaps
   - Immediate (critical) vs. ongoing improvements
   - Success metrics

Be specific to NDIS compliance and behaviour support service delivery.`,
      response_json_schema: {
        type: "object",
        properties: {
          critical_gaps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                gap: { type: "string" },
                ndis_standard: { type: "string" },
                breach_frequency: { type: "number" },
                severity: { type: "string" },
                impact: { type: "string" }
              }
            }
          },
          skill_gaps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                gap_area: { type: "string" },
                evidence: { type: "string" },
                affected_processes: { type: "array", items: { type: "string" } }
              }
            }
          },
          recommended_training: {
            type: "array",
            items: {
              type: "object",
              properties: {
                training_topic: { type: "string" },
                competency_area: { type: "string" },
                priority: { type: "string", enum: ["critical", "high", "medium"] },
                target_audience: { type: "string" },
                success_metrics: { type: "array", items: { type: "string" } }
              }
            }
          },
          root_causes: { type: "array", items: { type: "string" } },
          process_improvements: { type: "array", items: { type: "string" } },
          implementation_roadmap: {
            type: "array",
            items: {
              type: "object",
              properties: {
                phase: { type: "string" },
                timeline: { type: "string" },
                actions: { type: "array", items: { type: "string" } },
                expected_outcome: { type: "string" }
              }
            }
          }
        }
      }
    });

    // Create TeamTrainingNeed entities for critical compliance gaps
    const createdNeeds = [];
    for (const training of complianceTrainingAnalysis.recommended_training) {
      if (training.priority === 'critical' || training.priority === 'high') {
        const needData = {
          skill_area: training.training_topic,
          category: 'NDIS Compliance',
          priority: training.priority,
          affected_practitioners: JSON.stringify(['Compliance Team']),
          gap_severity: training.priority === 'critical' ? 95 : 80,
          business_impact: `Compliance breach pattern: ${training.competency_area}. Multiple violations detected.`,
          trigger_type: 'compliance_requirement',
          recommended_modules: JSON.stringify([training.training_topic]),
          ai_rationale: `AI analysis of compliance breaches identified critical need in ${training.competency_area}`,
          identified_date: new Date().toISOString().split('T')[0],
          target_completion_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'identified'
        };

        const created = await base44.asServiceRole.entities.TeamTrainingNeed.create(needData);
        createdNeeds.push(created);
      }
    }

    return Response.json({
      analysis_date: new Date().toISOString(),
      breaches_analyzed: complianceBreaches.length,
      audits_reviewed: complianceAudits.length,
      compliance_items_reviewed: complianceItems.length,
      training_needs_created: createdNeeds.length,
      analysis: complianceTrainingAnalysis,
      breach_patterns: Object.values(breachPatterns).sort((a, b) => b.count - a.count),
      audit_findings: Object.values(auditFindings).sort((a, b) => b.occurrences - a.occurrences)
    });

  } catch (error) {
    console.error('Compliance training analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});