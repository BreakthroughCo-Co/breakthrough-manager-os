import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { breach_id } = await req.json();

    // Get breach details
    const breaches = await base44.asServiceRole.entities.ComplianceBreach.filter({ id: breach_id });
    const breach = breaches[0];

    if (!breach) {
      return Response.json({ error: 'Breach not found' }, { status: 404 });
    }

    const workflows = {
      training_assigned: [],
      incidents_created: [],
      clients_flagged: [],
    };

    // 1. Assign relevant training to implicated staff
    const requiredActions = JSON.parse(breach.required_actions || '[]');
    const trainingKeywords = ['training', 'competency', 'education', 'skill'];
    const needsTraining = requiredActions.some(action => 
      trainingKeywords.some(keyword => action.toLowerCase().includes(keyword))
    );

    if (needsTraining) {
      const practitioners = await base44.asServiceRole.entities.Practitioner.list();
      const modules = await base44.asServiceRole.entities.TrainingModule.filter({ status: 'active' });
      
      // Find relevant training module based on breach type
      const breachTypeMap = {
        'unauthorized_restrictive_practice': 'Restrictive Practice',
        'documentation_gap': 'Documentation',
        'consent_violation': 'Consent & Authorization',
        'staff_competency': 'Professional Development',
        'unsafe_environment': 'Safety & Risk',
      };

      const relevantModules = modules.filter(m => 
        m.module_name.includes(breachTypeMap[breach.breach_type] || '') ||
        m.category === 'NDIS Compliance'
      );

      // Assign to all practitioners or specific ones mentioned in evidence
      const evidence = JSON.parse(breach.evidence || '[]');
      let targetPractitioners = practitioners;
      
      // If evidence mentions specific staff, target them
      const mentionedStaff = practitioners.filter(p => 
        evidence.some(e => e.includes(p.email) || e.includes(p.full_name))
      );
      if (mentionedStaff.length > 0) {
        targetPractitioners = mentionedStaff;
      }

      for (const module of relevantModules.slice(0, 1)) { // Assign top relevant module
        for (const practitioner of targetPractitioners) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 7);

          const assignment = await base44.asServiceRole.entities.TrainingAssignment.create({
            practitioner_id: practitioner.id,
            practitioner_name: practitioner.full_name,
            practitioner_email: practitioner.email,
            module_id: module.id,
            module_name: module.module_name,
            assignment_reason: 'compliance_gap',
            assigned_date: new Date().toISOString().split('T')[0],
            due_date: dueDate.toISOString().split('T')[0],
            assigned_by: 'compliance_auditor',
            notes: `Auto-assigned due to compliance breach: ${breach.breach_type}`,
          });
          workflows.training_assigned.push(assignment);
        }
      }
    }

    // 2. Create high-priority incident report linked to breach
    if (breach.severity === 'high' || breach.severity === 'critical') {
      const incident = await base44.asServiceRole.entities.Incident.create({
        client_id: breach.related_entity_id || 'system',
        client_name: breach.related_entity_type === 'Client' ? 'System-wide issue' : 'Compliance Issue',
        incident_date: new Date().toISOString(),
        category: 'policy_breach',
        severity: breach.severity,
        description: `COMPLIANCE BREACH DETECTED:\n\nType: ${breach.breach_type}\n\nDescription: ${breach.description}\n\nNDIS Clauses: ${breach.ndis_clauses}\n\nThis incident was automatically created by the Compliance Auditor agent.`,
        location: 'System',
        immediate_action_taken: 'Compliance breach flagged for review. Automated workflows initiated.',
        reported_by: 'compliance_auditor',
        status: 'reported',
        follow_up_required: true,
        compliance_flagged: true,
        ndis_reportable: breach.severity === 'critical',
      });
      workflows.incidents_created.push(incident);
    }

    // 3. Flag specific clients for targeted support/review based on repeated findings
    if (breach.related_entity_type === 'Client' && breach.related_entity_id) {
      // Check for repeat breaches for this client
      const clientBreaches = await base44.asServiceRole.entities.ComplianceBreach.filter({
        related_entity_id: breach.related_entity_id,
      });

      if (clientBreaches.length >= 2) { // Client has multiple breaches
        // Update client risk level
        const clients = await base44.asServiceRole.entities.Client.filter({ id: breach.related_entity_id });
        if (clients.length > 0) {
          const client = clients[0];
          await base44.asServiceRole.entities.Client.update(breach.related_entity_id, {
            risk_level: 'high',
            notes: `${client.notes || ''}\n\n[AUTO-FLAGGED ${new Date().toISOString()}] Multiple compliance breaches detected. Requires immediate management review and targeted support plan.`,
          });
          workflows.clients_flagged.push({
            client_id: breach.related_entity_id,
            client_name: client.full_name,
            breach_count: clientBreaches.length,
          });
        }

        // Create task for review
        await base44.asServiceRole.entities.Task.create({
          title: `URGENT: Review Client - Multiple Compliance Breaches`,
          description: `Client ${breach.related_entity_id} has ${clientBreaches.length} compliance breaches. Immediate review and targeted support plan required.`,
          category: 'Compliance',
          priority: 'urgent',
          status: 'pending',
          related_entity_type: 'Client',
          related_entity_id: breach.related_entity_id,
          assigned_to: user.email,
          due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days
        });
      }
    }

    // Update breach to mark workflows triggered
    await base44.asServiceRole.entities.ComplianceBreach.update(breach_id, {
      training_triggered: true,
    });

    return Response.json({
      breach_id,
      workflows_executed: {
        training_assignments: workflows.training_assigned.length,
        incidents_created: workflows.incidents_created.length,
        clients_flagged: workflows.clients_flagged.length,
      },
      details: workflows,
    });
  } catch (error) {
    console.error('Workflow processing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});