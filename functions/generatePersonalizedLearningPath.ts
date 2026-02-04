import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { practitioner_id } = await req.json();

    const [practitioner, skillMatrix, onboardingPlan, trainingModules] = await Promise.all([
      base44.asServiceRole.entities.Practitioner.get(practitioner_id),
      base44.asServiceRole.entities.PractitionerSkill.filter({ practitioner_id }),
      base44.asServiceRole.entities.PractitionerOnboardingPlan.filter({ practitioner_id }).then(p => p[0]).catch(() => null),
      base44.asServiceRole.entities.TrainingModule.list()
    ]);

    const prompt = `
You are an NDIS workforce development specialist creating a personalized learning path.

PRACTITIONER PROFILE:
- Name: ${practitioner.full_name}
- Role: ${practitioner.role}
- Experience Level: ${practitioner.years_of_experience || 'Unknown'}

IDENTIFIED SKILL GAPS:
${skillMatrix.filter(s => ['beginner', 'developing'].includes(s.proficiency_level)).map(s => 
  `- ${s.skill_name} (${s.skill_category}): ${s.proficiency_level}`
).join('\n')}

ONBOARDING STATUS:
${onboardingPlan ? `Status: ${onboardingPlan.status}, Identified Gaps: ${onboardingPlan.identified_skill_gaps?.join(', ')}` : 'No active onboarding plan'}

AVAILABLE TRAINING MODULES:
${trainingModules.map(m => 
  `- ${m.module_name} (${m.category}, ${m.difficulty_level}, ${m.estimated_duration_minutes}min)`
).join('\n')}

Create a prioritized 90-day learning path that:
1. Addresses critical skill gaps first
2. Sequences modules logically (foundational → advanced)
3. Balances workload (max 2 hours/week)
4. Focuses on NDIS compliance and role-specific competencies
5. Includes milestones and checkpoints

Respond with recommended module sequence, rationale, and expected outcomes.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          learning_path: {
            type: "array",
            items: {
              type: "object",
              properties: {
                week: { type: "number" },
                module_id: { type: "string" },
                module_name: { type: "string" },
                priority: { type: "string" },
                rationale: { type: "string" },
                expected_outcome: { type: "string" }
              }
            }
          },
          overall_development_goal: { type: "string" },
          estimated_completion_date: { type: "string" },
          checkpoints: {
            type: "array",
            items: {
              type: "object",
              properties: {
                week: { type: "number" },
                milestone: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      practitioner_id,
      practitioner_name: practitioner.full_name,
      learning_path: aiResponse
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});