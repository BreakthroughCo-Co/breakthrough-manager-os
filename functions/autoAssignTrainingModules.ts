import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const practitioners = await base44.entities.Practitioner.filter({ status: 'active' });
    const trainingRecords = await base44.entities.TrainingRecord.list();
    const credentials = await base44.entities.PractitionerCredential.list();

    // Define mandatory training by role
    const trainingRequirements = {
      'Behaviour Support Practitioner': [
        { module_name: 'NDIS Code of Conduct', module_category: 'NDIS_code_of_conduct', renewal_years: 3 },
        { module_name: 'Mandatory Reporting', module_category: 'mandatory_reporting', renewal_years: 2 },
        { module_name: 'Privacy & Confidentiality', module_category: 'privacy_and_confidentiality', renewal_years: 2 },
        { module_name: 'Positive Behaviour Support', module_category: 'positive_behaviour_support', renewal_years: 3 },
        { module_name: 'Restrictive Practices', module_category: 'restrictive_practices', renewal_years: 2 }
      ],
      'Senior Practitioner': [
        { module_name: 'NDIS Code of Conduct', module_category: 'NDIS_code_of_conduct', renewal_years: 3 },
        { module_name: 'Clinical Governance', module_category: 'clinical_governance', renewal_years: 2 },
        { module_name: 'Restrictive Practices', module_category: 'restrictive_practices', renewal_years: 2 },
        { module_name: 'Worker Screening', module_category: 'worker_screening', renewal_years: 3 }
      ],
      'Practice Lead': [
        { module_name: 'NDIS Code of Conduct', module_category: 'NDIS_code_of_conduct', renewal_years: 3 },
        { module_name: 'Clinical Governance', module_category: 'clinical_governance', renewal_years: 2 }
      ],
      'Allied Health Assistant': [
        { module_name: 'NDIS Code of Conduct', module_category: 'NDIS_code_of_conduct', renewal_years: 3 },
        { module_name: 'Manual Handling', module_category: 'manual_handling', renewal_years: 2 },
        { module_name: 'First Aid & CPR', module_category: 'first_aid', renewal_years: 3 }
      ]
    };

    let assigned = 0;
    const assignmentResults = [];

    for (const practitioner of practitioners) {
      const requiredModules = trainingRequirements[practitioner.role] || [];

      for (const module of requiredModules) {
        // Check if practitioner already has this module completed
        const existingTraining = trainingRecords.find(tr =>
          tr.practitioner_id === practitioner.id &&
          tr.module_category === module.module_category
        );

        if (existingTraining) {
          // Check if renewal is due
          const expiryDate = new Date(existingTraining.expiry_date);
          const renewalDue = expiryDate < new Date();

          if (renewalDue) {
            // Create renewal assignment
            const newRecord = await base44.asServiceRole.entities.TrainingRecord.create({
              practitioner_id: practitioner.id,
              practitioner_name: practitioner.full_name,
              module_name: module.module_name,
              module_category: module.module_category,
              status: 'not_completed',
              is_mandatory: true,
              completion_date: null,
              expiry_date: new Date(Date.now() + module.renewal_years * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              notes: `Renewal assignment (previous expired ${existingTraining.expiry_date})`
            });
            assigned++;
            assignmentResults.push({
              practitioner_id: practitioner.id,
              practitioner_name: practitioner.full_name,
              module: module.module_name,
              action: 'renewal_assigned',
              training_id: newRecord.id
            });
          }
        } else {
          // No existing training; assign initial module
          const newRecord = await base44.asServiceRole.entities.TrainingRecord.create({
            practitioner_id: practitioner.id,
            practitioner_name: practitioner.full_name,
            module_name: module.module_name,
            module_category: module.module_category,
            status: 'not_completed',
            is_mandatory: true,
            completion_date: null,
            expiry_date: new Date(Date.now() + module.renewal_years * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          });
          assigned++;
          assignmentResults.push({
            practitioner_id: practitioner.id,
            practitioner_name: practitioner.full_name,
            module: module.module_name,
            action: 'initial_assigned',
            training_id: newRecord.id
          });

          // Create notification task
          await base44.asServiceRole.entities.Task.create({
            title: `Mandatory Training Assignment: ${module.module_name}`,
            description: `You have been assigned mandatory training module: ${module.module_name}. Completion required by ${new Date(Date.now() + module.renewal_years * 365 * 24 * 60 * 60 * 1000).toLocaleDateString()}.`,
            category: 'Compliance',
            priority: 'high',
            status: 'pending',
            assigned_to: practitioner.full_name,
            related_entity_type: 'TrainingRecord',
            related_entity_id: newRecord.id
          });
        }
      }
    }

    return Response.json({
      assignment_timestamp: new Date().toISOString(),
      total_practitioners_reviewed: practitioners.length,
      training_modules_assigned: assigned,
      assignments: assignmentResults,
      summary: `Processed ${practitioners.length} practitioners. Assigned or renewed ${assigned} training modules.`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});