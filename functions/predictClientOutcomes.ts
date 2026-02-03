import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Client Outcome Prediction & Risk Identification
 * Analyzes historical data to predict long-term outcomes and flag at-risk clients
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch comprehensive client data
    const [clients, caseNotes, goals, incidents, communications, riskAlerts] = await Promise.all([
      base44.entities.Client.list(),
      base44.entities.CaseNote.list('-session_date', 500),
      base44.entities.ClientGoal.list(),
      base44.entities.Incident.list('-incident_date', 200),
      base44.entities.ClientCommunication.list('-sent_date', 200),
      base44.entities.RiskAlert.list('-triggered_date', 100)
    ]);

    // Analyze each client's trajectory
    const clientAnalyses = clients.map(client => {
      // Get client-specific data
      const clientNotes = caseNotes.filter(cn => cn.client_id === client.id);
      const clientGoals = goals.filter(g => g.client_id === client.id);
      const clientIncidents = incidents.filter(i => i.client_id === client.id);
      const clientComms = communications.filter(c => c.client_id === client.id);
      const clientAlerts = riskAlerts.filter(a => a.client_id === client.id);

      // Calculate progress trend (last 10 sessions)
      const recentNotes = clientNotes.slice(0, 10);
      const progressRatings = { 'regression': 1, 'no_change': 2, 'emerging': 3, 'progressing': 4, 'achieved': 5 };
      const progressScores = recentNotes.map(n => progressRatings[n.progress_rating] || 0);
      const avgProgress = progressScores.length > 0 ? (progressScores.reduce((a, b) => a + b) / progressScores.length) : 0;

      // Calculate goal achievement
      const achievedGoals = clientGoals.filter(g => g.status === 'achieved').length;
      const totalGoals = clientGoals.length;
      const achievementRate = totalGoals > 0 ? (achievedGoals / totalGoals) * 100 : 0;

      // Assess engagement
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);
      const recentNotes30d = clientNotes.filter(n => new Date(n.session_date) > last30Days);
      const engagementScore = Math.min(100, (recentNotes30d.length * 10) + (clientComms.filter(c => new Date(c.sent_date) > last30Days).length * 5));

      // Risk indicators
      const hasActiveAlerts = clientAlerts.filter(a => a.status === 'active').length > 0;
      const recentIncidents30d = clientIncidents.filter(i => new Date(i.incident_date) > last30Days);
      const incidentTrend = recentIncidents30d.length > 0 ? 'concerning' : 'stable';

      return {
        client_id: client.id,
        client_name: client.full_name,
        service_type: client.service_type,
        risk_level: client.risk_level,
        months_in_service: Math.ceil(clientNotes.length / 4),
        goals_count: totalGoals,
        achieved_goals: achievedGoals,
        achievement_rate: achievementRate,
        avg_progress_score: avgProgress,
        engagement_score: engagementScore,
        recent_sessions_30d: recentNotes30d.length,
        incidents_30d: recentIncidents30d.length,
        active_risk_alerts: clientAlerts.filter(a => a.status === 'active').length,
        engagement_trend: engagementScore > 60 ? 'strong' : engagementScore > 40 ? 'moderate' : 'weak'
      };
    });

    // Build prediction context
    const predictionContext = `
CLIENT OUTCOME PREDICTION ANALYSIS:

HIGH ACHIEVERS (>75% goal achievement):
${clientAnalyses.filter(c => c.achievement_rate > 75).slice(0, 5).map(c => 
  `- ${c.client_name}: ${c.achieved_goals}/${c.goals_count} goals achieved, engagement ${c.engagement_score}/100`
).join('\n')}

AT-RISK CLIENTS (Low engagement <40 OR high incidents):
${clientAnalyses.filter(c => c.engagement_score < 40 || c.incidents_30d > 2).slice(0, 5).map(c =>
  `- ${c.client_name}: Engagement ${c.engagement_score}/100, ${c.incidents_30d} recent incidents, ${c.achievement_rate.toFixed(0)}% goal progress`
).join('\n')}

SLOW PROGRESS CLIENTS (Low achievement rate <25%):
${clientAnalyses.filter(c => c.achievement_rate < 25 && c.months_in_service > 6).slice(0, 5).map(c =>
  `- ${c.client_name}: Only ${c.achievement_rate.toFixed(0)}% goal progress after ${c.months_in_service}m, engagement ${c.engagement_score}/100`
).join('\n')}

ENGAGEMENT TRENDS:
- Strong engagement: ${clientAnalyses.filter(c => c.engagement_score > 60).length} clients
- Moderate engagement: ${clientAnalyses.filter(c => c.engagement_score >= 40 && c.engagement_score <= 60).length} clients
- Weak engagement: ${clientAnalyses.filter(c => c.engagement_score < 40).length} clients

TOTAL CLIENTS ANALYZED: ${clientAnalyses.length}`;

    const predictions = await base44.integrations.Core.InvokeLLM({
      prompt: `${predictionContext}

Analyze client historical data and provide:

1. **Client Outcome Predictions** (12-month horizon)
   - Likely goal achievement rate
   - Risk of disengagement
   - Projected progress trajectory
   - Confidence level in prediction

2. **At-Risk Client Flagging** (Immediate attention needed)
   - Clients with high disengagement risk
   - Clients with declining progress
   - Clients approaching plan expiry without goal progress
   - Risk score (0-100) for each flagged client

3. **Early Intervention Opportunities**
   - Clients who would benefit from intensive support
   - Specialised intervention recommendations
   - Service modifications needed
   - Mentoring/coaching opportunities

4. **High Achiever Analysis**
   - Patterns in successful clients
   - Replicable success strategies
   - Expansion opportunities for high performers

5. **Engagement Recovery Strategies** (For at-risk clients)
   - Specific re-engagement tactics
   - Service modifications
   - Practitioner-client fit assessment
   - Communication approach recommendations

6. **Demographic/Profile Patterns**
   - Which client profiles succeed best
   - Which require additional support
   - Service type effectiveness by demographic

7. **Proactive Action Plan**
   - Immediate interventions for high-risk clients
   - 30/60/90-day milestones to monitor
   - Success metrics for each intervention

Be specific with client names and provide evidence-based recommendations.`,
      response_json_schema: {
        type: "object",
        properties: {
          outcome_predictions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                client_name: { type: "string" },
                risk_level: { type: "string" },
                projected_achievement: { type: "string" },
                disengagement_risk: { type: "string" },
                confidence: { type: "string" },
                key_factors: { type: "array", items: { type: "string" } }
              }
            }
          },
          at_risk_clients: {
            type: "array",
            items: {
              type: "object",
              properties: {
                client_name: { type: "string" },
                risk_score: { type: "number" },
                primary_concerns: { type: "array", items: { type: "string" } },
                recommended_action: { type: "string" },
                urgency: { type: "string" }
              }
            }
          },
          early_intervention_opportunities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                client_name: { type: "string" },
                current_status: { type: "string" },
                intervention_type: { type: "string" },
                expected_outcome: { type: "string" },
                implementation_timeline: { type: "string" }
              }
            }
          },
          high_achiever_patterns: { type: "array", items: { type: "string" } },
          engagement_recovery_strategies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                strategy: { type: "string" },
                applicable_profiles: { type: "array", items: { type: "string" } },
                success_rate: { type: "string" }
              }
            }
          }
        }
      }
    });

    // Create ClientGoal records or alerts for at-risk clients
    for (const atRiskClient of predictions.at_risk_clients?.slice(0, 10) || []) {
      const client = clientAnalyses.find(c => c.client_name === atRiskClient.client_name);
      if (client && atRiskClient.risk_score > 60) {
        // Create a task for case managers
        await base44.asServiceRole.entities.Task.create({
          title: `[AT-RISK] ${atRiskClient.client_name} - Intervention Required`,
          description: `Risk Score: ${atRiskClient.risk_score}/100. Concerns: ${atRiskClient.primary_concerns.join(', ')}. Action: ${atRiskClient.recommended_action}`,
          category: 'Clinical',
          priority: atRiskClient.urgency === 'immediate' ? 'urgent' : 'high',
          status: 'pending',
          due_date: new Date().toISOString().split('T')[0]
        });
      }
    }

    return Response.json({
      analysis_date: new Date().toISOString(),
      total_clients_analyzed: clientAnalyses.length,
      client_summaries: clientAnalyses,
      predictions
    });

  } catch (error) {
    console.error('Client outcome prediction error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});