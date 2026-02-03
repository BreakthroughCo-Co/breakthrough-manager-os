import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { practitioner_id } = await req.json();

    if (!practitioner_id) {
      return Response.json({ error: 'practitioner_id is required' }, { status: 400 });
    }

    // Fetch practitioner data
    const practitioners = await base44.asServiceRole.entities.Practitioner.filter({ id: practitioner_id });
    const practitioner = practitioners[0];

    if (!practitioner) {
      return Response.json({ error: 'Practitioner not found' }, { status: 404 });
    }

    // Fetch performance data
    const trainingAssignments = await base44.asServiceRole.entities.TrainingAssignment.filter({
      practitioner_id: practitioner_id
    });

    const trainingRatings = await base44.asServiceRole.entities.TrainingModuleRating.filter({
      practitioner_id: practitioner_id
    });

    const caseNotes = await base44.asServiceRole.entities.CaseNote.filter({
      practitioner_id: practitioner_id
    });

    const clientFeedback = await base44.asServiceRole.entities.ClientFeedback.list('-submitted_date', 100);
    const practitionerFeedback = clientFeedback.filter(f => 
      f.practitioner_id === practitioner_id || f.practitioner_name === practitioner.full_name
    );

    const incidents = await base44.asServiceRole.entities.Incident.list('-incident_date', 100);
    const practitionerIncidents = incidents.filter(i => 
      i.reported_by === practitioner.email
    );

    // Calculate metrics
    const completedTraining = trainingAssignments.filter(a => a.completion_status === 'completed');
    const completionRate = trainingAssignments.length > 0 
      ? (completedTraining.length / trainingAssignments.length * 100).toFixed(1)
      : 0;

    const avgTrainingRating = trainingRatings.length > 0
      ? (trainingRatings.reduce((sum, r) => sum + r.effectiveness_rating, 0) / trainingRatings.length).toFixed(1)
      : 0;

    const avgClientSatisfaction = practitionerFeedback.length > 0
      ? (practitionerFeedback.reduce((sum, f) => sum + (f.overall_satisfaction || 0), 0) / practitionerFeedback.length).toFixed(1)
      : 0;

    const completedNotes = caseNotes.filter(n => n.status === 'completed');
    const noteCompletionRate = caseNotes.length > 0
      ? (completedNotes.length / caseNotes.length * 100).toFixed(1)
      : 0;

    // Prepare performance analysis data
    const performanceData = {
      practitioner: {
        name: practitioner.full_name,
        role: practitioner.role,
        status: practitioner.status,
        caseload: practitioner.current_caseload,
        capacity: practitioner.caseload_capacity,
        billable_hours: {
          target: practitioner.billable_hours_target,
          actual: practitioner.billable_hours_actual
        }
      },
      training_metrics: {
        total_assignments: trainingAssignments.length,
        completed: completedTraining.length,
        completion_rate: completionRate,
        avg_rating: avgTrainingRating,
        recent_completions: completedTraining.slice(0, 5).map(a => ({
          module: a.module_name,
          date: a.completion_date,
          category: a.training_category
        }))
      },
      client_feedback_summary: {
        total_feedback: practitionerFeedback.length,
        avg_satisfaction: avgClientSatisfaction,
        recent_feedback: practitionerFeedback.slice(0, 5).map(f => ({
          date: f.submitted_date,
          satisfaction: f.overall_satisfaction,
          comments: f.comments?.substring(0, 150)
        }))
      },
      clinical_performance: {
        case_notes_count: caseNotes.length,
        completion_rate: noteCompletionRate,
        recent_progress_ratings: caseNotes
          .filter(n => n.progress_rating)
          .slice(0, 10)
          .map(n => n.progress_rating),
        incident_reports: practitionerIncidents.length,
        recent_incidents: practitionerIncidents.slice(0, 3).map(i => ({
          date: i.incident_date,
          category: i.category,
          severity: i.severity
        }))
      }
    };

    // AI-powered performance analysis
    const analysisPrompt = `As a clinical supervisor and practice manager, analyze this practitioner's comprehensive performance data and provide detailed insights:

${JSON.stringify(performanceData, null, 2)}

Provide a thorough performance analysis including:
1. Overall performance assessment with specific strengths
2. Areas requiring development or support
3. Personalized development plan with actionable steps
4. Coaching opportunities and supervision focus areas
5. Career progression recommendations
6. Risk factors or concerns (workload, burnout, skill gaps)

Return as JSON:
{
  "overall_assessment": {
    "performance_rating": "exceptional/strong/satisfactory/needs_improvement",
    "summary": "comprehensive overview",
    "key_strengths": ["strength1", "strength2"],
    "standout_achievements": ["achievement1", "achievement2"]
  },
  "development_areas": [
    {
      "area": "specific area",
      "current_status": "description",
      "impact": "high/medium/low",
      "priority": "urgent/high/medium/low",
      "development_actions": ["action1", "action2"]
    }
  ],
  "personalized_development_plan": {
    "immediate_actions": ["action1", "action2"],
    "three_month_goals": ["goal1", "goal2"],
    "six_month_goals": ["goal1", "goal2"],
    "required_training": ["training1", "training2"],
    "mentoring_needs": ["need1", "need2"]
  },
  "coaching_opportunities": [
    {
      "opportunity": "description",
      "approach": "how to coach",
      "expected_outcome": "what to achieve",
      "timeline": "when"
    }
  ],
  "supervision_priorities": ["priority1", "priority2"],
  "career_recommendations": {
    "next_steps": "description",
    "growth_path": "description",
    "skill_development": ["skill1", "skill2"]
  },
  "risk_factors": [
    {
      "risk": "description",
      "severity": "high/medium/low",
      "mitigation": "action to take"
    }
  ],
  "support_needs": ["need1", "need2"]
}`;

    const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          overall_assessment: { type: "object" },
          development_areas: { type: "array" },
          personalized_development_plan: { type: "object" },
          coaching_opportunities: { type: "array" },
          supervision_priorities: { type: "array" },
          career_recommendations: { type: "object" },
          risk_factors: { type: "array" },
          support_needs: { type: "array" }
        }
      }
    });

    return Response.json({
      analysis,
      performance_data: performanceData,
      generated_date: new Date().toISOString(),
      generated_for: practitioner.full_name
    });

  } catch (error) {
    console.error('Error analyzing staff performance:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});