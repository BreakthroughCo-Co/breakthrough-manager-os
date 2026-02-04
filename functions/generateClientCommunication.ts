import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_id, communication_type, communication_purpose } = await req.json();

    const [client, appointments, goals, bsp, recentNotes] = await Promise.all([
      base44.asServiceRole.entities.Client.get(client_id),
      base44.asServiceRole.entities.Appointment.filter({ client_id }),
      base44.asServiceRole.entities.ClientGoal.filter({ client_id }),
      base44.asServiceRole.entities.BehaviourSupportPlan.filter({ client_id, status: 'active' }).then(p => p[0]).catch(() => null),
      base44.asServiceRole.entities.CaseNote.filter({ client_id })
    ]);

    const recentAppointments = appointments
      .filter(a => new Date(a.appointment_date) <= new Date())
      .sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date))
      .slice(0, 3);

    const upcomingAppointments = appointments
      .filter(a => new Date(a.appointment_date) > new Date())
      .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))
      .slice(0, 2);

    const lastAppointment = recentAppointments[0];
    const nextAppointment = upcomingAppointments[0];

    const activeGoals = goals.filter(g => g.status === 'active' || g.status === 'in_progress');
    const recentProgress = recentNotes
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 3);

    const daysSinceLastContact = lastAppointment 
      ? Math.floor((new Date() - new Date(lastAppointment.appointment_date)) / (1000 * 60 * 60 * 24))
      : null;

    const purposeContexts = {
      appointment_reminder: `Remind client of upcoming appointment on ${nextAppointment?.appointment_date || 'TBD'}`,
      progress_update: `Share positive progress update on goals`,
      engagement_check: `Re-engage client who hasn't been seen recently (${daysSinceLastContact} days)`,
      goal_celebration: `Celebrate achievement or milestone`,
      plan_review: `Invite to plan review meeting`,
      general_support: `General supportive outreach`
    };

    const prompt = `
You are drafting personalized client communication for an NDIS practitioner.

CLIENT PROFILE:
- Name: ${client.full_name}
- Service Type: ${client.service_type}
- Support Plan Focus: ${bsp?.primary_target_behaviors || 'General support'}

ENGAGEMENT PATTERN:
- Last Appointment: ${lastAppointment ? new Date(lastAppointment.appointment_date).toLocaleDateString() : 'None recorded'}
- Next Appointment: ${nextAppointment ? new Date(nextAppointment.appointment_date).toLocaleDateString() : 'Not scheduled'}
- Days Since Last Contact: ${daysSinceLastContact || 'N/A'}

ACTIVE GOALS:
${activeGoals.slice(0, 3).map(g => `- ${g.goal_description}: ${g.current_progress || 0}% complete`).join('\n')}

RECENT PROGRESS:
${recentProgress.slice(0, 2).map(n => `${new Date(n.created_date).toLocaleDateString()}: ${n.observations || 'Session conducted'}`).join('\n')}

COMMUNICATION TYPE: ${communication_type} (email/SMS)
PURPOSE: ${purposeContexts[communication_purpose] || communication_purpose}

Generate personalized ${communication_type} that:
- Uses warm, supportive tone appropriate for NDIS client relationship
- References specific goals or recent progress
- Is concise and action-oriented
- Includes clear call-to-action when appropriate
- Maintains professional boundaries
- Is culturally sensitive

For email: Include subject line
For SMS: Keep under 160 characters where possible`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          subject_line: { type: "string" },
          message_body: { type: "string" },
          sms_version: { type: "string" },
          personalization_notes: {
            type: "array",
            items: { type: "string" }
          },
          suggested_follow_up: { type: "string" },
          tone_analysis: { type: "string" }
        }
      }
    });

    return Response.json({
      success: true,
      draft: aiResponse,
      client_context: {
        client_name: client.full_name,
        last_contact: lastAppointment?.appointment_date,
        next_appointment: nextAppointment?.appointment_date,
        active_goals: activeGoals.length
      },
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});