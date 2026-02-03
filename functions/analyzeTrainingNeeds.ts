import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * AI-Driven Training Needs Analysis
 * Analyzes performance, incidents, and compliance logs to identify skill gaps
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all practitioner and performance data
    const [practitioners, incidents, caseNotes, complianceItems, billingRecords, trainingModules, skillRecords] = await Promise.all([
      base44.asServiceRole.entities.Practitioner.list(),
      base44.asServiceRole.entities.Incident.list('-incident_date', 200),
      base44.asServiceRole.entities.CaseNote.list('-session_date', 300),
      base44.asServiceRole.entities.ComplianceItem.list(),
      base44.asServiceRole.entities.BillingRecord.list('-service_date', 150),
      base44.asServiceRole.entities.TrainingModule.list(),
      base44.asServiceRole.entities.PractitionerSkill.list()
    ]);

    // Analyze each practitioner
    const practitionerAnalysis = practitioners.map(p => {
      const pIncidents = incidents.filter(i => {
        // Parse practitioner involvement from incident (if tracked)
        return i.reported_by === p.email || i.description?.includes(p.full_name);
      });

      const pCaseNotes = caseNotes.filter(c => c.practitioner_id === p.id);
      const pBilling = billingRecords.filter(b => b.practitioner_id === p.id);
      const pSkills = skillRecords.filter(s => s.practitioner_id === p.id);

      // Calculate metrics
      const avgProgress = pCaseNotes.length > 0
        ? pCaseNotes.reduce((sum, cn) => {
            const map = { regression: 1, no_change: 2, emerging: 3, progressing: 4, achieved: 5 };
            return sum + (map[cn.progress_rating] || 0);
          }, 0) / pCaseNotes.length
        : 0;

      const billableHoursRatio = p.billable_hours_target && p.billable_hours_actual
        ? (p.billable_hours_actual / p.billable_hours_target) * 100
        : 0;

      const highSeverityIncidents = pIncidents.filter(i => i.severity === 'high' || i.severity === 'critical').length;
      const complianceIssues = complianceItems.filter(c => 
        c.responsible_person === p.full_name && c.status !== 'compliant'
      ).length;

      return {
        practitioner_id: p.id,
        practitioner_name: p.full_name,
        email: p.email,
        role: p.role,
        caseload: p.current_caseload || 0,
        avg_client_progress: avgProgress.toFixed(2),
        billable_hours_ratio: billableHoursRatio.toFixed(1),
        recent_incidents: pIncidents.length,
        high_severity_incidents: highSeverityIncidents,
        compliance_issues: complianceIssues,
        case_notes_count: pCaseNotes.length,
        current_skills: pSkills.map(s => ({ name: s.skill_name, level: s.proficiency_level })),
        status: p.status
      };
    });

    // Build analysis context
    const analysisContext = `
PRACTITIONER PERFORMANCE ANALYSIS:

${practitionerAnalysis.map(pa => `
${pa.practitioner_name} (${pa.role}):
- Caseload: ${pa.caseload} clients
- Avg Client Progress: ${pa.avg_client_progress}/5.0
- Billable Hours: ${pa.billable_hours_ratio}% of target
- Recent Incidents: ${pa.recent_incidents} (${pa.high_severity_incidents} high-severity)
- Compliance Issues: ${pa.compliance_issues}
- Case Notes Completed: ${pa.case_notes_count}
- Current Skills: ${pa.current_skills.map(s => `${s.name} (${s.level})`).join(', ') || 'Not assessed'}
`).join('\n')}

COMPLIANCE ITEMS STATUS:
- Non-compliant: ${complianceItems.filter(c => c.status === 'non_compliant').length}
- Attention Needed: ${complianceItems.filter(c => c.status === 'attention_needed').length}

INCIDENT PATTERNS:
- Total Incidents: ${incidents.length}
- Categories: ${[...new Set(incidents.map(i => i.category))].join(', ')}
- High/Critical: ${incidents.filter(i => i.severity === 'high' || i.severity === 'critical').length}

AVAILABLE TRAINING MODULES:
${trainingModules.slice(0, 10).map(m => `- ${m.title} (${m.category})`).join('\n')}`;

    const trainingAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt: `${analysisContext}

Analyze this practitioner performance and compliance data to identify:

1. **Individual Skill Gaps** - For each practitioner, list specific skill gaps (low client progress, compliance issues, incident patterns)
2. **Priority Training Needs** - Rank skill gaps by urgency (critical, high, medium, low) based on impact
3. **Recommended Training Modules** - Suggest specific modules from available options for each gap
4. **Team-Wide Training Gaps** - Any patterns or systemic skill gaps affecting multiple practitioners
5. **Capacity and Development Observations** - Practitioners showing strong performance and those needing intervention

Focus on actionable, specific training recommendations tied to observable performance metrics.`,
      response_json_schema: {
        type: "object",
        properties: {
          individual_gaps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                practitioner_name: { type: "string" },
                skill_gaps: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      gap: { type: "string" },
                      evidence: { type: "string" },
                      priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
                      impact: { type: "string" }
                    }
                  }
                },
                recommended_training: {
                  type: "array",
                  items: { type: "string" }
                }
              }
            }
          },
          team_patterns: {
            type: "array",
            items: {
              type: "object",
              properties: {
                pattern: { type: "string" },
                affected_count: { type: "number" },
                root_cause: { type: "string" },
                recommendation: { type: "string" }
              }
            }
          },
          high_performers: { type: "array", items: { type: "string" } },
          implementation_plan: { type: "array", items: { type: "string" } }
        }
      }
    });

    // Create TeamTrainingNeed entities for identified gaps
    const createdNeeds = [];
    for (const practitioner of trainingAnalysis.individual_gaps) {
      for (const gap of practitioner.skill_gaps) {
        if (gap.priority === 'critical' || gap.priority === 'high') {
          const needData = {
            skill_area: gap.gap,
            category: gap.evidence.includes('compliance') ? 'NDIS Compliance' : 'Professional Development',
            priority: gap.priority,
            affected_practitioners: JSON.stringify([practitioner.practitioner_name]),
            gap_severity: gap.priority === 'critical' ? 90 : 70,
            business_impact: gap.impact,
            trigger_type: 'skill_gap_analysis',
            recommended_modules: JSON.stringify(practitioner.recommended_training.slice(0, 3)),
            ai_rationale: `Identified through performance analysis: ${gap.evidence}`,
            identified_date: new Date().toISOString().split('T')[0],
            target_completion_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'identified'
          };

          const created = await base44.asServiceRole.entities.TeamTrainingNeed.create(needData);
          createdNeeds.push(created);
        }
      }
    }

    return Response.json({
      analysis_date: new Date().toISOString(),
      practitioners_analyzed: practitionerAnalysis.length,
      training_needs_created: createdNeeds.length,
      analysis: trainingAnalysis,
      practitioner_metrics: practitionerAnalysis,
      created_needs: createdNeeds
    });

  } catch (error) {
    console.error('Training needs analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});