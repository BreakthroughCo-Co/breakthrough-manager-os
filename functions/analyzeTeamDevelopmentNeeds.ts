import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { days_lookback = 90 } = await req.json();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days_lookback);

    // Fetch team data
    const [
      practitioners,
      incidents,
      sessionLogs,
      goalAnalyses,
      trainingRecs,
      careerPathways
    ] = await Promise.all([
      base44.entities.Practitioner.list(),
      base44.entities.Incident.list(),
      base44.entities.SessionSupportLog.list(),
      base44.entities.ClientGoal.list(),
      base44.entities.TrainingRecommendation.list(),
      base44.entities.CareerPathway.list()
    ]);

    // Filter for period
    const recentIncidents = incidents?.filter(i => new Date(i.incident_date) >= cutoffDate) || [];
    const recentLogs = sessionLogs?.filter(l => new Date(l.request_timestamp) >= cutoffDate) || [];

    // Analyze per practitioner
    const teamAnalysis = {};

    practitioners?.forEach(p => {
      const pIncidents = recentIncidents.filter(i => i.practitioner_id === p.id);
      const pLogs = recentLogs.filter(l => l.practitioner_id === p.id);
      const pPathway = careerPathways?.find(cp => cp.practitioner_id === p.id);

      teamAnalysis[p.id] = {
        name: p.full_name,
        role: p.role,
        incidents_count: pIncidents.length,
        incident_types: pIncidents.reduce((acc, i) => {
          acc[i.incident_type] = (acc[i.incident_type] || 0) + 1;
          return acc;
        }, {}),
        ai_support_requests: pLogs.length,
        ai_request_types: pLogs.reduce((acc, l) => {
          acc[l.request_type] = (acc[l.request_type] || 0) + 1;
          return acc;
        }, {}),
        progression_readiness: pPathway?.progression_readiness || 0,
        identified_gaps: pPathway?.development_needs || []
      };
    });

    // Identify patterns and gaps
    const analysisPrompt = `
Analyze team-wide practitioner data to identify emerging skill gaps and training needs across the behaviour support team.

TEAM ANALYSIS DATA (Last ${days_lookback} days):
${JSON.stringify(Object.values(teamAnalysis), null, 2)}

Provide team development assessment in JSON:
{
  "key_findings": [
    "pattern identified with supporting evidence",
    "pattern identified with supporting evidence"
  ],
  "skill_gaps_by_category": {
    "clinical": ["gap1", "gap2"],
    "compliance": ["gap1"],
    "communication": ["gap1"],
    "risk_management": ["gap1"]
  },
  "at_risk_practitioners": [
    {
      "name": "practitioner name",
      "concerns": ["concern 1", "concern 2"],
      "recommended_support": "specific support recommendation"
    }
  ],
  "team_wide_training_recommendations": [
    {
      "training_topic": "topic name",
      "priority": "critical|high|medium",
      "target_audience": "role or team members",
      "suggested_format": "workshop|online|supervision|peer_learning",
      "expected_outcome": "what practitioners should demonstrate after training",
      "duration_hours": number
    }
  ],
  "high_performer_peer_leaders": [
    {
      "name": "practitioner name",
      "strength_area": "area of competency",
      "could_mentor": "who could benefit from their expertise"
    }
  ],
  "supervision_focus_areas": [
    "area that needs focused supervision across team"
  ],
  "estimated_team_readiness": {
    "current_readiness": "percentage or descriptor",
    "3_month_outlook": "outlook if recommendations implemented"
  }
}

Guidelines:
- Focus on patterns affecting team capacity and client outcomes
- Distinguish between individual development needs and team-wide issues
- Recommend proportionate interventions
- Identify peer learning opportunities
- Flag any critical compliance or safety concerns`;

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          key_findings: { type: 'array', items: { type: 'string' } },
          skill_gaps_by_category: { type: 'object' },
          at_risk_practitioners: { type: 'array' },
          team_wide_training_recommendations: { type: 'array' },
          high_performer_peer_leaders: { type: 'array' },
          supervision_focus_areas: { type: 'array', items: { type: 'string' } },
          estimated_team_readiness: { type: 'object' }
        }
      }
    });

    // Auto-generate training recommendations from analysis
    const newRecommendations = [];
    for (const training of analysis.team_wide_training_recommendations || []) {
      // Find practitioners matching target audience
      const targetPractitioners = practitioners?.filter(p => {
        if (training.target_audience.includes('all')) return true;
        if (training.target_audience.includes(p.role)) return true;
        return false;
      }) || [];

      for (const p of targetPractitioners) {
        const existingRec = trainingRecs?.find(t => 
          t.practitioner_id === p.id && 
          t.training_module_name.includes(training.training_topic)
        );

        if (!existingRec) {
          const rec = await base44.entities.TrainingRecommendation.create({
            practitioner_id: p.id,
            practitioner_name: p.full_name,
            training_module_name: training.training_topic,
            training_category: 'Professional Development',
            skill_gap: `Team-wide development need: ${training.training_topic}`,
            priority: training.priority,
            estimated_hours: training.duration_hours,
            recommendation_reason: training.expected_outcome,
            career_benefit: 'Supports team capability and client outcomes',
            status: 'recommended'
          });
          newRecommendations.push(rec);
        }
      }
    }

    // Flag at-risk practitioners for manager follow-up
    for (const atRisk of analysis.at_risk_practitioners || []) {
      const practitioner = practitioners?.find(p => p.full_name === atRisk.name);
      if (practitioner) {
        await base44.entities.Task.create({
          title: `Development Support: ${atRisk.name}`,
          category: 'Professional Development',
          priority: 'high',
          status: 'pending',
          assigned_to: 'Manager',
          related_entity_type: 'Practitioner',
          related_entity_id: practitioner.id,
          description: `${atRisk.concerns.join(', ')}. Recommendation: ${atRisk.recommended_support}`
        });
      }
    }

    return Response.json({
      success: true,
      analysis_period_days: days_lookback,
      practitioners_analyzed: practitioners?.length || 0,
      team_analysis: analysis,
      new_training_recommendations: newRecommendations.length,
      training_recommendations_created: newRecommendations
    });
  } catch (error) {
    console.error('Team development analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});