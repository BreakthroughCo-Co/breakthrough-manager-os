import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * AI-Driven Practitioner Performance Insights
 * Generates comprehensive performance summaries and development recommendations
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { practitioner_id } = await req.json();

    // Fetch comprehensive practitioner data
    const [practitioner, caseNotes, billingRecords, incidents, trainings, skills, clients] = await Promise.all([
      base44.entities.Practitioner.filter({ id: practitioner_id }).then(p => p[0]),
      base44.entities.CaseNote.filter({ practitioner_id }, '-session_date', 30),
      base44.entities.BillingRecord.filter({ practitioner_id }, '-service_date', 30),
      base44.entities.Incident.filter({ client_id: '*' }).then(allIncidents => 
        allIncidents.filter(i => i.reported_by === practitioner_id || i.description?.includes(practitioner_id))
      ),
      base44.entities.TrainingRequest.filter({ practitioner_id }),
      base44.entities.PractitionerSkill.filter({ practitioner_id }),
      base44.entities.Client.filter({ assigned_practitioner_id: practitioner_id })
    ]);

    if (!practitioner) {
      return Response.json({ error: 'Practitioner not found' }, { status: 404 });
    }

    // Calculate performance metrics
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const recentBilling = billingRecords.filter(b => new Date(b.service_date) > last30Days);
    const billableHours = recentBilling.reduce((sum, b) => sum + (b.duration_hours || 0), 0);
    const billableTarget = practitioner.billable_hours_target || 120;
    const billableRatio = ((billableHours / billableTarget) * 100).toFixed(1);

    const progressRatings = caseNotes.map(cn => {
      const map = { regression: 1, no_change: 2, emerging: 3, progressing: 4, achieved: 5 };
      return map[cn.progress_rating] || 0;
    });
    const avgClientProgress = progressRatings.length > 0
      ? (progressRatings.reduce((a, b) => a + b) / progressRatings.length).toFixed(2)
      : 'N/A';

    const completedCaseNotes = caseNotes.filter(cn => cn.status === 'completed').length;
    const draftCaseNotes = caseNotes.filter(cn => cn.status === 'draft').length;

    const recentHighSeverityIncidents = incidents.filter(i => 
      (i.severity === 'high' || i.severity === 'critical') && 
      new Date(i.incident_date) > last30Days
    ).length;

    // Compile performance context
    const performanceContext = `
PRACTITIONER: ${practitioner.full_name}
Role: ${practitioner.role}
Status: ${practitioner.status}
Tenure: Started ${practitioner.start_date}

CURRENT METRICS (Last 30 Days):
- Billable Hours: ${billableHours}/${billableTarget} (${billableRatio}%)
- Cases Managed: ${clients.length} active clients
- Caseload Capacity: ${practitioner.current_caseload}/${practitioner.caseload_capacity}
- Case Notes: ${completedCaseNotes} completed, ${draftCaseNotes} draft
- Avg Client Progress Rating: ${avgClientProgress}/5.0
- High-Severity Incidents: ${recentHighSeverityIncidents}

CLINICAL QUALITY:
- Sessions Documented: ${caseNotes.length}
- Session Types: ${[...new Set(caseNotes.map(cn => cn.session_type))].join(', ')}
- Regression Cases: ${caseNotes.filter(cn => cn.progress_rating === 'regression').length}
- Achievement Cases: ${caseNotes.filter(cn => cn.progress_rating === 'achieved').length}

PROFESSIONAL DEVELOPMENT:
- Training Requests: ${trainings.length}
- Current Skills: ${skills.map(s => `${s.skill_name} (${s.proficiency_level})`).join(', ') || 'Not assessed'}
- Critical Skills: ${skills.filter(s => s.is_critical).map(s => s.skill_name).join(', ') || 'None identified'}

COMPLIANCE & SAFETY:
- Total Incidents (recent): ${incidents.length}
- High-Severity Incidents: ${recentHighSeverityIncidents}
- Incident Categories: ${[...new Set(incidents.map(i => i.category))].join(', ')}`;

    const performanceInsights = await base44.integrations.Core.InvokeLLM({
      prompt: `${performanceContext}

Analyze this practitioner's complete performance profile and provide:

1. **Performance Summary** - Overall performance rating (Exceeds/Meets/Developing/Concerns) with supporting evidence
2. **Strengths** - 3-4 specific areas of strong performance with examples
3. **Areas for Development** - 2-3 specific areas needing growth with context
4. **Clinical Quality Assessment** - Quality of client documentation, progress tracking, and intervention effectiveness
5. **Workload Management** - Is the practitioner appropriately loaded? Sustainable pace?
6. **Recommended Development Path** - Specific, actionable recommendations for professional growth
7. **Support/Coaching Suggestions** - What support would most benefit this practitioner
8. **Overall Recommendation** - Action items for manager (recognition, coaching, training, performance improvement plan)

Be balanced, specific, and focus on actionable insights. Cite specific evidence from the metrics.`,
      response_json_schema: {
        type: "object",
        properties: {
          performance_rating: {
            type: "string",
            enum: ["exceeds", "meets", "developing", "concerns"]
          },
          summary: { type: "string" },
          strengths: { type: "array", items: { type: "string" } },
          development_areas: {
            type: "array",
            items: {
              type: "object",
              properties: {
                area: { type: "string" },
                evidence: { type: "string" },
                impact: { type: "string" }
              }
            }
          },
          clinical_quality_assessment: {
            type: "object",
            properties: {
              rating: { type: "string" },
              documentation_quality: { type: "string" },
              progress_tracking: { type: "string" },
              intervention_effectiveness: { type: "string" }
            }
          },
          workload_assessment: {
            type: "object",
            properties: {
              current_load: { type: "string" },
              sustainability: { type: "string" },
              recommendations: { type: "string" }
            }
          },
          development_path: {
            type: "array",
            items: {
              type: "object",
              properties: {
                recommendation: { type: "string" },
                timeframe: { type: "string" },
                expected_outcome: { type: "string" }
              }
            }
          },
          coaching_support: { type: "array", items: { type: "string" } },
          manager_actions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string" },
                urgency: { type: "string", enum: ["immediate", "1-month", "3-month"] },
                rationale: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({
      practitioner_id,
      practitioner_name: practitioner.full_name,
      analysis_date: new Date().toISOString(),
      performance_insights: performanceInsights,
      metrics: {
        billable_hours_ratio: billableRatio,
        avg_client_progress: avgClientProgress,
        case_notes_completed: completedCaseNotes,
        high_severity_incidents_30d: recentHighSeverityIncidents,
        active_clients: clients.length
      }
    });

  } catch (error) {
    console.error('Performance analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});