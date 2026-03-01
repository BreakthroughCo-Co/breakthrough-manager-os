import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const clientId = body.client_id;

    if (!clientId) {
      return Response.json({ error: 'client_id required' }, { status: 400 });
    }

    // Fetch client data
    const client = await base44.entities.Client.get(clientId);
    const goals = await base44.entities.ClientGoal.filter({ client_id: clientId });
    const metrics = await base44.entities.ClientGoalMetric.filter({ client_id: clientId });
    const caseNotes = await base44.entities.CaseNote.filter({ client_id: clientId });

    // Invoke LLM to generate narrative progress report
    const reportPrompt = `Generate a comprehensive client progress report for NDIS compliance.

Client: ${client.full_name}
NDIS Number: ${client.ndis_number}
Service Type: ${client.service_type}
Plan Period: ${client.plan_start_date} to ${client.plan_end_date}

GOALS:
${goals.map(g => `- ${g.goal_description} (Status: ${g.status})`).join('\n')}

GOAL METRICS & PROGRESS:
${metrics.map(m => `- ${m.metric_name}: Baseline ${m.baseline_value} → Current ${m.current_value} → Target ${m.target_value} (Trend: ${m.trend})`).join('\n')}

RECENT CASE NOTES (last 5):
${caseNotes.slice(-5).map(cn => `[${cn.session_date}] ${cn.session_type}: ${cn.ai_summary || cn.subjective?.substring(0, 200)}`).join('\n')}

Create report with sections: Executive Summary, Goal Progress Analysis, Key Achievements, Areas for Development, Next Steps, Recommendations for Plan Review.`;

    const reportData = await base44.integrations.Core.InvokeLLM({
      prompt: reportPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          executive_summary: { type: 'string' },
          goal_progress: { type: 'array', items: { type: 'object', properties: { goal: { type: 'string' }, status: { type: 'string' }, progress: { type: 'string' } } } },
          achievements: { type: 'array', items: { type: 'string' } },
          areas_for_development: { type: 'array', items: { type: 'string' } },
          next_steps: { type: 'array', items: { type: 'string' } },
          recommendations: { type: 'string' }
        }
      }
    });

    // Save report to database
    const reportRecord = await base44.asServiceRole.entities.SavedReport.create({
      report_type: 'client_progress',
      client_id: clientId,
      client_name: client.full_name,
      report_date: new Date().toISOString().split('T')[0],
      period_start: client.plan_start_date,
      period_end: client.plan_end_date,
      content: JSON.stringify(reportData),
      generated_by: user.email
    });

    return Response.json({
      report_id: reportRecord.id,
      client_id: clientId,
      client_name: client.full_name,
      generated_date: new Date().toISOString(),
      report: reportData
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});