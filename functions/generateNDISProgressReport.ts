import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * AI-Generated NDIS Client Progress Reports
 * Creates comprehensive progress reports across NDIS domains with stakeholder customization
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_id, reporting_period_months = 6, stakeholder_type = 'internal' } = await req.json();

    if (!client_id) {
      return Response.json({ error: 'client_id required' }, { status: 400 });
    }

    // Fetch client data
    const [client, caseNotes, goals, incidents, bsps, communications] = await Promise.all([
      base44.entities.Client.filter({ id: client_id }).then(c => c[0]),
      base44.entities.CaseNote.filter({ client_id }, '-session_date', 50),
      base44.entities.ClientGoal.filter({ client_id }),
      base44.entities.Incident.filter({ client_id }, '-incident_date', 20),
      base44.entities.BehaviourSupportPlan.filter({ client_id }),
      base44.entities.ClientCommunication.filter({ client_id }, '-sent_date', 30)
    ]);

    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    // Analyze progress by NDIS domain
    const domainProgress = {
      'Daily Living': [],
      'Health & Wellbeing': [],
      'Relationships & Social': [],
      'Learning': [],
      'Work': [],
      'Community & Social': [],
      'Accommodation & Support': []
    };

    goals.forEach(goal => {
      const domain = goal.ndis_domain || 'Other';
      if (domainProgress[domain]) {
        domainProgress[domain].push({
          goal: goal.goal_description,
          progress: goal.current_progress || 0,
          status: goal.status,
          baseline: goal.baseline,
          target: goal.target_outcome
        });
      }
    });

    // Analyze session data
    const sessionsSummary = caseNotes.slice(0, 20).map(cn => ({
      date: cn.session_date,
      progress_rating: cn.progress_rating,
      summary: cn.assessment?.substring(0, 100)
    }));

    // Build reporting context
    const reportContext = `
CLIENT PROGRESS REPORT - ${client.full_name}
NDIS #: ${client.ndis_number}
Reporting Period: Last ${reporting_period_months} months
Service Type: ${client.service_type}
Risk Level: ${client.risk_level}

NDIS DOMAIN PROGRESS:
${Object.entries(domainProgress)
  .filter(([_, goals]) => goals.length > 0)
  .map(([domain, goals]) => {
    const avgProgress = goals.length > 0 
      ? (goals.reduce((sum, g) => sum + (g.progress || 0), 0) / goals.length).toFixed(0)
      : 0;
    return `${domain}: ${goals.length} goals, avg ${avgProgress}% progress`;
  })
  .join('\n')}

RECENT PROGRESS RATINGS:
${sessionsSummary.slice(0, 10).map(s => `${s.date}: ${s.progress_rating}`).join('\n')}

INCIDENTS: ${incidents.length} in period
COMMUNICATIONS: ${communications.length} recent

STAKEHOLDER TYPE: ${stakeholder_type}`;

    const reportContent = await base44.integrations.Core.InvokeLLM({
      prompt: `${reportContext}

Generate a comprehensive NDIS progress report for ${stakeholder_type} stakeholders:

1. **Executive Summary** (${stakeholder_type === 'ndis' ? '1-2 paragraphs' : '2-3 paragraphs'})
   - Overall progress snapshot
   - Key achievements
   - Areas requiring attention

2. **NDIS Domain Progress** (by domain with active goals)
   - Goal progress status
   - Baseline to current trajectory
   - Evidence of progress
   - Challenges encountered

3. **Progress Highlights**
   - Top 3 achievements or positive changes
   - Specific examples with dates
   - Impact on participant's life/independence

4. **Areas of Concern**
   - Goals off-track or plateauing
   - Emerging barriers
   - Recommended adjustments

5. **Intervention Effectiveness**
   - What strategies are working
   - What needs refinement
   - Recommendations for next period

6. **Future Strategy** (next 3-6 months)
   - Focus areas
   - Recommended intensity/frequency
   - Success metrics

7. **Participant/Guardian Feedback** (if available)
   - Satisfaction with progress
   - Priorities for next period

Tailor format and depth for ${stakeholder_type} stakeholder (options: ndis, client, family, internal)
- NDIS: Focus on goal achievement and plan utilization
- Client: Accessible language, celebrate wins, motivational
- Family: Balanced perspective, practical impact, involvement opportunities
- Internal: Detailed clinical observations, strategy refinement, resource implications`,
      response_json_schema: {
        type: "object",
        properties: {
          executive_summary: { type: "string" },
          domain_progress: {
            type: "object",
            additionalProperties: {
              type: "object",
              properties: {
                goals_count: { type: "number" },
                avg_progress: { type: "number" },
                status: { type: "string" },
                key_achievements: { type: "array", items: { type: "string" } },
                challenges: { type: "array", items: { type: "string" } },
                recommendations: { type: "array", items: { type: "string" } }
              }
            }
          },
          progress_highlights: { type: "array", items: { type: "string" } },
          areas_of_concern: { type: "array", items: { type: "string" } },
          intervention_effectiveness: {
            type: "object",
            properties: {
              working_strategies: { type: "array", items: { type: "string" } },
              needs_refinement: { type: "array", items: { type: "string" } },
              recommendations: { type: "array", items: { type: "string" } }
            }
          },
          future_strategy: {
            type: "object",
            properties: {
              focus_areas: { type: "array", items: { type: "string" } },
              intensity_frequency: { type: "string" },
              success_metrics: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    });

    // Save report
    const report = await base44.entities.SavedReport.create({
      report_name: `Progress Report - ${client.full_name} - ${new Date().toLocaleDateString()}`,
      report_type: 'client_progress',
      client_id,
      stakeholder_type,
      reporting_period_months,
      report_content: JSON.stringify(reportContent),
      created_by: user.email,
      created_date: new Date().toISOString()
    });

    return Response.json({
      report_id: report.id,
      client_name: client.full_name,
      reporting_period_months,
      stakeholder_type,
      analysis_date: new Date().toISOString(),
      report_content: reportContent
    });

  } catch (error) {
    console.error('Progress report generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});