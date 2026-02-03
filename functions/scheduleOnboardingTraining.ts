import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Schedule Onboarding Training Modules
 * Schedules training modules for new practitioners based on onboarding checklist
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { practitioner_id, onboarding_id } = await req.json();

    if (!practitioner_id || !onboarding_id) {
      return Response.json({ error: 'practitioner_id and onboarding_id required' }, { status: 400 });
    }

    // Fetch onboarding record
    const onboardings = await base44.asServiceRole.entities.PractitionerOnboarding.filter({ id: onboarding_id });
    if (onboardings.length === 0) {
      return Response.json({ error: 'Onboarding record not found' }, { status: 404 });
    }
    const onboarding = onboardings[0];

    // Parse training modules from onboarding
    let trainingModules = [];
    if (onboarding.training_modules) {
      try {
        trainingModules = JSON.parse(onboarding.training_modules);
      } catch (e) {
        console.error('Failed to parse training modules:', e);
      }
    }

    if (trainingModules.length === 0) {
      return Response.json({ error: 'No training modules found in onboarding checklist' }, { status: 400 });
    }

    // Fetch or create training modules, then assign them
    const assignments = [];
    const startDate = new Date();
    
    for (const module of trainingModules) {
      try {
        // Look for existing training module
        const modules = await base44.asServiceRole.entities.TrainingModule.filter({
          name: module.module_name
        });

        let moduleId;
        if (modules.length > 0) {
          moduleId = modules[0].id;
        } else {
          // Create new training module if it doesn't exist
          const created = await base44.asServiceRole.entities.TrainingModule.create({
            name: module.module_name,
            description: `${module.competency_area} - Onboarding module`,
            category: 'NDIS Compliance',
            duration_hours: module.estimated_hours,
            is_mandatory: module.priority === 'critical' || module.priority === 'high'
          });
          moduleId = created.id;
        }

        // Schedule training assignment
        const assignmentDate = new Date(startDate);
        assignmentDate.setDate(assignmentDate.getDate() + (module.schedule_week || 1) * 7);

        const assignment = await base44.asServiceRole.entities.TrainingAssignment.create({
          practitioner_id,
          module_id: moduleId,
          module_name: module.module_name,
          assignment_date: new Date().toISOString().split('T')[0],
          scheduled_start_date: assignmentDate.toISOString().split('T')[0],
          status: 'assigned',
          assignment_type: 'onboarding',
          completion_requirement: 'mandatory',
          notes: `Part of onboarding for ${onboarding.role} - Priority: ${module.priority}`
        });

        assignments.push(assignment);
      } catch (error) {
        console.error(`Failed to schedule training module ${module.module_name}:`, error);
      }
    }

    // Update onboarding status
    await base44.asServiceRole.entities.PractitionerOnboarding.update(onboarding_id, {
      status: 'training_scheduled',
      training_scheduled_date: new Date().toISOString().split('T')[0]
    });

    return Response.json({
      onboarding_id,
      practitioner_id,
      total_modules_scheduled: assignments.length,
      training_assignments: assignments,
      schedule_start_date: startDate.toISOString().split('T')[0],
      estimated_completion_date: new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      message: `${assignments.length} training modules scheduled for practitioner`
    });

  } catch (error) {
    console.error('Training scheduling error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});