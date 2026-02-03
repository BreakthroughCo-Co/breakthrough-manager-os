import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // This function can be called without user auth (scheduled automation)
    // But if called directly, require admin
    let isScheduled = false;
    try {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    } catch {
      // No user auth - assume scheduled execution
      isScheduled = true;
    }

    const payload = await req.json().catch(() => ({}));
    const { client_id = null, risk_threshold = 65 } = payload;

    let clientsToMonitor = [];

    if (client_id) {
      // Monitor specific client
      const client = await base44.asServiceRole.entities.Client.get(client_id);
      clientsToMonitor = [client];
    } else {
      // Monitor all active clients
      clientsToMonitor = await base44.asServiceRole.entities.Client.filter({ status: 'active' });
    }

    const riskAnalysisResults = [];
    const alertsGenerated = [];
    const interventionsRecommended = [];

    for (const client of clientsToMonitor) {
      // Calculate risk score using existing function
      const riskResult = await base44.asServiceRole.functions.invoke('calculateClientRiskScore', {
        client_id: client.id,
      });

      if (!riskResult.data || riskResult.data.error) {
        console.error(`Failed to calculate risk for client ${client.id}`);
        continue;
      }

      const riskData = riskResult.data;
      const riskScore = riskData.risk_assessment?.score || 0;
      const riskLevel = riskData.risk_assessment?.level || 'low';

      riskAnalysisResults.push({
        client_id: client.id,
        client_name: client.full_name,
        risk_score: riskScore,
        risk_level: riskLevel,
        contributing_factors: riskData.risk_assessment?.contributing_factors || [],
      });

      // Generate alerts for high-risk clients
      if (riskScore >= risk_threshold) {
        // Check if there's already an active alert
        const existingAlerts = await base44.asServiceRole.entities.RiskAlert.filter({
          client_id: client.id,
          status: 'active',
        });

        if (existingAlerts.length === 0) {
          // Create new alert
          const alert = await base44.asServiceRole.entities.RiskAlert.create({
            client_id: client.id,
            client_name: client.full_name,
            alert_type: riskScore >= 80 ? 'critical_incident' : 'high_risk_detected',
            risk_score: riskScore,
            risk_level: riskLevel,
            contributing_factors: JSON.stringify(riskData.risk_assessment?.contributing_factors || []),
            triggered_date: new Date().toISOString(),
            notified_staff: JSON.stringify([client.assigned_practitioner_id]),
            status: 'active',
          });

          alertsGenerated.push(alert);

          // Send email notification
          const assignedPractitioner = await base44.asServiceRole.entities.Practitioner.get(
            client.assigned_practitioner_id
          ).catch(() => null);

          if (assignedPractitioner?.email) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: assignedPractitioner.email,
              subject: `⚠️ High Risk Alert: ${client.full_name}`,
              body: `A high-risk situation has been detected for client ${client.full_name}.

Risk Score: ${riskScore}/100
Risk Level: ${riskLevel.toUpperCase()}

Contributing Factors:
${(riskData.risk_assessment?.contributing_factors || []).map(f => `• ${f}`).join('\n')}

Recommended Actions:
${(riskData.risk_assessment?.recommended_actions || []).map(a => `• ${a}`).join('\n')}

Please review the client's profile and take appropriate action.

View Client: [Link to client detail page]`,
            });
          }
        }

        // Generate intervention recommendations
        const interventionPrompt = `You are a proactive NDIS support coordinator analyzing high-risk client data.

CLIENT: ${client.full_name}
RISK SCORE: ${riskScore}/100
RISK LEVEL: ${riskLevel}

CONTRIBUTING FACTORS:
${(riskData.risk_assessment?.contributing_factors || []).join('\n')}

TRENDS:
${riskData.risk_assessment?.trends || 'No trends available'}

CONCERNS:
${(riskData.risk_assessment?.concerns || []).join('\n')}

TASK:
Suggest 3-5 specific, actionable preemptive interventions to mitigate this risk. For each intervention:
1. Describe the action
2. Expected impact
3. Priority (critical/high/medium)
4. Timeline for implementation
5. Responsible party (Practitioner/Coordinator/Management)
6. Whether an outreach message should be sent to the client

Output as JSON:
{
  "interventions": [
    {
      "action": "specific action to take",
      "expected_impact": "how this will help",
      "priority": "critical|high|medium",
      "timeline": "immediate|1-3 days|1 week|2 weeks",
      "responsible_party": "Practitioner|Coordinator|Management",
      "send_outreach": true,
      "outreach_message_type": "general_checkin|support_offer|goal_review",
      "rationale": "why this intervention is important"
    }
  ]
}`;

        const interventionResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: interventionPrompt,
          response_json_schema: {
            type: 'object',
            properties: {
              interventions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    action: { type: 'string' },
                    expected_impact: { type: 'string' },
                    priority: { type: 'string' },
                    timeline: { type: 'string' },
                    responsible_party: { type: 'string' },
                    send_outreach: { type: 'boolean' },
                    outreach_message_type: { type: 'string' },
                    rationale: { type: 'string' },
                  },
                },
              },
            },
          },
        });

        interventionsRecommended.push({
          client_id: client.id,
          client_name: client.full_name,
          interventions: interventionResult.interventions,
        });

        // Auto-generate outreach messages for critical interventions
        for (const intervention of interventionResult.interventions) {
          if (intervention.send_outreach && intervention.priority === 'critical') {
            const outreachResult = await base44.asServiceRole.functions.invoke('generatePersonalizedOutreach', {
              client_id: client.id,
              message_type: intervention.outreach_message_type || 'support_offer',
              custom_context: `This is a proactive outreach based on risk analysis. ${intervention.rationale}`,
            });

            if (outreachResult.data && !outreachResult.data.error) {
              // Schedule the outreach for immediate sending
              await base44.asServiceRole.entities.ScheduledOutreach.create({
                client_id: client.id,
                client_name: client.full_name,
                message_type: intervention.outreach_message_type || 'support_offer',
                subject: outreachResult.data.subject,
                message_body: outreachResult.data.message_body,
                scheduled_date: new Date().toISOString(),
                send_status: 'scheduled',
                created_by: 'AI Risk Monitoring System',
              });
            }
          }
        }
      }
    }

    return Response.json({
      success: true,
      monitoring_summary: {
        clients_monitored: clientsToMonitor.length,
        high_risk_clients: riskAnalysisResults.filter(r => r.risk_score >= risk_threshold).length,
        alerts_generated: alertsGenerated.length,
        interventions_recommended: interventionsRecommended.length,
      },
      risk_analysis: riskAnalysisResults,
      alerts: alertsGenerated,
      recommended_interventions: interventionsRecommended,
    });
  } catch (error) {
    console.error('Client risk monitoring error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});