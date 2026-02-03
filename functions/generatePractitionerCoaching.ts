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

    // Fetch training data
    const assignments = await base44.asServiceRole.entities.TrainingAssignment.filter({
      practitioner_id: practitioner_id
    });

    const ratings = await base44.asServiceRole.entities.TrainingModuleRating.filter({
      practitioner_id: practitioner_id
    });

    // Fetch case notes for quality analysis
    const caseNotes = await base44.asServiceRole.entities.CaseNote.filter({
      practitioner_id: practitioner_id
    });

    // Fetch incidents where practitioner was involved
    const incidents = await base44.asServiceRole.entities.Incident.list('-incident_date', 100);
    const practitionerIncidents = incidents.filter(i => 
      i.reported_by === practitioner.email || 
      i.practitioner_involved === practitioner_id
    );

    // Calculate training metrics
    const completedAssignments = assignments.filter(a => a.completion_status === 'completed');
    const completionRate = assignments.length > 0 
      ? (completedAssignments.length / assignments.length * 100).toFixed(1)
      : 0;

    const avgRating = ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + r.effectiveness_rating, 0) / ratings.length).toFixed(1)
      : 0;

    // Prepare coaching analysis data
    const coachingData = {
      practitioner_info: {
        name: practitioner.full_name,
        role: practitioner.role,
        experience_months: practitioner.start_date 
          ? Math.floor((new Date() - new Date(practitioner.start_date)) / (1000 * 60 * 60 * 24 * 30))
          : 'Unknown'
      },
      training_profile: {
        total_assignments: assignments.length,
        completed: completedAssignments.length,
        completion_rate: completionRate,
        average_effectiveness_rating: avgRating,
        training_categories: [...new Set(assignments.map(a => a.training_category))],
        recent_completions: completedAssignments
          .sort((a, b) => new Date(b.completion_date) - new Date(a.completion_date))
          .slice(0, 5)
          .map(a => ({
            module: a.module_name,
            category: a.training_category,
            completion_date: a.completion_date
          }))
      },
      feedback_summary: {
        ratings_provided: ratings.length,
        avg_content_quality: ratings.length > 0 
          ? (ratings.reduce((sum, r) => sum + r.content_quality, 0) / ratings.length).toFixed(1)
          : 0,
        avg_practical_application: ratings.length > 0
          ? (ratings.reduce((sum, r) => sum + r.practical_application, 0) / ratings.length).toFixed(1)
          : 0,
        common_feedback_themes: ratings
          .map(r => r.feedback_text)
          .filter(f => f && f.length > 10)
          .slice(0, 10)
      },
      performance_indicators: {
        case_notes_count: caseNotes.length,
        recent_case_notes_quality: caseNotes
          .filter(cn => cn.status === 'completed')
          .slice(0, 5)
          .map(cn => ({
            date: cn.session_date,
            progress_rating: cn.progress_rating,
            has_ai_refinement: !!cn.refined_note
          })),
        incidents_reported: practitionerIncidents.length,
        incident_handling_quality: practitionerIncidents.slice(0, 5).map(i => ({
          category: i.category,
          severity: i.severity,
          actions_taken: i.immediate_actions?.substring(0, 100)
        }))
      }
    };

    // Generate AI coaching insights
    const coachingPrompt = `You are an expert NDIS practice manager and clinical supervisor providing personalized coaching for a behaviour support practitioner. Analyze the following data and provide targeted coaching recommendations:

${JSON.stringify(coachingData, null, 2)}

Based on this data, provide comprehensive coaching insights including:
1. Strengths and areas of excellence
2. Specific skills that need development
3. Training effectiveness assessment
4. Personalized learning pathway recommendations
5. Practical application suggestions
6. Performance improvement strategies

Return your coaching plan as JSON with this structure:
{
  "overall_assessment": {
    "strengths": ["strength1", "strength2"],
    "development_areas": ["area1", "area2"],
    "overall_rating": "excellent/good/developing/needs_support",
    "summary": "brief overview"
  },
  "training_effectiveness": {
    "what_working_well": "analysis",
    "gaps_identified": ["gap1", "gap2"],
    "application_score": "high/medium/low",
    "recommendations": ["rec1", "rec2"]
  },
  "personalized_coaching_tips": [
    {
      "area": "specific area",
      "current_level": "description",
      "target_level": "description",
      "coaching_actions": ["action1", "action2"],
      "resources": ["resource1", "resource2"],
      "success_indicators": ["indicator1", "indicator2"],
      "timeline": "suggested timeframe"
    }
  ],
  "recommended_training_modules": [
    {
      "module_type": "type",
      "priority": "high/medium/low",
      "rationale": "why this training",
      "expected_outcome": "what they'll gain"
    }
  ],
  "practical_development_activities": [
    {
      "activity": "description",
      "focus_area": "area",
      "frequency": "how often",
      "success_criteria": "how to measure"
    }
  ],
  "supervision_focus_areas": ["area1", "area2"],
  "short_term_goals": ["goal1", "goal2"],
  "long_term_development_path": "description"
}`;

    const coaching = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: coachingPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          overall_assessment: { type: "object" },
          training_effectiveness: { type: "object" },
          personalized_coaching_tips: { type: "array" },
          recommended_training_modules: { type: "array" },
          practical_development_activities: { type: "array" },
          supervision_focus_areas: { type: "array" },
          short_term_goals: { type: "array" },
          long_term_development_path: { type: "string" }
        }
      }
    });

    return Response.json({
      coaching,
      data_summary: coachingData,
      generated_date: new Date().toISOString(),
      generated_for: practitioner.full_name
    });

  } catch (error) {
    console.error('Error generating practitioner coaching:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});