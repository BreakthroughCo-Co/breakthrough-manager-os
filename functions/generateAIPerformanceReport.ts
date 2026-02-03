import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      practitioner_id, 
      start_date, 
      end_date,
      include_kpis = true,
      include_trends = true,
      include_interventions = true 
    } = await req.json();

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    // Fetch data for the period
    const [practitioners, assignments, incidents, breaches, caseNotes] = await Promise.all([
      practitioner_id 
        ? base44.entities.Practitioner.filter({ id: practitioner_id })
        : base44.entities.Practitioner.filter({ status: 'active' }),
      base44.entities.TrainingAssignment.list(),
      base44.entities.Incident.list(),
      base44.entities.ComplianceBreach.list(),
      base44.entities.CaseNote.list(),
    ]);

    const practitionerData = [];

    for (const prac of practitioners) {
      const pracAssignments = assignments.filter(a => a.practitioner_id === prac.id);
      const pracIncidents = incidents.filter(i => i.reported_by === prac.email);
      const pracBreaches = breaches.filter(b => 
        b.related_entity_type === 'Practitioner' && b.related_entity_id === prac.id
      );
      const pracNotes = caseNotes.filter(n => n.practitioner_id === prac.id);

      // Filter by date range
      const periodAssignments = pracAssignments.filter(a => {
        const assigned = new Date(a.assigned_date);
        return assigned >= startDate && assigned <= endDate;
      });

      const periodNotes = pracNotes.filter(n => {
        const session = new Date(n.session_date);
        return session >= startDate && session <= endDate;
      });

      // Calculate KPIs
      const completedTraining = pracAssignments.filter(a => a.completion_status === 'completed').length;
      const totalTraining = pracAssignments.length;
      const trainingCompletionRate = totalTraining > 0 ? (completedTraining / totalTraining * 100).toFixed(1) : 0;

      const overdueTraining = pracAssignments.filter(a => 
        a.completion_status !== 'completed' && new Date(a.due_date) < new Date()
      ).length;

      const incidentsReported = pracIncidents.length;
      const complianceBreaches = pracBreaches.length;

      practitionerData.push({
        id: prac.id,
        name: prac.full_name,
        role: prac.role,
        kpis: {
          training_completion_rate: parseFloat(trainingCompletionRate),
          overdue_training: overdueTraining,
          incidents_reported: incidentsReported,
          compliance_breaches: complianceBreaches,
          case_notes_completed: periodNotes.length,
          performance_score: Math.max(0, 100 - (overdueTraining * 5) - (complianceBreaches * 10))
        },
        period_summary: {
          assignments_received: periodAssignments.length,
          notes_documented: periodNotes.length,
        }
      });
    }

    // Build AI analysis context
    const contextData = `
PERFORMANCE REPORT
Period: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}
Practitioners Analyzed: ${practitioners.length}

AGGREGATE METRICS:
- Average Training Completion: ${(practitionerData.reduce((sum, p) => sum + p.kpis.training_completion_rate, 0) / practitionerData.length).toFixed(1)}%
- Total Overdue Training: ${practitionerData.reduce((sum, p) => sum + p.kpis.overdue_training, 0)}
- Total Compliance Breaches: ${practitionerData.reduce((sum, p) => sum + p.kpis.compliance_breaches, 0)}
- Total Case Notes: ${practitionerData.reduce((sum, p) => sum + p.kpis.case_notes_completed, 0)}

TOP PERFORMERS:
${practitionerData
  .sort((a, b) => b.kpis.performance_score - a.kpis.performance_score)
  .slice(0, 3)
  .map(p => `- ${p.name} (${p.role}): Score ${p.kpis.performance_score}/100`)
  .join('\n')}

AREAS OF CONCERN:
${practitionerData
  .filter(p => p.kpis.overdue_training > 0 || p.kpis.compliance_breaches > 0)
  .map(p => `- ${p.name}: ${p.kpis.overdue_training} overdue, ${p.kpis.compliance_breaches} breaches`)
  .join('\n')}

Analyze this data and provide insights.`;

    const aiAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt: `${contextData}

Provide a comprehensive staff performance analysis with:
1. **Executive Summary** (2-3 sentences on overall performance)
2. **Key Trends** (Identify 3-5 notable patterns or trends)
3. **Skill Gaps** (Areas requiring development or training focus)
4. **Intervention Priorities** (Top 3 areas requiring immediate attention)
5. **Recommendations** (3-5 specific, actionable recommendations)

Be professional, data-driven, and constructive.`,
      response_json_schema: {
        type: "object",
        properties: {
          executive_summary: { type: "string" },
          key_trends: { type: "array", items: { type: "string" } },
          skill_gaps: { type: "array", items: { type: "string" } },
          intervention_priorities: { type: "array", items: { type: "string" } },
          recommendations: { type: "array", items: { type: "string" } }
        }
      }
    });

    return Response.json({
      report_period: {
        start_date: start_date,
        end_date: end_date,
      },
      practitioners_analyzed: practitioners.length,
      practitioner_data: include_kpis ? practitionerData : undefined,
      ai_analysis: aiAnalysis,
      generated_date: new Date().toISOString(),
      generated_by: user.email,
    });
  } catch (error) {
    console.error('AI performance report error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});