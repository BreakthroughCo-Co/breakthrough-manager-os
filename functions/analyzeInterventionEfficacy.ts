import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Intervention Efficacy Analysis
 * Analyzes outcomes of interventions to identify most effective strategies
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch comprehensive intervention and outcome data
    const [caseNotes, bsps, incidents, clients] = await Promise.all([
      base44.entities.CaseNote.list('-session_date', 100),
      base44.entities.BehaviourSupportPlan.list('-created_date', 50),
      base44.entities.Incident.list('-incident_date', 100),
      base44.entities.Client.list()
    ]);

    // Organize data by intervention type and outcome
    const interventionAnalysis = {};
    const clientMap = new Map(clients.map(c => [c.id, c]));

    // Analyze case notes for interventions and progress
    caseNotes.forEach(note => {
      if (!note.plan || !note.progress_rating) return;

      const interventionKey = note.plan.substring(0, 50);
      if (!interventionAnalysis[interventionKey]) {
        interventionAnalysis[interventionKey] = {
          intervention: note.plan,
          outcomes: [],
          count: 0,
          avgProgress: 0,
          effectiveness: 0
        };
      }

      const progressMap = { regression: 1, no_change: 2, emerging: 3, progressing: 4, achieved: 5 };
      interventionAnalysis[interventionKey].outcomes.push(progressMap[note.progress_rating] || 0);
      interventionAnalysis[interventionKey].count += 1;
    });

    // Calculate effectiveness scores
    Object.keys(interventionAnalysis).forEach(key => {
      const data = interventionAnalysis[key];
      if (data.outcomes.length > 0) {
        const avgScore = data.outcomes.reduce((a, b) => a + b, 0) / data.outcomes.length;
        data.effectiveness = Math.round((avgScore / 5) * 100);
        data.avgProgress = avgScore;
      }
    });

    // Sort by effectiveness
    const sortedInterventions = Object.values(interventionAnalysis)
      .filter(i => i.count >= 2) // At least 2 applications
      .sort((a, b) => b.effectiveness - a.effectiveness)
      .slice(0, 20);

    // Analyze incident patterns by client demographics
    const incidentPatterns = {};
    incidents.forEach(incident => {
      const client = clientMap.get(incident.client_id);
      if (!client) return;

      const key = `${client.service_type}_${incident.category}`;
      if (!incidentPatterns[key]) {
        incidentPatterns[key] = {
          service_type: client.service_type,
          incident_category: incident.category,
          count: 0,
          severity_avg: 0,
          severities: []
        };
      }
      incidentPatterns[key].count += 1;
      const sevScore = { low: 1, medium: 2, high: 3, critical: 4 }[incident.severity] || 0;
      incidentPatterns[key].severities.push(sevScore);
    });

    Object.keys(incidentPatterns).forEach(key => {
      const data = incidentPatterns[key];
      if (data.severities.length > 0) {
        data.severity_avg = (data.severities.reduce((a, b) => a + b, 0) / data.severities.length).toFixed(2);
      }
    });

    const incidentsByType = Object.values(incidentPatterns)
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // Use AI to synthesize patterns
    const contextData = `
INTERVENTION EFFICACY DATA:

Top Performing Interventions:
${sortedInterventions.slice(0, 10).map(i => 
  `- ${i.intervention.substring(0, 60)}: ${i.effectiveness}% effectiveness (${i.count} applications)`
).join('\n')}

INCIDENT PATTERN ANALYSIS:

High-Risk Combinations (Service Type + Incident Category):
${incidentsByType.slice(0, 8).map(i => 
  `- ${i.service_type} + ${i.incident_category}: ${i.count} incidents, avg severity ${i.severity_avg}/4`
).join('\n')}

Lower Effectiveness Interventions (but still used):
${sortedInterventions.slice(-5).reverse().map(i => 
  `- ${i.intervention.substring(0, 60)}: ${i.effectiveness}% effectiveness`
).join('\n')}`;

    const aiAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt: `${contextData}

Analyze this intervention efficacy and incident data to provide:

1. **Most Effective Interventions** - Top 3-5 strategies with highest success rates and why they work well
2. **Lowest Effectiveness Strategies** - Interventions showing poor outcomes and recommendations for replacement
3. **High-Risk Profiles** - Client/service combinations most prone to incidents and recommended interventions
4. **Clinical Recommendations** - Specific, actionable recommendations for improving intervention selection and client matching
5. **Training Priorities** - Key skills practitioners should develop based on efficacy patterns

Be specific and evidence-based. Focus on practical clinical improvements.`,
      response_json_schema: {
        type: "object",
        properties: {
          most_effective: {
            type: "array",
            items: {
              type: "object",
              properties: {
                strategy: { type: "string" },
                effectiveness_rating: { type: "string" },
                why_effective: { type: "string" },
                best_for: { type: "string" }
              }
            }
          },
          low_effectiveness: {
            type: "array",
            items: {
              type: "object",
              properties: {
                strategy: { type: "string" },
                effectiveness_rating: { type: "string" },
                recommendation: { type: "string" }
              }
            }
          },
          high_risk_profiles: {
            type: "array",
            items: {
              type: "object",
              properties: {
                profile: { type: "string" },
                risk_factors: { type: "array", items: { type: "string" } },
                recommended_interventions: { type: "array", items: { type: "string" } }
              }
            }
          },
          clinical_recommendations: { type: "array", items: { type: "string" } },
          training_priorities: { type: "array", items: { type: "string" } }
        }
      }
    });

    return Response.json({
      analysis_date: new Date().toISOString(),
      interventions_analyzed: sortedInterventions.length,
      top_interventions: sortedInterventions.slice(0, 5),
      incident_patterns_analyzed: incidentsByType.length,
      ai_insights: aiAnalysis,
      all_interventions: sortedInterventions
    });

  } catch (error) {
    console.error('Intervention analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});