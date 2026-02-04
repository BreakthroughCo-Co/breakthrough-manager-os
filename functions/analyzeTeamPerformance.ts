import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { team_filter = 'all', analysis_depth = 'comprehensive' } = await req.json();

    const [practitioners, feedback, trainingProgress, skills, incidents, caseNotes] = await Promise.all([
      base44.asServiceRole.entities.Practitioner.list(),
      base44.asServiceRole.entities.ClientFeedback.list('-feedback_date', 500),
      base44.asServiceRole.entities.TrainingProgress.list(),
      base44.asServiceRole.entities.PractitionerSkill.list(),
      base44.asServiceRole.entities.Incident.list('-incident_date', 200),
      base44.asServiceRole.entities.CaseNote.list('-session_date', 500)
    ]);

    const activePractitioners = practitioners.filter(p => p.employment_status === 'active');

    const teamMetrics = activePractitioners.map(p => {
      const pFeedback = feedback.filter(f => f.practitioner_id === p.id);
      const pTraining = trainingProgress.filter(t => t.practitioner_id === p.id);
      const pSkills = skills.filter(s => s.practitioner_id === p.id);
      const pIncidents = incidents.filter(i => i.practitioner_id === p.id);
      const pNotes = caseNotes.filter(n => n.practitioner_id === p.id);

      const avgSatisfaction = pFeedback.length > 0
        ? pFeedback.reduce((sum, f) => sum + (f.overall_satisfaction || 0), 0) / pFeedback.length
        : 0;

      const completedTraining = pTraining.filter(t => t.status === 'completed');
      const avgTrainingScore = completedTraining.length > 0
        ? completedTraining.reduce((sum, t) => sum + (t.quiz_score || 0), 0) / completedTraining.length
        : 0;

      const avgSkillLevel = pSkills.length > 0
        ? pSkills.filter(s => s.proficiency_level === 'advanced').length / pSkills.length
        : 0;

      return {
        practitioner_id: p.id,
        name: p.full_name,
        role: p.role,
        caseload_utilization: p.caseload_capacity ? (p.caseload_current / p.caseload_capacity) : 0,
        client_satisfaction: avgSatisfaction,
        training_completion: completedTraining.length,
        avg_training_score: avgTrainingScore,
        skill_mastery: avgSkillLevel,
        incident_count: pIncidents.length,
        documentation_quality: pNotes.length > 0 ? 0.85 : 0
      };
    });

    const avgTeamSatisfaction = teamMetrics.reduce((sum, m) => sum + m.client_satisfaction, 0) / teamMetrics.length;
    const avgCaseloadUtil = teamMetrics.reduce((sum, m) => sum + m.caseload_utilization, 0) / teamMetrics.length;
    const highPerformers = teamMetrics.filter(m => m.client_satisfaction >= 4.5 && m.avg_training_score >= 85);
    const needsSupport = teamMetrics.filter(m => m.client_satisfaction < 3.5 || m.avg_training_score < 70);

    const prompt = `
You are conducting team-wide performance analysis for an NDIS provider's management team.

TEAM COMPOSITION:
- Total Active Practitioners: ${activePractitioners.length}
- High Performers: ${highPerformers.length}
- Requiring Support: ${needsSupport.length}

AGGREGATED TEAM METRICS:
- Average Client Satisfaction: ${avgTeamSatisfaction.toFixed(2)}/5
- Average Caseload Utilization: ${(avgCaseloadUtil * 100).toFixed(1)}%
- Total Incidents: ${incidents.length}
- Training Modules Completed: ${trainingProgress.filter(t => t.status === 'completed').length}

TOP PERFORMERS:
${highPerformers.slice(0, 3).map(p => 
  `- ${p.name} (${p.role}): ${p.client_satisfaction.toFixed(1)}/5 satisfaction, ${p.avg_training_score.toFixed(0)}% training score`
).join('\n')}

PRACTITIONERS NEEDING SUPPORT:
${needsSupport.slice(0, 3).map(p =>
  `- ${p.name} (${p.role}): ${p.client_satisfaction.toFixed(1)}/5 satisfaction, ${p.incident_count} incidents`
).join('\n')}

Provide comprehensive team analysis:
1. TEAM STRENGTHS: Collective capabilities and successful patterns
2. COMMON DEVELOPMENT AREAS: Skill gaps affecting multiple practitioners
3. SYSTEMIC ISSUES: Organizational or process-level problems
4. TEAM DEVELOPMENT INITIATIVES: Evidence-based training programs
5. RESOURCE ALLOCATION STRATEGIES: Caseload balancing and support structures
6. SUCCESSION PLANNING: Readiness for senior roles
7. INTERVENTION PRIORITIES: Immediate actions required

Optimize for operational scalability and team effectiveness.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          team_strengths: {
            type: "array",
            items: {
              type: "object",
              properties: {
                strength: { type: "string" },
                evidence: { type: "string" },
                practitioners_demonstrating: { type: "array", items: { type: "string" } },
                replication_strategy: { type: "string" }
              }
            }
          },
          common_development_areas: {
            type: "array",
            items: {
              type: "object",
              properties: {
                area: { type: "string" },
                prevalence: { type: "string" },
                impact_on_service: { type: "string" },
                recommended_training: { type: "string" }
              }
            }
          },
          systemic_issues: {
            type: "array",
            items: {
              type: "object",
              properties: {
                issue: { type: "string" },
                severity: { type: "string" },
                root_cause: { type: "string" },
                organizational_fix: { type: "string" }
              }
            }
          },
          team_development_initiatives: {
            type: "array",
            items: {
              type: "object",
              properties: {
                initiative: { type: "string" },
                target_participants: { type: "string" },
                expected_outcome: { type: "string" },
                timeline: { type: "string" },
                success_metrics: { type: "array", items: { type: "string" } }
              }
            }
          },
          resource_allocation: {
            type: "object",
            properties: {
              caseload_rebalancing: { type: "array", items: { type: "string" } },
              mentorship_pairing: { type: "array", items: { type: "string" } },
              supervision_recommendations: { type: "array", items: { type: "string" } }
            }
          },
          intervention_priorities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                priority: { type: "string" },
                action: { type: "string" },
                responsible_party: { type: "string" },
                deadline: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      analysis: aiResponse,
      team_summary: {
        total_practitioners: activePractitioners.length,
        avg_satisfaction: avgTeamSatisfaction.toFixed(2),
        high_performers: highPerformers.length,
        needs_support: needsSupport.length
      },
      analyzed_at: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});