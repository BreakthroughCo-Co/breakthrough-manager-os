import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { transition_id, new_practitioner_id } = body;

    if (!transition_id || !new_practitioner_id) {
      return Response.json({ error: 'transition_id and new_practitioner_id required' }, { status: 400 });
    }

    // Fetch transition and practitioner data
    const transitions = await base44.entities.ClientTransition.filter({ id: transition_id });
    const transition = transitions?.[0];

    if (!transition) {
      return Response.json({ error: 'Transition not found' }, { status: 404 });
    }

    const practitioners = await base44.entities.Practitioner.list();
    const newPractitioner = practitioners.find(p => p.id === new_practitioner_id);
    const client = await base44.entities.Client.filter({ id: transition.client_id });

    if (!newPractitioner || !client || client.length === 0) {
      return Response.json({ error: 'Practitioner or client not found' }, { status: 404 });
    }

    // Use LLM to generate contextualized task list
    const prompt = `
    Generate a comprehensive task checklist for a new practitioner taking over client care:
    
    Client: ${client[0].full_name}
    Service Type: ${client[0].service_type}
    Current Caseload: ${newPractitioner.current_caseload}
    New Practitioner: ${newPractitioner.full_name} (${newPractitioner.role})
    
    Create actionable tasks organized by urgency and domain:
    {
      immediate_tasks: [
        { task, priority: "urgent|high|medium", estimated_hours, due_days }
      ],
      week_1_tasks: [
        { task, priority, estimated_hours }
      ],
      week_2_4_tasks: [
        { task, priority, estimated_hours }
      ],
      documentation_review_checklist: ["..."],
      stakeholder_communication_tasks: ["..."],
      risk_monitoring_setup_tasks: ["..."]
    }
    `;

    const taskPlan = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          immediate_tasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                task: { type: 'string' },
                priority: { type: 'string' },
                estimated_hours: { type: 'number' },
                due_days: { type: 'number' }
              }
            }
          },
          week_1_tasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                task: { type: 'string' },
                priority: { type: 'string' },
                estimated_hours: { type: 'number' }
              }
            }
          },
          week_2_4_tasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                task: { type: 'string' },
                priority: { type: 'string' },
                estimated_hours: { type: 'number' }
              }
            }
          },
          documentation_review_checklist: { type: 'array', items: { type: 'string' } },
          stakeholder_communication_tasks: { type: 'array', items: { type: 'string' } },
          risk_monitoring_setup_tasks: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    // Create Task entities from generated plan
    const allTasks = [
      ...taskPlan.immediate_tasks.map(t => ({ ...t, category: 'immediate' })),
      ...taskPlan.week_1_tasks.map(t => ({ ...t, category: 'week_1' })),
      ...taskPlan.week_2_4_tasks.map(t => ({ ...t, category: 'week_2_4' }))
    ];

    const createdTasks = await Promise.all(
      allTasks.map(t => {
        const dueDate = new Date();
        if (t.category === 'immediate') dueDate.setDate(dueDate.getDate() + (t.due_days || 1));
        else if (t.category === 'week_1') dueDate.setDate(dueDate.getDate() + 7);
        else dueDate.setDate(dueDate.getDate() + 21);

        return base44.entities.Task.create({
          title: t.task,
          description: `Transition task for ${client[0].full_name}. Assigned to ${newPractitioner.full_name}`,
          status: 'pending',
          priority: t.priority,
          assigned_to: newPractitioner.email,
          due_date: dueDate.toISOString().split('T')[0],
          category: t.category,
          estimated_hours: t.estimated_hours,
          related_entity: 'ClientTransition',
          related_entity_id: transition_id
        });
      })
    );

    // Create audit log
    await base44.entities.AuditLog.create({
      event_type: 'transition_tasks_generated',
      entity_type: 'ClientTransition',
      entity_id: transition_id,
      document_name: `Transition Tasks: ${client[0].full_name}`,
      extracted_data: JSON.stringify(taskPlan),
      validated_by: user.email,
      validation_status: 'approved',
      notes: `Generated ${createdTasks.length} transition tasks for new practitioner ${newPractitioner.full_name}`
    });

    return Response.json({
      success: true,
      transition_id,
      new_practitioner: newPractitioner.full_name,
      client: client[0].full_name,
      tasks_created: createdTasks.length,
      task_summary: {
        immediate: taskPlan.immediate_tasks.length,
        week_1: taskPlan.week_1_tasks.length,
        week_2_4: taskPlan.week_2_4_tasks.length
      },
      total_estimated_hours: allTasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});