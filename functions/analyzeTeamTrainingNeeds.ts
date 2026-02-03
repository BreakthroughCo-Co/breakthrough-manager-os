import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const [
      practitioners,
      assignments,
      modules,
      ratings,
      incidents,
      breaches,
      requests
    ] = await Promise.all([
      base44.entities.Practitioner.filter({ status: 'active' }),
      base44.entities.TrainingAssignment.list(),
      base44.entities.TrainingModule.filter({ status: 'active' }),
      base44.entities.TrainingRating.list(),
      base44.entities.Incident.list(),
      base44.entities.ComplianceBreach.list(),
      base44.entities.TrainingRequest.list(),
    ]);

    // Aggregate team-wide metrics
    const totalAssignments = assignments.length;
    const completedAssignments = assignments.filter(a => a.completion_status === 'completed').length;
    const overdueAssignments = assignments.filter(a => 
      a.completion_status !== 'completed' && new Date(a.due_date) < new Date()
    ).length;

    // Module effectiveness analysis
    const moduleEffectiveness = modules.map(module => {
      const moduleRatings = ratings.filter(r => r.module_id === module.id);
      const avgRating = moduleRatings.length > 0
        ? moduleRatings.reduce((sum, r) => sum + r.effectiveness_rating, 0) / moduleRatings.length
        : 0;
      const completionCount = assignments.filter(a => 
        a.module_id === module.id && a.completion_status === 'completed'
      ).length;
      
      return {
        module_name: module.module_name,
        category: module.category,
        avg_rating: avgRating,
        completion_count: completionCount,
        recommendation_rate: moduleRatings.filter(r => r.would_recommend).length / Math.max(moduleRatings.length, 1) * 100,
      };
    });

    // Identify skill gaps by role
    const roleGaps = {};
    for (const practitioner of practitioners) {
      if (!roleGaps[practitioner.role]) {
        roleGaps[practitioner.role] = {
          practitioners: [],
          common_gaps: [],
          overdue_count: 0,
        };
      }
      roleGaps[practitioner.role].practitioners.push(practitioner.full_name);
      const practOverdue = assignments.filter(a => 
        a.practitioner_id === practitioner.id && 
        a.completion_status !== 'completed' && 
        new Date(a.due_date) < new Date()
      );
      roleGaps[practitioner.role].overdue_count += practOverdue.length;
    }

    // Recent incident patterns that suggest training needs
    const last90Days = new Date();
    last90Days.setDate(last90Days.getDate() - 90);
    const recentIncidents = incidents.filter(i => new Date(i.incident_date) > last90Days);
    const incidentCategories = [...new Set(recentIncidents.map(i => i.category))];

    // Compliance gaps
    const activeBreaches = breaches.filter(b => b.status !== 'closed' && b.status !== 'remediated');
    const breachTypes = [...new Set(activeBreaches.map(b => b.breach_type))];

    // Training demand signals
    const requestedCategories = [...new Set(requests.map(r => r.training_category))];

    const contextData = `
TEAM-WIDE TRAINING ANALYSIS

TEAM METRICS:
- Total Practitioners: ${practitioners.length}
- Total Assignments: ${totalAssignments}
- Completion Rate: ${(completedAssignments / Math.max(totalAssignments, 1) * 100).toFixed(1)}%
- Overdue Assignments: ${overdueAssignments}

MODULE EFFECTIVENESS:
${moduleEffectiveness.map(m => 
  `- ${m.module_name} (${m.category}): Avg Rating ${m.avg_rating.toFixed(1)}/5, ${m.recommendation_rate.toFixed(0)}% would recommend`
).join('\n')}

ROLE-BASED ANALYSIS:
${Object.entries(roleGaps).map(([role, data]) => 
  `- ${role}: ${data.practitioners.length} staff, ${data.overdue_count} overdue`
).join('\n')}

INCIDENT PATTERNS (Last 90 Days):
- Total Incidents: ${recentIncidents.length}
- Categories: ${incidentCategories.join(', ')}
- High Severity: ${recentIncidents.filter(i => i.severity === 'high' || i.severity === 'critical').length}

COMPLIANCE CONCERNS:
- Active Breaches: ${activeBreaches.length}
- Types: ${breachTypes.join(', ')}

TRAINING DEMAND SIGNALS:
- Requested Categories: ${requestedCategories.join(', ')}
- Total Requests: ${requests.length}

Analyze this data to identify team-wide training priorities and gaps.`;

    const aiAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt: `${contextData}\n\nProvide comprehensive team-wide training recommendations based on aggregated staff data, incident patterns, and compliance needs.`,
      response_json_schema: {
        type: "object",
        properties: {
          executive_summary: { type: "string" },
          priority_training_needs: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                urgency: { type: "string" },
                affected_roles: { type: "array", items: { type: "string" } },
                rationale: { type: "string" },
                recommended_modules: { type: "array", items: { type: "string" } }
              }
            }
          },
          underperforming_modules: {
            type: "array",
            items: {
              type: "object",
              properties: {
                module_name: { type: "string" },
                issue: { type: "string" },
                improvement_recommendation: { type: "string" }
              }
            }
          },
          emerging_training_needs: {
            type: "array",
            items: {
              type: "object",
              properties: {
                trend: { type: "string" },
                recommendation: { type: "string" },
                timeline: { type: "string" }
              }
            }
          },
          role_specific_priorities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                role: { type: "string" },
                priority_areas: { type: "array", items: { type: "string" } },
                immediate_actions: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      }
    });

    return Response.json({
      analysis: aiAnalysis,
      metrics: {
        team_size: practitioners.length,
        completion_rate: (completedAssignments / Math.max(totalAssignments, 1) * 100).toFixed(1),
        overdue_count: overdueAssignments,
        recent_incidents: recentIncidents.length,
        active_breaches: activeBreaches.length,
      },
      module_effectiveness: moduleEffectiveness.slice(0, 10),
      generated_date: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Team training analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});