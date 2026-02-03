import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_id } = await req.json();

    if (!client_id) {
      return Response.json({ error: 'Missing client_id' }, { status: 400 });
    }

    // Fetch client and related data
    const [clients, goals, caseNotes, bsps, sessionNotes] = await Promise.all([
      base44.entities.Client.list(),
      base44.entities.ClientGoal.list(),
      base44.entities.CaseNote.list(),
      base44.entities.BehaviourSupportPlan.list(),
      base44.entities.SessionNote.list()
    ]);

    const client = clients?.find(c => c.id === client_id);
    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    const clientGoals = goals?.filter(g => g.client_id === client_id) || [];
    const clientNotes = caseNotes?.filter(n => n.client_id === client_id) || [];
    const activeBSP = bsps?.find(b => b.client_id === client_id && b.is_latest_version && b.status === 'active');
    const clientSessionNotes = sessionNotes?.filter(n => n.client_id === client_id) || [];

    // Analyze progress for each goal
    const goalAnalyses = [];

    for (const goal of clientGoals) {
      // Get recent notes mentioning this goal
      const relevantNotes = clientNotes.filter(n => 
        n.progress_notes?.toLowerCase().includes(goal.goal_description?.toLowerCase()) ||
        n.observations?.toLowerCase().includes(goal.goal_description?.toLowerCase())
      ).slice(-10);

      // Count progress indicators in notes
      const progressLanguage = relevantNotes.filter(n => 
        n.progress_notes?.match(/progress|improve|success|demonstrated|achieved|increase/i)
      ).length;

      const stagnationLanguage = relevantNotes.filter(n => 
        n.progress_notes?.match(/no change|static|plateau|maintained|same|difficult|struggle/i)
      ).length;

      const declineLanguage = relevantNotes.filter(n => 
        n.progress_notes?.match(/decline|regress|worsen|decrease|difficulty|challenge/i)
      ).length;

      const analysisData = {
        goal_id: goal.id,
        goal_description: goal.goal_description,
        current_status: goal.status,
        current_progress: goal.current_progress,
        baseline: goal.baseline,
        target_outcome: goal.target_outcome,
        review_frequency: goal.review_date ? `Last reviewed: ${goal.review_date}` : 'No recent review',
        recent_notes_count: relevantNotes.length,
        note_sentiment: {
          progress_indicators: progressLanguage,
          stagnation_indicators: stagnationLanguage,
          decline_indicators: declineLanguage
        },
        interventions_active: goal.interventions_required ? JSON.parse(goal.interventions_required) : [],
        time_since_creation: Math.floor((new Date() - new Date(goal.start_date)) / (1000 * 60 * 60 * 24))
      };

      const prompt = `
Analyze client goal progress and suggest behaviour support plan modifications if needed.

GOAL ANALYSIS:
${JSON.stringify(analysisData, null, 2)}

Provide assessment in JSON:
{
  "progress_status": "on_track|at_risk|stagnating|regressing",
  "progress_summary": "brief assessment of progress toward goal",
  "key_observations": [
    "specific observation from available notes",
    "specific observation from available notes"
  ],
  "intervention_effectiveness": "Are current interventions supporting progress?",
  "bsp_modification_suggestions": [
    "specific modification to support plan strategy",
    "specific modification to support plan strategy"
  ],
  "alternative_approaches": [
    "alternative intervention approach to consider",
    "alternative intervention approach to consider"
  ],
  "flag_for_review": true|false,
  "urgency": "routine|soon|immediate",
  "recommended_action": "specific next step for practitioner or manager",
  "review_frequency_suggestion": "when this goal should next be reviewed"
}

Guidelines:
- Base assessment on actual progress indicators in notes
- Consider time in program and baseline comparison
- Be specific about what's working or not
- Flag if goal hasn't been reviewed in 90+ days`;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            progress_status: { type: 'string' },
            progress_summary: { type: 'string' },
            key_observations: { type: 'array', items: { type: 'string' } },
            intervention_effectiveness: { type: 'string' },
            bsp_modification_suggestions: { type: 'array', items: { type: 'string' } },
            alternative_approaches: { type: 'array', items: { type: 'string' } },
            flag_for_review: { type: 'boolean' },
            urgency: { type: 'string' },
            recommended_action: { type: 'string' },
            review_frequency_suggestion: { type: 'string' }
          }
        }
      });

      goalAnalyses.push({
        goal_id: goal.id,
        goal_description: goal.goal_description,
        ...analysis,
        supporting_data: analysisData
      });
    }

    // Identify clients needing review
    const goalsNeedingReview = goalAnalyses.filter(g => g.flag_for_review);
    const stagnatingGoals = goalAnalyses.filter(g => g.progress_status === 'stagnating' || g.progress_status === 'regressing');

    // Create review flag if needed
    let reviewFlag = null;
    if (goalsNeedingReview.length > 2 || stagnatingGoals.length > 0) {
      reviewFlag = await base44.entities.Task.create({
        title: `Client Goal Progress Review: ${client.full_name}`,
        category: 'Clinical',
        priority: stagnatingGoals.length > 0 ? 'high' : 'medium',
        status: 'pending',
        due_date: new Date().toISOString().split('T')[0],
        related_entity_type: 'Client',
        related_entity_id: client_id,
        description: `Review ${goalsNeedingReview.length} goals requiring attention. ${stagnatingGoals.length} goals showing stagnation or regression.`
      });
    }

    return Response.json({
      success: true,
      client_id,
      client_name: client.full_name,
      total_goals: clientGoals.length,
      goals_analyzed: goalAnalyses.length,
      goals_flagged_for_review: goalsNeedingReview.length,
      stagnating_goals: stagnatingGoals.length,
      goal_analyses: goalAnalyses,
      review_task_created: reviewFlag ? reviewFlag.id : null,
      active_bsp_id: activeBSP?.id
    });
  } catch (error) {
    console.error('Goal progress analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});