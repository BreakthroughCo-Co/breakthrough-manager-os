import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { incident_id } = await req.json();

    if (!incident_id) {
      return Response.json({ error: 'incident_id required' }, { status: 400 });
    }

    // Fetch incident
    const incidents = await base44.entities.Incident.filter({ id: incident_id });
    if (!incidents.length) {
      return Response.json({ error: 'Incident not found' }, { status: 404 });
    }

    const incident = incidents[0];

    // Get similar incidents for pattern detection
    const allIncidents = await base44.entities.Incident.filter({ client_id: incident.client_id });

    // Use InvokeLLM to analyze
    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this NDIS incident report for Breakthrough Manager OS. Be clinical, precise, and actionable.

INCIDENT DETAILS:
- Client: ${incident.client_name}
- Date: ${incident.incident_date}
- Location: ${incident.location}
- Description: ${incident.description}
- Reported by: ${incident.reported_by}

SIMILAR PAST INCIDENTS (last 12 months):
${allIncidents.slice(0, 5).map(i => `- ${i.incident_date}: ${i.description.substring(0, 100)}...`).join('\n')}

Provide:
1. SEVERITY CLASSIFICATION: Choose from: critical, serious_injury, safeguarding_concern, non_compliance, operational_issue
2. INCIDENT TYPE: Choose from: behaviour, injury, safeguarding, medication, equipment_failure, documentation, compliance_breach, communication
3. ROOT CAUSE: Single primary cause (1-2 sentences, clinical language)
4. CONTRIBUTING FACTORS: 3-5 specific factors that enabled this incident
5. RISK SCORE: 0-100 (0=no recurrence risk, 100=imminent repeat)
6. RECURRENCE RISK: low/medium/high
7. PREVENTATIVE MEASURES: 3-5 specific, actionable interventions to reduce recurrence
8. PATTERN ANALYSIS: Any emerging trends from similar incidents?

Return as JSON only.`,
      response_json_schema: {
        type: "object",
        properties: {
          severity: { type: "string" },
          incident_type: { type: "string" },
          root_cause: { type: "string" },
          contributing_factors: { type: "array", items: { type: "string" } },
          risk_score: { type: "number" },
          recurrence_risk: { type: "string" },
          preventative_measures: { type: "array", items: { type: "string" } },
          pattern_analysis: { type: "string" }
        }
      }
    });

    // Update incident with AI analysis
    const updated = await base44.entities.Incident.update(incident_id, {
      severity: analysis.severity,
      incident_type: analysis.incident_type,
      root_cause: analysis.root_cause,
      contributing_factors: analysis.contributing_factors,
      risk_score: analysis.risk_score,
      recurrence_risk: analysis.recurrence_risk,
      preventative_measures: analysis.preventative_measures,
      ai_analysis_version: '1.0'
    });

    return Response.json({
      success: true,
      incident: updated,
      analysis: analysis
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});