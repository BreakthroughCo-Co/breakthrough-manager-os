import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { trigger_type, trigger_data } = await req.json();
    
    const practitioners = await base44.asServiceRole.entities.Practitioner.list();
    const modules = await base44.asServiceRole.entities.TrainingModule.filter({ status: 'active' });
    const assignments = [];

    if (trigger_type === 'new_policy') {
      // Assign policy-related training to all relevant practitioners
      const policyModule = modules.find(m => m.module_code === trigger_data.module_code);
      if (policyModule) {
        const requiredRoles = JSON.parse(policyModule.required_for_roles || '[]');
        const targetPractitioners = practitioners.filter(p => 
          requiredRoles.length === 0 || requiredRoles.includes(p.role)
        );

        for (const practitioner of targetPractitioners) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 14); // 2 weeks to complete

          const assignment = await base44.asServiceRole.entities.TrainingAssignment.create({
            practitioner_id: practitioner.id,
            practitioner_name: practitioner.full_name,
            practitioner_email: practitioner.email,
            module_id: policyModule.id,
            module_name: policyModule.module_name,
            assignment_reason: 'new_policy',
            assigned_date: new Date().toISOString().split('T')[0],
            due_date: dueDate.toISOString().split('T')[0],
            assigned_by: 'system',
          });
          assignments.push(assignment);
        }
      }
    } else if (trigger_type === 'compliance_gap') {
      // Assign training based on compliance audit findings
      const { gap_category, affected_roles } = trigger_data;
      
      const relevantModules = modules.filter(m => 
        m.category === gap_category || m.module_name.toLowerCase().includes(gap_category.toLowerCase())
      );

      const targetPractitioners = practitioners.filter(p => 
        affected_roles.includes(p.role)
      );

      for (const module of relevantModules) {
        for (const practitioner of targetPractitioners) {
          // Check if already assigned
          const existing = await base44.asServiceRole.entities.TrainingAssignment.filter({
            practitioner_id: practitioner.id,
            module_id: module.id,
            completion_status: 'not_started'
          });

          if (existing.length === 0) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 7); // 1 week for compliance gaps

            const assignment = await base44.asServiceRole.entities.TrainingAssignment.create({
              practitioner_id: practitioner.id,
              practitioner_name: practitioner.full_name,
              practitioner_email: practitioner.email,
              module_id: module.id,
              module_name: module.module_name,
              assignment_reason: 'compliance_gap',
              assigned_date: new Date().toISOString().split('T')[0],
              due_date: dueDate.toISOString().split('T')[0],
              assigned_by: 'system',
            });
            assignments.push(assignment);
          }
        }
      }
    } else if (trigger_type === 'breach_detected') {
      // Assign training based on specific breach
      const { breach_type, involved_staff } = trigger_data;
      
      const relevantModules = modules.filter(m => 
        m.module_name.toLowerCase().includes('compliance') ||
        m.module_name.toLowerCase().includes(breach_type.replace(/_/g, ' '))
      );

      for (const staffEmail of involved_staff) {
        const practitioner = practitioners.find(p => p.email === staffEmail);
        if (practitioner) {
          for (const module of relevantModules) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 5); // Urgent - 5 days

            const assignment = await base44.asServiceRole.entities.TrainingAssignment.create({
              practitioner_id: practitioner.id,
              practitioner_name: practitioner.full_name,
              practitioner_email: practitioner.email,
              module_id: module.id,
              module_name: module.module_name,
              assignment_reason: 'compliance_gap',
              assigned_date: new Date().toISOString().split('T')[0],
              due_date: dueDate.toISOString().split('T')[0],
              assigned_by: 'system',
              notes: `Triggered by compliance breach: ${breach_type}`,
            });
            assignments.push(assignment);
          }
        }
      }
    }

    return Response.json({
      assignments_created: assignments.length,
      assignments: assignments,
      trigger_type,
    });
  } catch (error) {
    console.error('Auto-assign training error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});