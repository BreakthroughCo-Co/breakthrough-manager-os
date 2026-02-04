import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { practitioner_id } = await req.json();

    const [practitioner, skills, trainingProgress, feedback, careerPathway] = await Promise.all([
      base44.asServiceRole.entities.Practitioner.get(practitioner_id),
      base44.asServiceRole.entities.PractitionerSkill.filter({ practitioner_id }),
      base44.asServiceRole.entities.TrainingProgress.filter({ practitioner_id }),
      base44.asServiceRole.entities.ClientFeedback.filter({ practitioner_id }),
      base44.asServiceRole.entities.CareerPathway.filter({ practitioner_id }).then(p => p[0]).catch(() => null)
    ]);

    const completedTraining = trainingProgress.filter(t => t.status === 'completed');
    const inProgressTraining = trainingProgress.filter(t => t.status === 'in_progress');
    const failedTraining = trainingProgress.filter(t => t.status === 'failed' || (t.quiz_score && t.quiz_score < 80));

    const avgTrainingScore = completedTraining.length > 0
      ? completedTraining.reduce((sum, t) => sum + (t.quiz_score || 0), 0) / completedTraining.length
      : 0;

    const recentFeedback = feedback.filter(f => {
      const date = new Date(f.feedback_date);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return date >= threeMonthsAgo;
    });

    const avgSatisfaction = recentFeedback.length > 0
      ? recentFeedback.reduce((sum, f) => sum + (f.overall_satisfaction || 0), 0) / recentFeedback.length
      : 0;

    const improvementThemes = {};
    feedback.forEach(f => {
      f.improvement_areas?.forEach(area => {
        improvementThemes[area] = (improvementThemes[area] || 0) + 1;
      });
    });

    const prompt = `
You are a professional development specialist creating personalized learning pathways for NDIS practitioners.

PRACTITIONER PROFILE:
- Name: ${practitioner.full_name}
- Role: ${practitioner.role}
- Years of Experience: ${practitioner.years_of_experience || 0}

SKILL INVENTORY:
${skills.map(s => `- ${s.skill_name}: ${s.proficiency_level} proficiency (${s.years_experience || 0} years)`).join('\n')}

TRAINING HISTORY:
- Completed Modules: ${completedTraining.length}
- Average Score: ${avgTrainingScore.toFixed(1)}%
- In Progress: ${inProgressTraining.length}
- Failed/Struggling: ${failedTraining.length}

PERFORMANCE INSIGHTS:
- Recent Client Satisfaction: ${avgSatisfaction.toFixed(1)}/5
- Common Improvement Areas: ${Object.entries(improvementThemes).map(([area, count]) => `${area} (${count})`).join(', ')}

CAREER ASPIRATION:
${careerPathway ? `Aspires to: ${careerPathway.recommended_next_role}, Readiness: ${careerPathway.progression_readiness}%` : 'Not yet defined'}

Create a personalized professional development pathway including:
1. SKILL GAP ANALYSIS: Specific areas requiring development
2. PRIORITY TRAINING: Most critical learning needs
3. RECOMMENDED COURSES: Both internal modules and external resources
4. LEARNING SEQUENCE: Optimal order of skill acquisition
5. TIMELINE: Realistic development milestones
6. CAREER ALIGNMENT: How pathway supports progression goals

Use adult learning principles and NDIS practice standards.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          skill_gap_analysis: {
            type: "array",
            items: {
              type: "object",
              properties: {
                skill_area: { type: "string" },
                current_level: { type: "string" },
                target_level: { type: "string" },
                gap_severity: { type: "string" },
                impact_on_performance: { type: "string" }
              }
            }
          },
          priority_training: {
            type: "array",
            items: {
              type: "object",
              properties: {
                training_need: { type: "string" },
                priority_level: { type: "string" },
                rationale: { type: "string" },
                expected_impact: { type: "string" }
              }
            }
          },
          recommended_courses: {
            type: "array",
            items: {
              type: "object",
              properties: {
                course_name: { type: "string" },
                provider: { type: "string" },
                course_type: { type: "string" },
                estimated_duration: { type: "string" },
                cost_estimate: { type: "string" },
                relevance_score: { type: "number" }
              }
            }
          },
          learning_sequence: {
            type: "array",
            items: {
              type: "object",
              properties: {
                phase: { type: "string" },
                focus_areas: { type: "array", items: { type: "string" } },
                duration: { type: "string" },
                success_criteria: { type: "array", items: { type: "string" } }
              }
            }
          },
          timeline: {
            type: "object",
            properties: {
              immediate_actions: { type: "array", items: { type: "string" } },
              three_month_goals: { type: "array", items: { type: "string" } },
              six_month_goals: { type: "array", items: { type: "string" } },
              twelve_month_goals: { type: "array", items: { type: "string" } }
            }
          },
          career_alignment: {
            type: "object",
            properties: {
              pathway_supports_progression: { type: "string" },
              estimated_readiness_timeline: { type: "string" },
              key_milestones_for_advancement: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      development_pathway: aiResponse,
      practitioner_summary: {
        name: practitioner.full_name,
        role: practitioner.role,
        training_completed: completedTraining.length,
        avg_satisfaction: avgSatisfaction
      },
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});