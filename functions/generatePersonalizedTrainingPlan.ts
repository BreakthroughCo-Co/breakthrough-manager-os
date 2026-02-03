import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { practitioner_id } = body;

    if (!practitioner_id) {
      return Response.json({ error: 'practitioner_id required' }, { status: 400 });
    }

    // Fetch practitioner skill matrix analysis
    const skillMatrixResult = await base44.functions.invoke('generatePractitionerSkillMatrix', {});
    const practitioner = skillMatrixResult.data?.skill_matrix?.practitioners?.find(p => p.practitioner_id === practitioner_id);

    if (!practitioner) {
      return Response.json({ error: 'Practitioner not found' }, { status: 404 });
    }

    // Fetch existing training recommendations
    const existingTraining = await base44.entities.TrainingRecommendation.filter({
      practitioner_id: practitioner_id
    });

    const developmentAreas = practitioner.development_areas || [];

    // Use LLM to generate personalized training plan
    const prompt = `
    Based on the following practitioner profile and identified development areas, generate a prioritized, personalized training plan:

    Practitioner: ${practitioner.practitioner_name}
    Role: ${practitioner.role}
    Development Areas: ${developmentAreas.join(', ')}
    Current Proficiency Level: ${practitioner.current_proficiency}
    
    For each development area, recommend:
    1. Specific training module(s) with estimated duration
    2. Training category (NDIS Compliance, Clinical Skills, Behaviour Support, etc.)
    3. Priority level (critical, high, medium, low) based on impact on client outcomes and compliance
    4. Suggested completion timeline
    5. Success metrics to track progress
    6. Peer learning opportunities aligned with mentor pairings

    Return as JSON with structure:
    {
      training_modules: [
        {
          module_name,
          category,
          development_area,
          priority,
          estimated_hours,
          completion_timeline_weeks,
          success_metrics: [],
          learning_approach: "self-paced|instructor-led|peer-learning|blended"
        }
      ],
      overall_plan_duration_weeks: number,
      peer_learning_opportunities: [
        { opportunity, paired_practitioner_name }
      ],
      progress_checkpoints: [
        { week, milestone }
      ]
    }
    `;

    const trainingPlan = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          training_modules: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                module_name: { type: 'string' },
                category: { type: 'string' },
                development_area: { type: 'string' },
                priority: { type: 'string' },
                estimated_hours: { type: 'number' },
                completion_timeline_weeks: { type: 'number' },
                success_metrics: { type: 'array', items: { type: 'string' } },
                learning_approach: { type: 'string' }
              }
            }
          },
          overall_plan_duration_weeks: { type: 'number' },
          peer_learning_opportunities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                opportunity: { type: 'string' },
                paired_practitioner_name: { type: 'string' }
              }
            }
          },
          progress_checkpoints: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                week: { type: 'number' },
                milestone: { type: 'string' }
              }
            }
          }
        }
      }
    });

    // Create TrainingRecommendation entities for each module
    const trainingRecommendations = await Promise.all(
      trainingPlan.training_modules.map(module => {
        const existingRec = existingTraining?.find(t => t.training_module_name === module.module_name);
        
        if (existingRec) {
          return Promise.resolve(existingRec);
        }

        return base44.entities.TrainingRecommendation.create({
          practitioner_id: practitioner_id,
          practitioner_name: practitioner.practitioner_name,
          training_module_name: module.module_name,
          training_category: module.category,
          skill_gap: module.development_area,
          priority: module.priority,
          estimated_hours: module.estimated_hours,
          recommendation_reason: `Identified development area: ${module.development_area}. Supports career progression and client outcome quality.`,
          career_benefit: `Advances expertise in ${module.category}. Aligns with ${practitioner.role} responsibilities.`,
          status: 'recommended'
        });
      })
    );

    return Response.json({
      success: true,
      practitioner_id,
      practitioner_name: practitioner.practitioner_name,
      personalized_plan: trainingPlan,
      created_training_recommendations: trainingRecommendations.length,
      total_commitment_hours: trainingPlan.training_modules.reduce((sum, m) => sum + m.estimated_hours, 0),
      plan_duration_weeks: trainingPlan.overall_plan_duration_weeks
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});