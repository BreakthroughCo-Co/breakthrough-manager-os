import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { practitioner_id, training_modules } = await req.json();

    if (!practitioner_id || !training_modules || !Array.isArray(training_modules)) {
      return Response.json({ error: 'Missing practitioner_id or training_modules array' }, { status: 400 });
    }

    const assignments = [];

    // Create training recommendation records
    for (const module of training_modules) {
      const recommendation = await base44.entities.TrainingRecommendation.create({
        practitioner_id,
        practitioner_name: module.practitioner_name,
        training_module_name: module.training_module,
        training_category: module.category,
        skill_gap: module.skill_gap,
        priority: module.priority || 'medium',
        estimated_hours: module.estimated_hours || 0,
        recommendation_reason: module.business_justification,
        career_benefit: module.career_benefit,
        status: 'assigned',
        assigned_date: new Date().toISOString().split('T')[0],
        target_completion_date: module.target_completion_date || calculateTargetDate(module.estimated_hours)
      });

      assignments.push(recommendation);

      // Create task to track completion
      await base44.entities.Task.create({
        title: `Complete training: ${module.training_module}`,
        description: `${module.training_module} - ${module.skill_gap}`,
        category: 'Professional Development',
        priority: module.priority === 'critical' ? 'urgent' : 'high',
        status: 'pending',
        assigned_to: module.practitioner_name,
        related_entity_type: 'TrainingRecommendation',
        related_entity_id: recommendation.id,
        due_date: calculateTargetDate(module.estimated_hours)
      });
    }

    return Response.json({
      success: true,
      practitioner_id,
      assignments_created: assignments.length,
      assignments
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateTargetDate(estimatedHours) {
  const date = new Date();
  // Assume 2 hours per week = 2-3 months for most trainings
  const weeksNeeded = Math.ceil((estimatedHours || 20) / 2);
  date.setDate(date.getDate() + (weeksNeeded * 7));
  return date.toISOString().split('T')[0];
}