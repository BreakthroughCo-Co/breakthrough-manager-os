import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { date_range_start, date_range_end } = await req.json();

    const [practitioners, appointments, clients, skills] = await Promise.all([
      base44.asServiceRole.entities.Practitioner.filter({ status: 'active' }),
      base44.asServiceRole.entities.Appointment.list('-appointment_date', 200),
      base44.asServiceRole.entities.Client.filter({ status: 'active' }),
      base44.asServiceRole.entities.PractitionerSkill.list()
    ]);

    const practitionerProfiles = practitioners.map(prac => {
      const pracAppointments = appointments.filter(a => a.practitioner_id === prac.id);
      const pracClients = clients.filter(c => c.assigned_practitioner_id === prac.id);
      const pracSkills = skills.filter(s => s.practitioner_id === prac.id);

      const weeklyAppointments = pracAppointments.filter(a => {
        const date = new Date(a.appointment_date);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return date >= weekAgo;
      });

      return {
        practitioner_id: prac.id,
        practitioner_name: prac.full_name,
        role: prac.role,
        current_caseload: pracClients.length,
        caseload_capacity: prac.caseload_capacity || 20,
        weekly_appointments: weeklyAppointments.length,
        skill_areas: pracSkills.map(s => s.skill_name),
        availability: prac.availability || 'full_time'
      };
    });

    const schedulingRequests = clients.slice(0, 20).map(client => {
      const clientAppointments = appointments.filter(a => a.client_id === client.id);
      const lastAppointment = clientAppointments.sort((a, b) => 
        new Date(b.appointment_date) - new Date(a.appointment_date)
      )[0];

      return {
        client_name: client.full_name,
        service_type: client.service_type,
        assigned_practitioner: client.assigned_practitioner_name,
        last_appointment: lastAppointment?.appointment_date,
        preferred_times: client.preferred_appointment_times || 'flexible'
      };
    });

    const prompt = `
You are a workforce scheduling optimization specialist for an NDIS provider.

PRACTITIONER AVAILABILITY:
${practitionerProfiles.map(p => 
  `- ${p.practitioner_name} (${p.role}): ${p.current_caseload}/${p.caseload_capacity} clients, ${p.weekly_appointments} appts/week, Skills: ${p.skill_areas.slice(0, 3).join(', ')}`
).join('\n')}

SCHEDULING REQUIREMENTS:
${schedulingRequests.map(r => 
  `- ${r.client_name} (${r.service_type}): Last seen ${r.last_appointment || 'never'}, Practitioner: ${r.assigned_practitioner || 'unassigned'}`
).join('\n')}

Optimize scheduling for next 2 weeks considering:
- Practitioner workload balance
- Client service frequency requirements
- Skill matching
- Travel time efficiency (group by location when possible)
- Appointment continuity

Provide:
1. OPTIMAL SCHEDULING RECOMMENDATIONS: Specific time slots and practitioner assignments
2. CONFLICT RESOLUTIONS: How to address scheduling bottlenecks
3. WORKLOAD REBALANCING: Suggestions to even distribution
4. EFFICIENCY GAINS: Estimated time/cost savings
5. AUTOMATED NOTIFICATIONS: Who needs to be informed of changes

Use evidence-based workforce optimization and NDIS service delivery standards.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          scheduling_recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                client_name: { type: "string" },
                practitioner_name: { type: "string" },
                recommended_date: { type: "string" },
                recommended_time: { type: "string" },
                appointment_type: { type: "string" },
                duration_minutes: { type: "number" },
                rationale: { type: "string" },
                priority: { type: "string" }
              }
            }
          },
          conflict_resolutions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                conflict_type: { type: "string" },
                affected_parties: { type: "array", items: { type: "string" } },
                resolution: { type: "string" },
                alternative_options: { type: "array", items: { type: "string" } }
              }
            }
          },
          workload_rebalancing: {
            type: "array",
            items: {
              type: "object",
              properties: {
                practitioner: { type: "string" },
                current_load: { type: "string" },
                recommended_adjustment: { type: "string" },
                implementation: { type: "string" }
              }
            }
          },
          efficiency_gains: {
            type: "object",
            properties: {
              estimated_time_saved: { type: "string" },
              utilization_improvement: { type: "string" },
              cost_impact: { type: "string" },
              client_satisfaction_impact: { type: "string" }
            }
          },
          automated_notifications: {
            type: "array",
            items: {
              type: "object",
              properties: {
                recipient: { type: "string" },
                notification_type: { type: "string" },
                message: { type: "string" },
                urgency: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      optimization: aiResponse,
      practitioner_profiles: practitionerProfiles,
      analyzed_at: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});