import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all practitioner data
    const [practitioners, incidents, sessionLogs, careerPathways, trainingRecs, goals] = await Promise.all([
      base44.entities.Practitioner.list(),
      base44.entities.Incident.list(),
      base44.entities.SessionSupportLog.list(),
      base44.entities.CareerPathway.list(),
      base44.entities.TrainingRecommendation.list(),
      base44.entities.ClientGoal.list()
    ]);

    const practitionerMatrix = practitioners.map(practitioner => {
      // Count incidents by practitioner
      const practitionerIncidents = incidents?.filter(i => i.practitioner_id === practitioner.id) || [];
      const criticalIncidents = practitionerIncidents.filter(i => i.severity === 'critical').length;
      const highIncidents = practitionerIncidents.filter(i => i.severity === 'high').length;

      // Session support effectiveness
      const practitionerSessionLogs = sessionLogs?.filter(l => l.practitioner_id === practitioner.id) || [];
      const avgEffectiveness = practitionerSessionLogs.length > 0
        ? (practitionerSessionLogs.reduce((sum, l) => sum + (l.effectiveness_rating || 0), 0) / practitionerSessionLogs.length)
        : null;

      // Career progression readiness
      const careerPath = careerPathways?.find(cp => cp.practitioner_id === practitioner.id);
      const progressionReadiness = careerPath?.progression_readiness || 0;

      // Training recommendations status
      const practitionerTraining = trainingRecs?.filter(t => t.practitioner_id === practitioner.id) || [];
      const pendingTraining = practitionerTraining.filter(t => t.status === 'recommended').length;
      const completedTraining = practitionerTraining.filter(t => t.status === 'completed').length;

      // Client goal success under their care
      const practitionerGoals = goals?.filter(g => {
        // Simplified: assume goal practitioner relationship exists
        return g.created_by === practitioner.email;
      }) || [];
      const achievedGoals = practitionerGoals.filter(g => g.status === 'achieved').length;
      const atRiskGoals = practitionerGoals.filter(g => g.status === 'at_risk').length;

      // Risk score calculation
      const riskScore = (criticalIncidents * 5) + (highIncidents * 2) + (atRiskGoals * 1);

      return {
        practitioner_id: practitioner.id,
        practitioner_name: practitioner.full_name,
        role: practitioner.role,
        caseload: practitioner.current_caseload || 0,
        performance_metrics: {
          incident_count: practitionerIncidents.length,
          critical_incidents: criticalIncidents,
          high_incidents: highIncidents,
          session_support_effectiveness: avgEffectiveness,
          client_goals_achieved: achievedGoals,
          client_goals_at_risk: atRiskGoals
        },
        development_metrics: {
          career_progression_readiness: progressionReadiness,
          pending_training_modules: pendingTraining,
          completed_training_modules: completedTraining,
          risk_score: riskScore
        }
      };
    });

    // Generate skill matrix using LLM
    const llmPrompt = `
    Analyze the following practitioner performance data and generate a comprehensive skill matrix assessment:

    ${JSON.stringify(practitionerMatrix, null, 2)}

    For each practitioner, provide:
    1. Top 3 strengths based on performance data
    2. Top 3 areas for development based on incidents and goal attainment
    3. Current skill proficiency assessment (beginner/developing/proficient/advanced)
    4. Identification of potential peer mentors (practitioners with high performance in areas where others struggle)
    5. Risk indicators (high incident rates, goal stagnation, training gaps)

    Return as JSON with structure: {
      practitioners: [
        {
          practitioner_id, practitioner_name, role,
          strengths: [...], 
          development_areas: [...],
          current_proficiency: "...",
          risk_indicators: [...],
          recommended_mentors: []
        }
      ],
      peer_mentor_pairings: [{ mentor_name, mentee_name, focus_area }],
      team_insights: {...}
    }
    `;

    const llmResult = await base44.integrations.Core.InvokeLLM({
      prompt: llmPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          practitioners: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                practitioner_id: { type: 'string' },
                practitioner_name: { type: 'string' },
                role: { type: 'string' },
                strengths: { type: 'array', items: { type: 'string' } },
                development_areas: { type: 'array', items: { type: 'string' } },
                current_proficiency: { type: 'string' },
                risk_indicators: { type: 'array', items: { type: 'string' } },
                recommended_mentors: { type: 'array', items: { type: 'string' } }
              }
            }
          },
          peer_mentor_pairings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                mentor_name: { type: 'string' },
                mentee_name: { type: 'string' },
                focus_area: { type: 'string' }
              }
            }
          },
          team_insights: { type: 'object' }
        }
      }
    });

    return Response.json({
      success: true,
      generated_date: new Date().toISOString(),
      practitioner_count: practitionerMatrix.length,
      skill_matrix: llmResult,
      raw_metrics: practitionerMatrix
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});