import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { practitioner_id } = await req.json();

    // Fetch practitioner and related data
    const [practitioner, assignments, incidents, breaches, caseNotes, modules] = await Promise.all([
      base44.entities.Practitioner.filter({ id: practitioner_id }).then(p => p[0]),
      base44.entities.TrainingAssignment.filter({ practitioner_id }),
      base44.entities.Incident.filter({ reported_by: practitioner_id }),
      base44.entities.ComplianceBreach.list(),
      base44.entities.CaseNote.filter({ practitioner_id }),
      base44.entities.TrainingModule.filter({ status: 'active' }),
    ]);

    if (!practitioner) {
      return Response.json({ error: 'Practitioner not found' }, { status: 404 });
    }

    // Analyze performance data
    const completedTraining = assignments.filter(a => a.completion_status === 'completed');
    const incompleteTraining = assignments.filter(a => a.completion_status !== 'completed');
    const overdueTraining = incompleteTraining.filter(a => new Date(a.due_date) < new Date());

    const practitionerBreaches = breaches.filter(b => 
      b.description?.includes(practitioner.email) || 
      b.description?.includes(practitioner.full_name)
    );

    const recentIncidents = incidents.filter(i => {
      const date = new Date(i.incident_date);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return date > threeMonthsAgo;
    });

    const contextData = `
PRACTITIONER SKILL GAP ANALYSIS
Name: ${practitioner.full_name}
Role: ${practitioner.role}

TRAINING PERFORMANCE:
- Completed Modules: ${completedTraining.length}
- Incomplete Modules: ${incompleteTraining.length}
- Overdue Training: ${overdueTraining.length}
- Completion Rate: ${assignments.length > 0 ? (completedTraining.length / assignments.length * 100).toFixed(1) : 100}%

COMPLIANCE CONCERNS:
- Related Breaches: ${practitionerBreaches.length}
- Breach Categories: ${[...new Set(practitionerBreaches.map(b => b.breach_type))].join(', ')}

INCIDENT PATTERNS (Last 3 Months):
- Incidents Reported: ${recentIncidents.length}
- High Severity: ${recentIncidents.filter(i => i.severity === 'high' || i.severity === 'critical').length}

ACTIVITY METRICS:
- Case Notes (Last 3 months): ${caseNotes.filter(n => {
  const date = new Date(n.session_date);
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  return date > threeMonthsAgo;
}).length}

AVAILABLE TRAINING MODULES:
${modules.map(m => `- ${m.module_name} (${m.category})`).join('\n')}

Analyze this practitioner's performance and identify skill gaps.`;

    const aiAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt: `${contextData}\n\nProvide a comprehensive skill gap analysis with personalized training recommendations.`,
      response_json_schema: {
        type: "object",
        properties: {
          overall_assessment: { type: "string" },
          identified_gaps: { 
            type: "array", 
            items: { 
              type: "object",
              properties: {
                gap_area: { type: "string" },
                severity: { type: "string" },
                evidence: { type: "string" }
              }
            }
          },
          recommended_modules: {
            type: "array",
            items: {
              type: "object",
              properties: {
                module_name: { type: "string" },
                priority: { type: "string" },
                justification: { type: "string" }
              }
            }
          },
          development_priorities: { type: "array", items: { type: "string" } },
          suggested_timeline: { type: "string" }
        }
      }
    });

    return Response.json({
      practitioner_id,
      practitioner_name: practitioner.full_name,
      analysis: aiAnalysis,
      metrics: {
        training_completion_rate: assignments.length > 0 ? (completedTraining.length / assignments.length * 100) : 100,
        overdue_count: overdueTraining.length,
        breach_count: practitionerBreaches.length,
        recent_incidents: recentIncidents.length,
      },
      generated_date: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Skill gap analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});