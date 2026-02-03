import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      client_id,
      scenario_weights = {}
    } = await req.json();

    if (!client_id) {
      return Response.json({ error: 'Missing client_id' }, { status: 400 });
    }

    // Fetch all necessary data
    const [
      clients,
      practitioners,
      skills,
      goals,
      caseNotes,
      assessments,
      matchFeedbacks,
      appointments
    ] = await Promise.all([
      base44.entities.Client.list(),
      base44.entities.Practitioner.list(),
      base44.entities.PractitionerSkill.list(),
      base44.entities.ClientGoal.list(),
      base44.entities.CaseNote.list(),
      base44.entities.MotivationAssessmentScale.list(),
      base44.entities.PractitionerMatchFeedback.list(),
      base44.entities.Appointment.list()
    ]);

    const client = clients?.find(c => c.id === client_id);
    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    // Build client profile
    const clientGoals = goals?.filter(g => g.client_id === client_id) || [];
    const clientNotes = caseNotes?.filter(n => n.client_id === client_id) || [];
    const clientAssessments = assessments?.filter(a => a.client_id === client_id) || [];

    const clientProfile = {
      name: client.full_name,
      ndis_number: client.ndis_number,
      service_type: client.service_type,
      risk_level: client.risk_level,
      goals: clientGoals.map(g => ({ domain: g.ndis_domain, description: g.goal_description, status: g.status })),
      motivation_assessment: clientAssessments[0] ? {
        primary_motivation: clientAssessments[0].primary_motivation,
        sensory_score: clientAssessments[0].sensory_needs_score,
        escape_score: clientAssessments[0].escape_avoidance_score,
        attention_score: clientAssessments[0].attention_score,
        tangibles_score: clientAssessments[0].tangibles_score
      } : null,
      recent_engagement: clientNotes.length,
      engagement_trend: clientNotes.length > 0 ? 'active' : 'inactive'
    };

    // Get real-time practitioner availability and workload
    const activePractitioners = practitioners?.filter(p => p.status === 'active') || [];
    const practitionerProfiles = activePractitioners.map(p => {
      const practitionerSkills = skills?.filter(s => s.practitioner_id === p.id) || [];
      const practitionerAppointments = appointments?.filter(a => a.practitioner_id === p.id) || [];
      
      // Calculate availability
      const capacityUtilization = (p.current_caseload || 0) / (p.caseload_capacity || 1);
      const availableCapacity = Math.max(0, (p.caseload_capacity || 5) - (p.current_caseload || 0));
      
      // Get historical match feedback
      const historicalMatches = matchFeedbacks?.filter(f => f.practitioner_id === p.id) || [];
      const avgMatchRating = historicalMatches.length > 0
        ? historicalMatches.reduce((sum, f) => sum + (f.feedback_rating || 0), 0) / historicalMatches.length
        : null;

      return {
        id: p.id,
        name: p.full_name,
        role: p.role,
        skills: practitionerSkills.map(s => ({ name: s.skill_name, category: s.skill_category, level: s.proficiency_level })),
        caseload: p.current_caseload || 0,
        capacity: p.caseload_capacity || 5,
        available_capacity: availableCapacity,
        capacity_utilization: capacityUtilization,
        certifications: p.certifications || [],
        billable_hours_actual: p.billable_hours_actual || 0,
        billable_hours_target: p.billable_hours_target || 0,
        historical_match_success: avgMatchRating,
        appointments_this_week: practitionerAppointments.filter(a => {
          const appDate = new Date(a.scheduled_date);
          const weekFromNow = new Date();
          weekFromNow.setDate(weekFromNow.getDate() + 7);
          return appDate >= new Date() && appDate <= weekFromNow;
        }).length
      };
    });

    // Build prompt for LLM with scenario weights
    const weightConfig = {
      skill_match: scenario_weights.skill_match ?? 0.25,
      availability: scenario_weights.availability ?? 0.2,
      motivation_alignment: scenario_weights.motivation_alignment ?? 0.25,
      engagement_history: scenario_weights.engagement_history ?? 0.15,
      match_history: scenario_weights.match_history ?? 0.15
    };

    const prompt = `
You are an AI system matching NDIS clients with practitioners. Analyze the client profile and practitioner data, then provide ranked recommendations.

CLIENT PROFILE:
${JSON.stringify(clientProfile, null, 2)}

AVAILABLE PRACTITIONERS:
${JSON.stringify(practitionerProfiles, null, 2)}

MATCHING WEIGHTS (adjust emphasis):
${JSON.stringify(weightConfig, null, 2)}

Provide your analysis in the following JSON format:
{
  "top_recommendations": [
    {
      "rank": 1,
      "practitioner_id": "...",
      "practitioner_name": "...",
      "match_score": 85,
      "alignment_summary": "...",
      "caseload_fit": "Capacity available, can take on client",
      "key_strengths": ["skill1", "skill2"],
      "skill_alignment": ["relevant_skill"],
      "risk_factors": ["potential_concern"],
      "mitigation_strategies": ["how_to_mitigate"],
      "onboarding_approach": "..."
    }
  ],
  "key_matching_factors": ["factor1", "factor2"],
  "success_metrics": [
    {
      "metric": "Engagement Score",
      "target": ">80%",
      "measurement_period_days": 30
    }
  ]
}

IMPORTANT:
- Only recommend practitioners with available capacity
- Consider real-time availability as a hard constraint
- Prioritize practitioners with successful match history
- Consider both client motivation and practitioner specialization
- Provide actionable mitigation strategies for any risks
`;

    const recommendations = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          top_recommendations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                rank: { type: 'number' },
                practitioner_id: { type: 'string' },
                practitioner_name: { type: 'string' },
                match_score: { type: 'number' },
                alignment_summary: { type: 'string' },
                caseload_fit: { type: 'string' },
                key_strengths: { type: 'array', items: { type: 'string' } },
                skill_alignment: { type: 'array', items: { type: 'string' } },
                risk_factors: { type: 'array', items: { type: 'string' } },
                mitigation_strategies: { type: 'array', items: { type: 'string' } },
                onboarding_approach: { type: 'string' }
              }
            }
          },
          key_matching_factors: { type: 'array', items: { type: 'string' } },
          success_metrics: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                metric: { type: 'string' },
                target: { type: 'string' },
                measurement_period_days: { type: 'number' }
              }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      client_id,
      client_name: client.full_name,
      analysis_date: new Date().toISOString(),
      practitioners_evaluated: practitionerProfiles.length,
      scenario_weights: weightConfig,
      recommendations
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});