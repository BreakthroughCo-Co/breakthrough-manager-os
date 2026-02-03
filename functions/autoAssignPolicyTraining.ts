import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { policy_title, policy_category, affected_roles } = await req.json();

    // Find relevant training modules based on policy category
    const modules = await base44.asServiceRole.entities.TrainingModule.filter({ 
      status: 'active',
      category: policy_category || 'NDIS Compliance'
    });

    if (modules.length === 0) {
      return Response.json({ 
        message: 'No relevant training modules found',
        assignments: []
      });
    }

    // Get practitioners based on affected roles
    const practitioners = await base44.asServiceRole.entities.Practitioner.filter({ 
      status: 'active' 
    });

    const targetPractitioners = affected_roles && affected_roles.length > 0
      ? practitioners.filter(p => affected_roles.includes(p.role))
      : practitioners;

    const assignments = [];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14); // 2 weeks to complete

    // Assign top relevant module to all target practitioners
    const module = modules[0];
    
    for (const practitioner of targetPractitioners) {
      // Check if already assigned
      const existing = await base44.asServiceRole.entities.TrainingAssignment.filter({
        practitioner_id: practitioner.id,
        module_id: module.id,
        completion_status: 'not_started'
      });

      if (existing.length === 0) {
        const assignment = await base44.asServiceRole.entities.TrainingAssignment.create({
          practitioner_id: practitioner.id,
          practitioner_name: practitioner.full_name,
          practitioner_email: practitioner.email,
          module_id: module.id,
          module_name: module.module_name,
          assignment_reason: 'new_policy',
          assigned_date: new Date().toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0],
          assigned_by: 'system',
          notes: `Auto-assigned due to new policy release: ${policy_title}`,
        });
        assignments.push(assignment);
      }
    }

    return Response.json({
      policy_title,
      module_assigned: module.module_name,
      practitioners_assigned: assignments.length,
      assignments
    });
  } catch (error) {
    console.error('Auto-assign policy training error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});