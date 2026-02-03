import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { practitioner_id, context_type = 'general' } = payload;

    // Fetch practitioner and their training history
    const practitioner = await base44.entities.Practitioner.get(practitioner_id);
    const assignments = await base44.entities.TrainingAssignment.filter({ practitioner_id });
    const ratings = await base44.entities.TrainingModuleRating.filter({ practitioner_id });
    const modules = await base44.entities.TrainingModule.list();

    // Get team-wide training needs
    const teamNeeds = await base44.entities.TeamTrainingNeed.filter({ status: 'identified' });

    // Get recent incidents and breaches for context
    const recentIncidents = await base44.entities.Incident.list('-created_date', 20);
    const recentBreaches = await base44.entities.ComplianceBreach.list('-created_date', 10);

    // Get ratings data to inform recommendations
    const allRatings = await base44.entities.TrainingModuleRating.list();
    const moduleStats = {};
    modules.forEach(module => {
      const moduleRatings = allRatings.filter(r => r.module_id === module.id);
      if (moduleRatings.length > 0) {
        moduleStats[module.id] = {
          avg_rating: moduleRatings.reduce((sum, r) => sum + r.effectiveness_rating, 0) / moduleRatings.length,
          total_completions: moduleRatings.length,
          recommend_rate: moduleRatings.filter(r => r.would_recommend).length / moduleRatings.length,
        };
      }
    });

    // Analyze practitioner's training history
    const completedModules = assignments.filter(a => a.status === 'completed').map(a => a.module_name);
    const practitionerRatings = ratings.map(r => ({
      module: r.module_name,
      rating: r.effectiveness_rating,
      feedback: r.feedback_text,
    }));

    // Check if practitioner is affected by team needs
    const relevantTeamNeeds = teamNeeds.filter(need => {
      try {
        const affected = JSON.parse(need.affected_practitioners || '[]');
        return affected.includes(practitioner_id);
      } catch {
        return false;
      }
    });

    const aiPrompt = `You are an adaptive learning AI for NDIS training recommendations.

PRACTITIONER PROFILE:
- Name: ${practitioner.full_name}
- Role: ${practitioner.role}
- Certifications: ${JSON.stringify(practitioner.certifications || [])}
- Completed Training Modules: ${completedModules.length}
- Current Caseload: ${practitioner.current_caseload || 0}

COMPLETED TRAINING:
${completedModules.join(', ')}

PRACTITIONER RATINGS & FEEDBACK:
${JSON.stringify(practitionerRatings, null, 2)}

TEAM-WIDE NEEDS AFFECTING THIS PRACTITIONER:
${JSON.stringify(relevantTeamNeeds, null, 2)}

AVAILABLE MODULES & EFFECTIVENESS:
${JSON.stringify(
  modules.map(m => ({
    id: m.id,
    name: m.name,
    category: m.category,
    difficulty: m.difficulty_level,
    duration: m.estimated_duration_hours,
    stats: moduleStats[m.id] || null,
  })),
  null,
  2
)}

RECENT INCIDENT PATTERNS:
${JSON.stringify(recentIncidents.slice(0, 5).map(i => ({ category: i.category, severity: i.severity_level })))}

RECENT COMPLIANCE BREACHES:
${JSON.stringify(recentBreaches.slice(0, 5).map(b => ({ category: b.breach_category, severity: b.severity })))}

CONTEXT: ${context_type}

TASK:
Recommend 3-5 training modules for this practitioner considering:
1. Team-wide needs they're affected by
2. Recent incident/breach patterns suggesting systemic gaps
3. Modules they haven't completed yet
4. Their role and career development path
5. Module effectiveness ratings from other staff
6. Upcoming service demands (e.g., LEGO Therapy expansion)
7. Their previous training ratings and feedback

Prioritize:
- Critical team needs first
- High-rated, well-recommended modules
- Modules aligned with their role
- Complementary skill building (not just gaps)

Output as JSON:
{
  "recommendations": [
    {
      "module_id": "string",
      "module_name": "string",
      "category": "string",
      "priority": "critical|high|medium|low",
      "rationale": "detailed explanation",
      "expected_impact": "how this will help",
      "alignment_with_team_needs": "connection to team needs",
      "suggested_completion_timeline": "e.g., '2 weeks'",
      "prerequisites": "any required prior training"
    }
  ],
  "learning_pathway": "suggested sequence and career development path"
}`;

    const aiResult = await base44.integrations.Core.InvokeLLM({
      prompt: aiPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          recommendations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                module_id: { type: 'string' },
                module_name: { type: 'string' },
                category: { type: 'string' },
                priority: { type: 'string' },
                rationale: { type: 'string' },
                expected_impact: { type: 'string' },
                alignment_with_team_needs: { type: 'string' },
                suggested_completion_timeline: { type: 'string' },
                prerequisites: { type: 'string' },
              },
            },
          },
          learning_pathway: { type: 'string' },
        },
      },
    });

    return Response.json({
      success: true,
      practitioner: {
        id: practitioner.id,
        name: practitioner.full_name,
        role: practitioner.role,
      },
      recommendations: aiResult.recommendations,
      learning_pathway: aiResult.learning_pathway,
      context: {
        completed_modules: completedModules.length,
        team_needs_count: relevantTeamNeeds.length,
        available_modules: modules.length,
      },
    });
  } catch (error) {
    console.error('Adaptive training recommendation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});