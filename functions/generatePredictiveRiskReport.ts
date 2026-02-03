import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch recent data for pattern analysis
    const incidents = await base44.asServiceRole.entities.Incident.list('-incident_date', 200);
    const breaches = await base44.asServiceRole.entities.ComplianceBreach.list('-breach_date', 100);
    const riskAlerts = await base44.asServiceRole.entities.RiskAlert.list('-triggered_date', 100);
    const clients = await base44.asServiceRole.entities.Client.filter({ status: 'active' });
    const caseNotes = await base44.asServiceRole.entities.CaseNote.list('-session_date', 200);

    // Calculate statistics
    const last30Days = incidents.filter(i => {
      const date = new Date(i.incident_date);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      return date >= cutoff;
    });

    const last60Days = incidents.filter(i => {
      const date = new Date(i.incident_date);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 60);
      return date >= cutoff;
    });

    const incidentTrend = last30Days.length > 0 && last60Days.length > 30
      ? ((last30Days.length / 30) / ((last60Days.length - last30Days.length) / 30) - 1) * 100
      : 0;

    // Prepare data for predictive analysis
    const dataContext = {
      incident_summary: {
        total: incidents.length,
        last_30_days: last30Days.length,
        trend_percentage: incidentTrend.toFixed(1),
        by_severity: {
          critical: incidents.filter(i => i.severity === 'critical').length,
          high: incidents.filter(i => i.severity === 'high').length,
          medium: incidents.filter(i => i.severity === 'medium').length,
          low: incidents.filter(i => i.severity === 'low').length
        },
        by_category: incidents.slice(0, 50).reduce((acc, inc) => {
          acc[inc.category] = (acc[inc.category] || 0) + 1;
          return acc;
        }, {})
      },
      compliance_summary: {
        total_breaches: breaches.length,
        recent_breaches: breaches.filter(b => {
          const date = new Date(b.breach_date);
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - 30);
          return date >= cutoff;
        }).length,
        by_category: breaches.slice(0, 30).reduce((acc, b) => {
          acc[b.breach_category] = (acc[b.breach_category] || 0) + 1;
          return acc;
        }, {})
      },
      risk_alerts_summary: {
        active_alerts: riskAlerts.filter(a => a.status === 'active').length,
        high_risk_clients: clients.filter(c => c.risk_level === 'high').length,
        medium_risk_clients: clients.filter(c => c.risk_level === 'medium').length
      },
      recent_patterns: {
        most_common_incident_types: Object.entries(
          incidents.slice(0, 100).reduce((acc, i) => {
            acc[i.category] = (acc[i.category] || 0) + 1;
            return acc;
          }, {})
        ).sort((a, b) => b[1] - a[1]).slice(0, 5)
      }
    };

    const predictivePrompt = `You are a predictive risk analyst for an NDIS service provider. Based on historical data and current trends, generate a predictive risk report.

CURRENT DATA SUMMARY:
${JSON.stringify(dataContext, null, 2)}

Generate a comprehensive predictive risk report that includes:
1. Likelihood of specific incident types occurring in the next 30-90 days
2. Potential compliance risks based on current patterns
3. High-risk clients or situations that require proactive intervention
4. Seasonal or temporal patterns that suggest upcoming challenges
5. Early warning indicators that management should monitor

Return your analysis as a JSON object with this structure:
{
  "executive_summary": "Brief overview of predicted risks",
  "risk_forecast": {
    "next_30_days": [{"risk_type": "type", "likelihood": "high/medium/low", "potential_impact": "description"}],
    "next_90_days": [{"risk_type": "type", "likelihood": "high/medium/low", "potential_impact": "description"}]
  },
  "emerging_risks": [
    {
      "risk_name": "name",
      "category": "incident/compliance/operational/clinical",
      "probability": "high/medium/low",
      "impact": "high/medium/low",
      "indicators": ["indicator1", "indicator2"],
      "recommended_actions": ["action1", "action2"],
      "monitoring_metrics": ["metric1", "metric2"]
    }
  ],
  "proactive_interventions": [
    {
      "area": "area name",
      "current_trend": "description",
      "intervention": "recommended action",
      "expected_outcome": "description",
      "timeline": "when to implement"
    }
  ],
  "early_warning_signals": [
    {
      "signal": "what to watch for",
      "frequency": "how often to monitor",
      "threshold": "when to act",
      "escalation_path": "who to notify"
    }
  ],
  "confidence_level": "high/medium/low",
  "analysis_limitations": ["limitation1", "limitation2"]
}`;

    const prediction = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: predictivePrompt,
      response_json_schema: {
        type: "object",
        properties: {
          executive_summary: { type: "string" },
          risk_forecast: { type: "object" },
          emerging_risks: { type: "array" },
          proactive_interventions: { type: "array" },
          early_warning_signals: { type: "array" },
          confidence_level: { type: "string" },
          analysis_limitations: { type: "array" }
        }
      }
    });

    return Response.json({
      prediction,
      data_summary: dataContext,
      generated_date: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating predictive risk report:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});