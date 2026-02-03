import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_id } = await req.json();

    const [
      client,
      incidents,
      caseNotes,
      communications,
      riskAlerts,
      bsps
    ] = await Promise.all([
      base44.entities.Client.filter({ id: client_id }).then(c => c[0]),
      base44.entities.Incident.filter({ client_id }),
      base44.entities.CaseNote.filter({ client_id }),
      base44.entities.ClientCommunication.filter({ client_id }),
      base44.entities.RiskAlert.filter({ client_id }),
      base44.entities.BehaviourSupportPlan.filter({ client_id }),
    ]);

    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    // Analyze temporal patterns
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    const last60Days = new Date();
    last60Days.setDate(last60Days.getDate() - 60);
    const last90Days = new Date();
    last90Days.setDate(last90Days.getDate() - 90);

    const incidents30 = incidents.filter(i => new Date(i.incident_date) > last30Days);
    const incidents60 = incidents.filter(i => new Date(i.incident_date) > last60Days && new Date(i.incident_date) <= last30Days);
    const incidents90 = incidents.filter(i => new Date(i.incident_date) > last90Days && new Date(i.incident_date) <= last60Days);

    const incidentTrend = incidents30.length > incidents60.length ? 'increasing' : 
                          incidents30.length < incidents60.length ? 'decreasing' : 'stable';

    // Communication engagement patterns
    const comms30 = communications.filter(c => new Date(c.sent_date) > last30Days);
    const responseRate = comms30.filter(c => c.recipient_response).length / Math.max(comms30.length, 1);

    // Progress patterns
    const notes30 = caseNotes.filter(n => new Date(n.session_date) > last30Days);
    const progressRatings = notes30.map(n => n.progress_rating).filter(Boolean);
    const regressionCount = progressRatings.filter(r => r === 'regression').length;

    // Risk alert history
    const activeAlerts = riskAlerts.filter(a => a.status === 'active');
    const resolvedAlerts = riskAlerts.filter(a => a.status === 'resolved');

    const contextData = `
CLIENT RISK PREDICTION ANALYSIS
Client: ${client.full_name}
Current Risk Level: ${client.risk_level || 'Not assessed'}

INCIDENT PATTERNS:
- Last 30 Days: ${incidents30.length} incidents
- Previous 30 Days: ${incidents60.length} incidents
- Trend: ${incidentTrend}
- High Severity (30d): ${incidents30.filter(i => i.severity === 'high' || i.severity === 'critical').length}
- Restrictive Practices Used: ${incidents30.filter(i => i.restrictive_practice_used).length}

ENGAGEMENT PATTERNS:
- Communication Response Rate (30d): ${(responseRate * 100).toFixed(0)}%
- Case Notes (30d): ${notes30.length}
- Regression Indicators: ${regressionCount} sessions

PROGRESS INDICATORS:
- Recent Ratings: ${progressRatings.slice(-5).join(', ') || 'No recent data'}
- BSP Status: ${bsps.find(b => b.status === 'active') ? 'Active' : 'No active BSP'}

ALERT HISTORY:
- Active Alerts: ${activeAlerts.length}
- Resolved Alerts: ${resolvedAlerts.length}

Predict future risk patterns and recommend interventions.`;

    const predictions = await base44.integrations.Core.InvokeLLM({
      prompt: `${contextData}\n\nAnalyze patterns to predict potential risks and recommend preemptive interventions.`,
      response_json_schema: {
        type: "object",
        properties: {
          predictions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                risk_category: { type: "string" },
                likelihood: { type: "string" },
                timeframe: { type: "string" },
                indicators: { type: "array", items: { type: "string" } },
                risk_score: { type: "number" },
                confidence: { type: "string" }
              }
            }
          },
          preemptive_interventions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                intervention_type: { type: "string" },
                priority: { type: "string" },
                description: { type: "string" },
                expected_impact: { type: "string" }
              }
            }
          },
          recommended_outreach: {
            type: "object",
            properties: {
              timing: { type: "string" },
              message_tone: { type: "string" },
              key_topics: { type: "array", items: { type: "string" } }
            }
          },
          monitoring_plan: {
            type: "object",
            properties: {
              frequency: { type: "string" },
              key_metrics: { type: "array", items: { type: "string" } },
              escalation_triggers: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    });

    // Create risk prediction records
    const highRiskPredictions = predictions.predictions.filter(p => 
      p.risk_score > 70 || p.likelihood === 'high'
    );

    const createdPredictions = [];
    for (const pred of highRiskPredictions) {
      const record = await base44.entities.RiskPrediction.create({
        client_id,
        client_name: client.full_name,
        prediction_date: new Date().toISOString(),
        risk_category: pred.risk_category,
        predicted_risk_score: pred.risk_score,
        confidence_level: pred.confidence,
        contributing_patterns: JSON.stringify(pred.indicators),
        recommended_interventions: JSON.stringify(predictions.preemptive_interventions),
        alert_triggered: pred.risk_score > 80,
        status: 'active',
      });
      createdPredictions.push(record);
    }

    return Response.json({
      client_id,
      client_name: client.full_name,
      predictions: predictions.predictions,
      preemptive_interventions: predictions.preemptive_interventions,
      recommended_outreach: predictions.recommended_outreach,
      monitoring_plan: predictions.monitoring_plan,
      alerts_created: createdPredictions.length,
      analysis_date: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Risk prediction error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});