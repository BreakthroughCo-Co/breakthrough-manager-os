import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { time_period = 90, client_id = null } = await req.json();

    // Fetch incidents from the specified time period
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - time_period);

    let incidents = await base44.asServiceRole.entities.Incident.list('-incident_date', 500);
    incidents = incidents.filter(inc => new Date(inc.incident_date) >= cutoffDate);

    if (client_id) {
      incidents = incidents.filter(inc => inc.client_id === client_id);
    }

    // Fetch compliance breaches
    let breaches = await base44.asServiceRole.entities.ComplianceBreach.list('-breach_date', 500);
    breaches = breaches.filter(b => new Date(b.breach_date) >= cutoffDate);

    // Prepare data for AI analysis
    const incidentSummary = incidents.map(inc => ({
      date: inc.incident_date,
      category: inc.category,
      severity: inc.severity,
      description: inc.description?.substring(0, 200),
      client_id: inc.client_id,
      ndis_reportable: inc.ndis_reportable
    }));

    const breachSummary = breaches.map(b => ({
      date: b.breach_date,
      category: b.breach_category,
      severity: b.severity_level,
      description: b.description?.substring(0, 200)
    }));

    // Use AI to analyze patterns
    const analysisPrompt = `You are an NDIS compliance and risk analyst. Analyze the following incident and compliance breach data:

INCIDENTS (last ${time_period} days):
${JSON.stringify(incidentSummary, null, 2)}

COMPLIANCE BREACHES (last ${time_period} days):
${JSON.stringify(breachSummary, null, 2)}

Provide a comprehensive analysis including:
1. Key patterns and trends in incident types, categories, and severity
2. Correlations between incidents and compliance breaches
3. Time-based patterns (e.g., day of week, time of day trends if visible)
4. High-risk areas requiring immediate attention
5. Emerging risk indicators

Return your analysis as a JSON object with this structure:
{
  "summary": "Executive summary of findings",
  "key_trends": [{"trend": "trend description", "impact": "high/medium/low", "recommendation": "action"}],
  "incident_patterns": {
    "most_common_categories": [{"category": "name", "count": number, "severity_distribution": {}}],
    "severity_trends": "description",
    "temporal_patterns": "description"
  },
  "compliance_concerns": {
    "breach_categories": [{"category": "name", "count": number}],
    "correlation_with_incidents": "description"
  },
  "risk_indicators": [{"indicator": "description", "risk_level": "high/medium/low", "action_required": "yes/no"}],
  "recommendations": [{"priority": "urgent/high/medium/low", "action": "recommendation", "rationale": "why"}]
}`;

    const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          key_trends: {
            type: "array",
            items: {
              type: "object",
              properties: {
                trend: { type: "string" },
                impact: { type: "string" },
                recommendation: { type: "string" }
              }
            }
          },
          incident_patterns: { type: "object" },
          compliance_concerns: { type: "object" },
          risk_indicators: {
            type: "array",
            items: { type: "object" }
          },
          recommendations: {
            type: "array",
            items: { type: "object" }
          }
        }
      }
    });

    return Response.json({
      analysis: aiResult,
      data_summary: {
        incidents_analyzed: incidents.length,
        breaches_analyzed: breaches.length,
        time_period_days: time_period,
        analysis_date: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error analyzing incident trends:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});