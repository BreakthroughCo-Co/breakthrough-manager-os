import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { practitioner_id, role, start_date } = await req.json();

    if (!practitioner_id || !role || !start_date) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const practitioner = await base44.entities.Practitioner.filter({ id: practitioner_id });
    if (!practitioner?.[0]) {
      return Response.json({ error: 'Practitioner not found' }, { status: 404 });
    }

    const prompt = `
Generate a comprehensive onboarding plan for a new NDIS practitioner. This is for the first weeks and months of employment.

PRACTITIONER INFO:
- Name: ${practitioner[0].full_name}
- Role: ${role}
- Start Date: ${start_date}

ROLE REQUIREMENTS:
Role-specific critical competencies and compliance requirements for ${role} in NDIS Behaviour Support.

Generate onboarding plan in JSON format:
{
  "initial_assessment": "Assessment of where they are starting from",
  "identified_skill_gaps": ["gap1 - for this role", "gap2"],
  "critical_training_modules": ["NDIS Compliance 101", "Behaviour Support Fundamentals", "Client Privacy & Records"],
  "onboarding_phases": {
    "induction": "Week 1 - company orientation, systems access, policy review",
    "shadowing": "Weeks 2-3 - observe experienced practitioners",
    "supervised": "Weeks 4-8 - deliver services under supervision, increasing independence",
    "independent": "Week 9+ - independent practice with periodic review"
  },
  "week_1_objectives": [
    "Complete IT onboarding and system access",
    "Review NDIS Legislation & Safeguarding policy",
    "Meet team members and understand organizational structure",
    "Shadow experienced practitioner in 2-3 sessions"
  ],
  "month_1_objectives": [
    "Complete mandatory compliance training",
    "Understand current client portfolio and support plans",
    "Deliver first supported session under supervision",
    "Review confidentiality, privacy and record-keeping procedures"
  ],
  "month_3_objectives": [
    "Independently deliver behaviour support sessions",
    "Demonstrate competency in session note documentation",
    "Show understanding of client risk assessment",
    "Complete first professional development review"
  ],
  "mentorship_focus_areas": [
    "Behaviour de-escalation techniques",
    "Functional Behaviour Assessment interpretation",
    "Compliance documentation",
    "Client engagement and communication"
  ],
  "initial_career_pathway": "Progression pathway from current role towards next level (e.g., towards Senior Practitioner)",
  "compliance_checklist": [
    "Working With Children check",
    "NDIS Code of Conduct acknowledgement",
    "Confidentiality agreement signed",
    "Induction checklist completed",
    "Mandatory reporting training"
  ],
  "knowledge_assessments": [
    "NDIS legislation quiz (week 2)",
    "Behaviour Support principles assessment (week 4)",
    "Plan interpretation assessment (week 6)",
    "Documentation quality review (week 8)"
  ]
}

Focus on:
- Realistic timelines for competency development
- Clear compliance milestones
- Structured progression from observation to independence
- Role-specific critical skills`;

    const onboardingPlan = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          initial_assessment: { type: 'string' },
          identified_skill_gaps: { type: 'array', items: { type: 'string' } },
          critical_training_modules: { type: 'array', items: { type: 'string' } },
          onboarding_phases: {
            type: 'object',
            properties: {
              induction: { type: 'string' },
              shadowing: { type: 'string' },
              supervised: { type: 'string' },
              independent: { type: 'string' }
            }
          },
          week_1_objectives: { type: 'array', items: { type: 'string' } },
          month_1_objectives: { type: 'array', items: { type: 'string' } },
          month_3_objectives: { type: 'array', items: { type: 'string' } },
          mentorship_focus_areas: { type: 'array', items: { type: 'string' } },
          initial_career_pathway: { type: 'string' },
          compliance_checklist: { type: 'array', items: { type: 'string' } },
          knowledge_assessments: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    // Create onboarding plan
    const completionDate = new Date(start_date);
    completionDate.setDate(completionDate.getDate() + 90); // 90-day onboarding period

    const plan = await base44.entities.PractitionerOnboardingPlan.create({
      practitioner_id,
      practitioner_name: practitioner[0].full_name,
      role,
      start_date,
      plan_created_date: new Date().toISOString(),
      status: 'active',
      ...onboardingPlan,
      onboarding_phases: JSON.stringify(onboardingPlan.onboarding_phases),
      completion_target_date: completionDate.toISOString().split('T')[0]
    });

    // Create initial tasks for week 1
    const tasks = [];
    for (const objective of onboardingPlan.week_1_objectives) {
      const task = await base44.entities.Task.create({
        title: objective,
        category: 'Professional Development',
        priority: 'high',
        status: 'pending',
        assigned_to: practitioner[0].full_name,
        related_entity_type: 'PractitionerOnboardingPlan',
        related_entity_id: plan.id,
        due_date: new Date(new Date(start_date).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
      tasks.push(task);
    }

    // Create initial career pathway
    const pathway = await base44.entities.CareerPathway.create({
      practitioner_id,
      practitioner_name: practitioner[0].full_name,
      current_role: role,
      recommended_next_role: extractNextRole(role),
      progression_readiness: 0,
      strengths: ['New hire - incoming energy'],
      development_needs: onboardingPlan.identified_skill_gaps,
      recommended_training_path: onboardingPlan.critical_training_modules,
      estimated_timeline_months: 12,
      notes: 'Initial pathway created during onboarding'
    });

    return Response.json({
      success: true,
      practitioner_id,
      onboarding_plan: plan,
      initial_tasks: tasks.length,
      career_pathway_id: pathway.id
    });
  } catch (error) {
    console.error('Onboarding plan error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function extractNextRole(currentRole) {
  const progressions = {
    'Allied Health Assistant': 'Behaviour Support Practitioner',
    'Behaviour Support Practitioner': 'Senior Practitioner',
    'Senior Practitioner': 'Practice Lead',
    'Practice Lead': 'Practice Lead'
  };
  return progressions[currentRole] || 'Senior Practitioner';
}