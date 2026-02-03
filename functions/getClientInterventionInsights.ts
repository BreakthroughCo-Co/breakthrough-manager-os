import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Client-Specific Intervention Insights
 * Analyzes which interventions are most effective for this specific client's profile
 * based on system-wide efficacy data and client history
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_id } = await req.json();

    // Fetch client-specific data
    const [client, caseNotes, bsps, incidents, allClients, allCaseNotes] = await Promise.all([
      base44.entities.Client.filter({ id: client_id }).then(c => c[0]),
      base44.entities.CaseNote.filter({ client_id }, '-session_date', 30),
      base44.entities.BehaviourSupportPlan.filter({ client_id }),
      base44.entities.Incident.filter({ client_id }, '-incident_date', 20),
      base44.entities.Client.list(),
      base44.entities.CaseNote.list('-session_date', 300)
    ]);

    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    // Find similar clients (same service type, similar risk level)
    const similarClients = allClients.filter(c => 
      c.service_type === client.service_type && 
      c.id !== client.id
    );

    // Analyze which interventions work for similar clients
    const interventionSuccessMap = {};
    allCaseNotes
      .filter(cn => similarClients.map(sc => sc.id).includes(cn.client_id))
      .forEach(cn => {
        if (!cn.plan) return;
        
        const interventionKey = cn.plan.substring(0, 100);
        const progressValue = { 
          regression: 1, 
          no_change: 2, 
          emerging: 3, 
          progressing: 4, 
          achieved: 5 
        }[cn.progress_rating] || 0;

        if (!interventionSuccessMap[interventionKey]) {
          interventionSuccessMap[interventionKey] = {
            intervention: cn.plan,
            outcomes: [],
            count: 0
          };
        }
        interventionSuccessMap[interventionKey].outcomes.push(progressValue);
        interventionSuccessMap[interventionKey].count += 1;
      });

    // Calculate effectiveness scores
    const sortedInterventions = Object.values(interventionSuccessMap)
      .filter(i => i.count >= 3) // At least 3 applications
      .map(i => ({
        ...i,
        avg_effectiveness: (i.outcomes.reduce((a,b) => a+b) / i.outcomes.length / 5 * 100).toFixed(1),
        success_rate: ((i.outcomes.filter(o => o >= 4).length / i.outcomes.length) * 100).toFixed(1)
      }))
      .sort((a, b) => parseFloat(b.avg_effectiveness) - parseFloat(a.avg_effectiveness));

    // Build client profile context
    const clientContext = `
CLIENT PROFILE:
Name: ${client.full_name}
Service Type: ${client.service_type}
Risk Level: ${client.risk_level}
Status: ${client.status}

SIMILAR CLIENT GROUP:
${similarClients.length} clients with same service type
Risk levels: ${[...new Set(similarClients.map(c => c.risk_level))].join(', ')}

THIS CLIENT'S RECENT PROGRESS:
${caseNotes.slice(0, 5).map(cn => `- ${cn.session_date}: ${cn.progress_rating}`).join('\n')}

INCIDENTS:
${incidents.length} total incidents
Recent (last 10): ${incidents.slice(0, 10).map(i => i.category).join(', ')}

TOP INTERVENTIONS FOR SIMILAR CLIENTS:
${sortedInterventions.slice(0, 10).map(i => 
  `- ${i.intervention.substring(0, 80)}: ${i.avg_effectiveness}% effective, ${i.success_rate}% success rate`
).join('\n')}`;

    const insights = await base44.integrations.Core.InvokeLLM({
      prompt: `${clientContext}

Based on this client's profile and what works for similar clients, provide:

1. **Best Interventions for This Client** - Top 3-4 interventions ranked by expected effectiveness
   - Why each intervention is recommended
   - Success rate for similar clients
   - Implementation notes

2. **Interventions to Deprioritize** - Strategies showing low effectiveness for this profile
   - Why they're not working
   - When they might still be useful

3. **Current Progress Assessment** - How is this client tracking?
   - Pattern analysis of recent sessions
   - Risk and protective factors evident
   - Trajectory

4. **Tailored Intervention Strategy** - Custom recommendations
   - Specific sequencing or combination of interventions
   - Adaptations for this client's needs/preferences
   - Intensity and frequency recommendations

5. **Monitoring & Adjustment** - How to track if interventions are working
   - Key indicators to monitor
   - When to adjust approach
   - Expected timeline to see change

Be specific to behaviour support and NDIS-aligned goal achievement.`,
      response_json_schema: {
        type: "object",
        properties: {
          best_interventions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                intervention: { type: "string" },
                rank: { type: "number" },
                expected_effectiveness: { type: "string" },
                success_rate_similar_clients: { type: "string" },
                rationale: { type: "string" },
                implementation_notes: { type: "string" }
              }
            }
          },
          interventions_to_deprioritize: {
            type: "array",
            items: {
              type: "object",
              properties: {
                intervention: { type: "string" },
                why_ineffective: { type: "string" },
                exceptions: { type: "string" }
              }
            }
          },
          progress_assessment: {
            type: "object",
            properties: {
              current_trajectory: { type: "string" },
              protective_factors: { type: "array", items: { type: "string" } },
              risk_factors: { type: "array", items: { type: "string" } }
            }
          },
          tailored_strategy: {
            type: "object",
            properties: {
              strategy_summary: { type: "string" },
              intervention_sequence: { type: "array", items: { type: "string" } },
              intensity_frequency: { type: "string" },
              adaptations: { type: "array", items: { type: "string" } }
            }
          },
          monitoring_framework: {
            type: "object",
            properties: {
              key_indicators: { type: "array", items: { type: "string" } },
              measurement_method: { type: "string" },
              adjustment_triggers: { type: "array", items: { type: "string" } },
              expected_timeline: { type: "string" }
            }
          }
        }
      }
    });

    return Response.json({
      client_id,
      client_name: client.full_name,
      service_type: client.service_type,
      analysis_date: new Date().toISOString(),
      similar_client_count: similarClients.length,
      top_interventions: sortedInterventions.slice(0, 5),
      insights
    });

  } catch (error) {
    console.error('Client intervention insights error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});