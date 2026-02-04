import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Gather engagement data
    const [clients, appointments, caseNotes, feedback] = await Promise.all([
      base44.asServiceRole.entities.Client.filter({ status: 'active' }),
      base44.asServiceRole.entities.Appointment.list('-appointment_date', 500),
      base44.asServiceRole.entities.CaseNote.list('-created_date', 500),
      base44.asServiceRole.entities.ClientFeedback.list('-feedback_date', 100)
    ]);

    const engagementProfiles = clients.map(client => {
      const clientAppointments = appointments.filter(a => a.client_id === client.id);
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);
      const last60Days = new Date();
      last60Days.setDate(last60Days.getDate() - 60);

      const recentAppointments = clientAppointments.filter(a => 
        new Date(a.appointment_date) >= last30Days
      );
      const previousPeriod = clientAppointments.filter(a => {
        const date = new Date(a.appointment_date);
        return date >= last60Days && date < last30Days;
      });

      const cancelledRecent = recentAppointments.filter(a => a.status === 'cancelled').length;
      const clientNotes = caseNotes.filter(n => n.client_id === client.id);
      const recentNotes = clientNotes.filter(n => new Date(n.created_date) >= last30Days);
      const clientFeedback = feedback.filter(f => f.client_id === client.id);
      const recentFeedback = clientFeedback.filter(f => new Date(f.feedback_date) >= last30Days);

      const engagementTrend = recentAppointments.length - previousPeriod.length;
      const avgFeedbackScore = clientFeedback.length > 0
        ? clientFeedback.reduce((sum, f) => sum + (f.overall_satisfaction || 0), 0) / clientFeedback.length
        : null;

      return {
        client_id: client.id,
        client_name: client.full_name,
        appointments_last_30_days: recentAppointments.length,
        appointments_previous_30_days: previousPeriod.length,
        engagement_trend: engagementTrend,
        cancellations: cancelledRecent,
        documentation_frequency: recentNotes.length,
        feedback_count: clientFeedback.length,
        avg_satisfaction: avgFeedbackScore,
        recent_feedback: recentFeedback.length
      };
    });

    const prompt = `
You are a client engagement specialist analyzing participation patterns for NDIS clients.

CLIENT ENGAGEMENT DATA:
${engagementProfiles.slice(0, 50).map(p => 
  `- ${p.client_name}: ${p.appointments_last_30_days} appointments (trend: ${p.engagement_trend > 0 ? '+' : ''}${p.engagement_trend}), ${p.cancellations} cancellations, documentation: ${p.documentation_frequency} notes, satisfaction: ${p.avg_satisfaction ? p.avg_satisfaction.toFixed(1) : 'N/A'}`
).join('\n')}

Analyze engagement patterns and identify:
1. DISENGAGEMENT RISK: Clients showing declining participation
2. ENGAGEMENT RED FLAGS: Warning signs requiring immediate attention
3. OUTREACH PRIORITIES: Ranked list of clients needing proactive contact
4. PERSONALIZED STRATEGIES: Client-specific outreach approaches
5. SYSTEMIC PATTERNS: Common disengagement triggers across cohort
6. PREVENTATIVE MEASURES: Proactive engagement strategies

Use behavioral engagement principles and NDIS participant-centered practice.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          disengagement_risks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                client_name: { type: "string" },
                risk_level: { type: "string" },
                risk_score: { type: "number" },
                indicators: { type: "array", items: { type: "string" } },
                recommended_action: { type: "string" },
                urgency: { type: "string" }
              }
            }
          },
          engagement_red_flags: {
            type: "array",
            items: {
              type: "object",
              properties: {
                pattern: { type: "string" },
                affected_clients: { type: "array", items: { type: "string" } },
                severity: { type: "string" },
                intervention: { type: "string" }
              }
            }
          },
          outreach_priorities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                client_name: { type: "string" },
                priority_rank: { type: "number" },
                contact_strategy: { type: "string" },
                key_message: { type: "string" },
                preferred_timing: { type: "string" }
              }
            }
          },
          personalized_strategies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                client_name: { type: "string" },
                engagement_profile: { type: "string" },
                tailored_approach: { type: "string" },
                expected_response: { type: "string" }
              }
            }
          },
          systemic_patterns: {
            type: "array",
            items: {
              type: "string"
            }
          },
          preventative_measures: {
            type: "array",
            items: {
              type: "string"
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      analysis: aiResponse,
      engagement_profiles: engagementProfiles.slice(0, 20),
      analyzed_at: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});