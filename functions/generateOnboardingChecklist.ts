import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * AI-Driven Practitioner Onboarding Checklist Generation
 * Generates personalized onboarding checklists based on role and compliance requirements
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { practitioner_id, role, service_types } = await req.json();

    if (!practitioner_id || !role) {
      return Response.json({ error: 'practitioner_id and role required' }, { status: 400 });
    }

    // Fetch practitioner details
    const practitioners = await base44.asServiceRole.entities.Practitioner.filter({ id: practitioner_id });
    if (practitioners.length === 0) {
      return Response.json({ error: 'Practitioner not found' }, { status: 404 });
    }
    const practitioner = practitioners[0];

    // Fetch existing onboarding record or create new one
    const existingOnboarding = await base44.asServiceRole.entities.PractitionerOnboarding.filter({ 
      practitioner_id 
    });
    
    let onboarding = existingOnboarding[0];
    if (!onboarding) {
      onboarding = await base44.asServiceRole.entities.PractitionerOnboarding.create({
        practitioner_id,
        practitioner_name: practitioner.full_name,
        role,
        status: 'pending',
        start_date: new Date().toISOString().split('T')[0]
      });
    }

    // Build context for AI
    const serviceTypeContext = service_types ? service_types.join(', ') : 'Behaviour Support';
    const roleContext = `
PRACTITIONER ONBOARDING CONTEXT:
Name: ${practitioner.full_name}
Email: ${practitioner.email}
Role: ${role}
Service Types: ${serviceTypeContext}
Status: New Hire

NDIS Compliance Requirements:
- Worker Screening Check (mandatory)
- NDIS Code of Conduct agreement
- Privacy & Confidentiality training
- Safeguarding & Duty of Care orientation
- Quality & Safeguarding Standards training
- Behavior Support specific requirements (if applicable)
- Documentation & Record-keeping standards
- Client communication protocols`;

    // Generate personalized checklist using AI
    const checklist = await base44.integrations.Core.InvokeLLM({
      prompt: `${roleContext}

Generate a comprehensive, role-specific onboarding checklist for this new ${role}. The checklist should include:

1. **Pre-Engagement Requirements** (before start date)
   - Mandatory compliance items
   - Documentation requirements
   - Background checks/screening

2. **Week 1 Onboarding Tasks**
   - Organizational orientation
   - System access setup
   - Team introductions
   - Policy/procedure familiarization

3. **Clinical/Role-Specific Training** (first 30 days)
   - NDIS-specific modules
   - Behavior support training (if applicable)
   - Assessment tools training
   - Documentation systems training

4. **Compliance Training & Certifications**
   - Required certifications by role
   - Mandatory refresh training timeline
   - Competency assessments

5. **Ongoing Support & Development** (90 days)
   - Mentoring/supervision arrangements
   - Performance review schedule
   - Development opportunities
   - Team integration milestones

For each item, specify:
- Task/requirement name
- Priority level (critical, high, medium, low)
- Estimated completion time
- Responsible party (HR, Manager, trainer, self)
- Success criteria/completion evidence

Tailor recommendations specifically to a ${role} working with ${serviceTypeContext} services.`,
      response_json_schema: {
        type: "object",
        properties: {
          checklist_sections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                section: { type: "string" },
                description: { type: "string" },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      task_name: { type: "string" },
                      priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
                      estimated_days: { type: "number" },
                      responsible_party: { type: "string" },
                      success_criteria: { type: "string" },
                      category: { type: "string" }
                    }
                  }
                }
              }
            }
          },
          training_modules_recommended: {
            type: "array",
            items: {
              type: "object",
              properties: {
                module_name: { type: "string" },
                competency_area: { type: "string" },
                priority: { type: "string" },
                estimated_hours: { type: "number" },
                schedule_week: { type: "number" }
              }
            }
          },
          first_day_priorities: { type: "array", items: { type: "string" } },
          first_week_goals: { type: "array", items: { type: "string" } },
          first_month_milestones: { type: "array", items: { type: "string" } },
          supervision_recommendations: {
            type: "object",
            properties: {
              frequency: { type: "string" },
              duration: { type: "string" },
              focus_areas: { type: "array", items: { type: "string" } }
            }
          },
          mentoring_structure: {
            type: "object",
            properties: {
              mentor_profile: { type: "string" },
              expected_mentoring_hours: { type: "number" },
              key_responsibilities: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    });

    // Store checklist data in onboarding record
    const checklistItems = [];
    let itemCount = 0;

    for (const section of checklist.checklist_sections) {
      for (const item of section.items) {
        checklistItems.push({
          section: section.section,
          task_name: item.task_name,
          priority: item.priority,
          estimated_days: item.estimated_days,
          responsible_party: item.responsible_party,
          success_criteria: item.success_criteria,
          category: item.category,
          status: 'pending',
          sequence: ++itemCount
        });
      }
    }

    // Update onboarding record with checklist
    await base44.asServiceRole.entities.PractitionerOnboarding.update(onboarding.id, {
      checklist_items: JSON.stringify(checklistItems),
      training_modules: JSON.stringify(checklist.training_modules_recommended),
      supervision_plan: JSON.stringify(checklist.supervision_recommendations),
      mentoring_plan: JSON.stringify(checklist.mentoring_structure),
      status: 'checklist_created'
    });

    // Create Task entities for critical and high priority items (first 2 weeks)
    const criticalItems = checklistItems.filter(item => 
      (item.priority === 'critical' || item.priority === 'high') && 
      item.estimated_days <= 14
    );

    for (const item of criticalItems.slice(0, 10)) {
      const taskDueDate = new Date();
      taskDueDate.setDate(taskDueDate.getDate() + item.estimated_days);

      await base44.asServiceRole.entities.Task.create({
        title: `[ONBOARDING] ${item.task_name}`,
        description: `${item.success_criteria}. Responsible: ${item.responsible_party}`,
        category: 'HR',
        priority: item.priority === 'critical' ? 'urgent' : 'high',
        status: 'pending',
        due_date: taskDueDate.toISOString().split('T')[0],
        assigned_to: practitioner.email,
        related_entity_type: 'PractitionerOnboarding',
        related_entity_id: onboarding.id
      });
    }

    return Response.json({
      onboarding_id: onboarding.id,
      practitioner_name: practitioner.full_name,
      role,
      checklist_generated: true,
      total_items: checklistItems.length,
      critical_items: checklistItems.filter(i => i.priority === 'critical').length,
      high_priority_items: checklistItems.filter(i => i.priority === 'high').length,
      estimated_completion_days: Math.max(...checklistItems.map(i => i.estimated_days)),
      checklist_sections: checklist.checklist_sections,
      training_modules_recommended: checklist.training_modules_recommended,
      first_day_priorities: checklist.first_day_priorities,
      first_week_goals: checklist.first_week_goals,
      first_month_milestones: checklist.first_month_milestones,
      supervision_recommendations: checklist.supervision_recommendations,
      mentoring_structure: checklist.mentoring_structure
    });

  } catch (error) {
    console.error('Onboarding checklist generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});