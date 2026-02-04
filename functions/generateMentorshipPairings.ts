import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const [practitioners, skills, trainingProgress, performanceData] = await Promise.all([
      base44.asServiceRole.entities.Practitioner.filter({ status: 'active' }),
      base44.asServiceRole.entities.PractitionerSkill.list(),
      base44.asServiceRole.entities.TrainingProgress.list(),
      base44.asServiceRole.entities.CareerPathway.list()
    ]);

    // Categorize practitioners
    const seniorPractitioners = practitioners.filter(p => 
      p.role === 'Senior Practitioner' || p.role === 'Practice Lead' ||
      (p.years_of_experience && p.years_of_experience >= 5)
    );

    const juniorPractitioners = practitioners.filter(p =>
      p.role === 'Allied Health Assistant' || p.role === 'Behaviour Support Practitioner' ||
      (p.years_of_experience && p.years_of_experience < 3)
    );

    const practitionerProfiles = practitioners.map(prac => {
      const pracSkills = skills.filter(s => s.practitioner_id === prac.id);
      const pracTraining = trainingProgress.filter(t => t.practitioner_id === prac.id);
      const pracCareer = performanceData.find(p => p.practitioner_id === prac.id);

      const completedTraining = pracTraining.filter(t => t.status === 'completed');
      const avgScore = completedTraining.length > 0
        ? completedTraining.reduce((sum, t) => sum + (t.quiz_score || 0), 0) / completedTraining.length
        : 0;

      return {
        practitioner_id: prac.id,
        practitioner_name: prac.full_name,
        role: prac.role,
        years_experience: prac.years_of_experience || 0,
        skill_areas: pracSkills.map(s => ({ skill: s.skill_name, level: s.proficiency_level })),
        training_completed: completedTraining.length,
        avg_training_score: avgScore,
        career_aspiration: pracCareer?.recommended_next_role || 'Not defined',
        development_needs: pracCareer?.development_needs || [],
        is_senior: seniorPractitioners.some(s => s.id === prac.id),
        is_junior: juniorPractitioners.some(j => j.id === prac.id)
      };
    });

    const prompt = `
You are a workforce development specialist designing a mentorship program for an NDIS provider.

SENIOR PRACTITIONERS (Potential Mentors):
${practitionerProfiles.filter(p => p.is_senior).map(p =>
  `- ${p.practitioner_name} (${p.role}, ${p.years_experience} years): ${p.skill_areas.slice(0, 3).map(s => s.skill).join(', ')}`
).join('\n')}

JUNIOR PRACTITIONERS (Potential Mentees):
${practitionerProfiles.filter(p => p.is_junior).map(p =>
  `- ${p.practitioner_name} (${p.role}, ${p.years_experience} years): Aspires to ${p.career_aspiration}, Development needs: ${p.development_needs.slice(0, 2).join(', ')}`
).join('\n')}

Design optimal mentor-mentee pairings considering:
- Skill complementarity
- Career development alignment
- Learning style compatibility
- Workload balance

For each pairing provide:
1. MENTOR-MENTEE PAIRINGS: Specific recommendations with rationale
2. DEVELOPMENT GOALS: AI-facilitated goals for each mentee
3. MENTORSHIP FRAMEWORK: Structure, frequency, focus areas
4. SUCCESS METRICS: How to measure mentorship effectiveness
5. RISK FACTORS: Potential challenges and mitigation

Use adult learning principles and NDIS workforce development frameworks.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          recommended_pairings: {
            type: "array",
            items: {
              type: "object",
              properties: {
                mentor_name: { type: "string" },
                mentor_id: { type: "string" },
                mentee_name: { type: "string" },
                mentee_id: { type: "string" },
                pairing_rationale: { type: "string" },
                compatibility_score: { type: "number" },
                focus_areas: { type: "array", items: { type: "string" } },
                expected_outcomes: { type: "array", items: { type: "string" } }
              }
            }
          },
          mentee_development_goals: {
            type: "array",
            items: {
              type: "object",
              properties: {
                mentee_name: { type: "string" },
                short_term_goals: { type: "array", items: { type: "string" } },
                long_term_goals: { type: "array", items: { type: "string" } },
                skill_milestones: { type: "array", items: { type: "string" } },
                career_milestone: { type: "string" }
              }
            }
          },
          mentorship_framework: {
            type: "object",
            properties: {
              session_frequency: { type: "string" },
              session_duration: { type: "string" },
              program_duration: { type: "string" },
              review_checkpoints: { type: "array", items: { type: "string" } },
              documentation_requirements: { type: "array", items: { type: "string" } }
            }
          },
          success_metrics: {
            type: "array",
            items: {
              type: "object",
              properties: {
                metric: { type: "string" },
                measurement_method: { type: "string" },
                target_value: { type: "string" },
                review_frequency: { type: "string" }
              }
            }
          },
          risk_factors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                risk: { type: "string" },
                mitigation: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      mentorship_plan: aiResponse,
      practitioner_profiles: practitionerProfiles,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});