import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Practitioner Professional Development Analysis & CPD Tracking
 * Analyzes performance, identifies skill gaps, recommends training, tracks CPD hours
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch practitioner data
    const [practitioners, caseNotes, trainingAssignments, clientFeedback, skills, billingRecords] = await Promise.all([
      base44.asServiceRole.entities.Practitioner.list(),
      base44.asServiceRole.entities.CaseNote.list('-session_date', 500),
      base44.asServiceRole.entities.TrainingAssignment.list(),
      base44.asServiceRole.entities.ClientFeedback.list(),
      base44.asServiceRole.entities.PractitionerSkill.list(),
      base44.asServiceRole.entities.BillingRecord.list('-service_date', 300)
    ]);

    // Analyze each practitioner
    const practitionerAnalyses = practitioners.map(prac => {
      const pracNotes = caseNotes.filter(cn => cn.practitioner_id === prac.id);
      const pracTraining = trainingAssignments.filter(ta => ta.practitioner_id === prac.id);
      const pracFeedback = clientFeedback.filter(cf => cf.practitioner_id === prac.id);
      const pracSkills = skills.filter(s => s.practitioner_id === prac.id);
      const pracBilling = billingRecords.filter(b => b.practitioner_id === prac.id);

      // Calculate performance metrics
      const progressRatings = { 'regression': 1, 'no_change': 2, 'emerging': 3, 'progressing': 4, 'achieved': 5 };
      const avgProgress = pracNotes.length > 0 
        ? pracNotes.reduce((sum, n) => sum + (progressRatings[n.progress_rating] || 0), 0) / pracNotes.length
        : 0;

      // CPD tracking
      const completedTraining = pracTraining.filter(t => t.status === 'completed');
      const cpdHours = completedTraining.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);

      // Client feedback
      const avgRating = pracFeedback.length > 0
        ? pracFeedback.reduce((sum, f) => sum + (f.rating || 0), 0) / pracFeedback.length
        : null;

      // Skill assessment
      const proficientSkills = pracSkills.filter(s => s.proficiency_level === 'proficient' || s.proficiency_level === 'advanced').length;
      const developingSkills = pracSkills.filter(s => s.proficiency_level === 'developing' || s.proficiency_level === 'beginner').length;

      // Productivity
      const totalBilledHours = pracBilling.reduce((sum, b) => sum + (b.duration_hours || 0), 0);

      return {
        practitioner_id: prac.id,
        practitioner_name: prac.full_name,
        role: prac.role,
        current_caseload: prac.current_caseload,
        months_employed: Math.ceil(pracBilling.length / 4) || 0,
        sessions_delivered: pracNotes.length,
        avg_client_progress: avgProgress.toFixed(2),
        client_feedback_rating: avgRating ? avgRating.toFixed(1) : null,
        cpdHours: cpdHours,
        training_completed: completedTraining.length,
        training_in_progress: pracTraining.filter(t => t.status === 'in_progress').length,
        proficient_skills: proficientSkills,
        developing_skills: developingSkills,
        total_billable_hours: totalBilledHours.toFixed(1),
        utilization_rate: prac.caseload_capacity > 0 ? ((prac.current_caseload / prac.caseload_capacity) * 100).toFixed(1) : 0
      };
    });

    // Build development context
    const developmentContext = `
PRACTITIONER DEVELOPMENT ANALYSIS:

TOP PERFORMERS (by client progress):
${practitionerAnalyses.sort((a, b) => parseFloat(b.avg_client_progress) - parseFloat(a.avg_client_progress)).slice(0, 5).map(p =>
  `- ${p.practitioner_name} (${p.role}): Avg client progress ${p.avg_client_progress}/5, ${p.sessions_delivered} sessions, Rating: ${p.client_feedback_rating || 'N/A'}`
).join('\n')}

CPD TRACKING:
${practitionerAnalyses.sort((a, b) => b.cpdHours - a.cpdHours).slice(0, 5).map(p =>
  `- ${p.practitioner_name}: ${p.cpdHours} CPD hours, ${p.training_completed} trainings completed`
).join('\n')}

SKILL DEVELOPMENT GAPS:
${practitionerAnalyses.filter(p => p.developing_skills > 0).slice(0, 5).map(p =>
  `- ${p.practitioner_name}: ${p.developing_skills} developing skills, ${p.proficient_skills} proficient`
).join('\n')}

NEWER PRACTITIONERS (< 12 months):
${practitionerAnalyses.filter(p => p.months_employed < 12).slice(0, 5).map(p =>
  `- ${p.practitioner_name}: ${p.months_employed} months, ${p.sessions_delivered} sessions, ${p.cpdHours} CPD hours`
).join('\n')}`;

    const development = await base44.integrations.Core.InvokeLLM({
      prompt: `${developmentContext}

Analyze practitioner performance and provide:

1. **Individual Development Plans** (For each practitioner)
   - Current capability assessment
   - Identified skill gaps
   - Recommended training modules/workshops
   - Mentoring opportunities
   - 6-month development goals

2. **Skill Gap Analysis**
   - Most critical gaps across team
   - Gaps by role/seniority
   - Impact on client outcomes
   - Priority training needs

3. **CPD & Training Recommendations**
   - Mandatory compliance training due/overdue
   - Elective professional development
   - Specialization paths (e.g., LEGO Therapy specialist)
   - Conference/workshop recommendations

4. **Performance Insights**
   - Top performers (replicate their practices)
   - Practitioners requiring support
   - Client feedback patterns
   - Coaching/mentoring recommendations

5. **Career Development Pathways**
   - Progression opportunities
   - Role-based expectations
   - Leadership pipeline identification
   - Retention strategies

6. **CPD Compliance Status**
   - Hours completed vs. targets
   - Upcoming renewal dates
   - Areas with insufficient training
   - Documentation requirements

7. **Team Development Strategy**
   - Overall team capability gaps
   - Recruitment vs. upskilling needs
   - Mentoring/buddy system recommendations
   - Knowledge sharing opportunities

Be specific with practitioner names and provide actionable development plans.`,
      response_json_schema: {
        type: "object",
        properties: {
          development_plans: {
            type: "array",
            items: {
              type: "object",
              properties: {
                practitioner_name: { type: "string" },
                current_capability: { type: "string" },
                skill_gaps: { type: "array", items: { type: "string" } },
                recommended_training: { type: "array", items: { type: "string" } },
                mentoring_recommendation: { type: "string" },
                six_month_goals: { type: "array", items: { type: "string" } }
              }
            }
          },
          skill_gap_summary: {
            type: "array",
            items: {
              type: "object",
              properties: {
                skill_area: { type: "string" },
                affected_practitioners: { type: "number" },
                priority: { type: "string" },
                impact_on_clients: { type: "string" }
              }
            }
          },
          cpd_recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                practitioner_name: { type: "string" },
                mandatory_training: { type: "array", items: { type: "string" } },
                elective_training: { type: "array", items: { type: "string" } },
                specialization_path: { type: "string" }
              }
            }
          },
          performance_insights: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                findings: { type: "array", items: { type: "string" } }
              }
            }
          },
          team_strategy: {
            type: "object",
            properties: {
              overall_capability: { type: "string" },
              critical_gaps: { type: "array", items: { type: "string" } },
              mentoring_opportunities: { type: "array", items: { type: "string" } },
              knowledge_sharing_ideas: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    });

    return Response.json({
      analysis_date: new Date().toISOString(),
      total_practitioners: practitioners.length,
      practitioner_summaries: practitionerAnalyses,
      development_analysis: development
    });

  } catch (error) {
    console.error('Practitioner development analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});