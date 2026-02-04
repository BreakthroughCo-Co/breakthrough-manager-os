import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { practitioner_id, forecast_weeks = 4 } = await req.json();

    const [practitioner, appointments, clients, scheduledReviews, tasks] = await Promise.all([
      base44.asServiceRole.entities.Practitioner.get(practitioner_id),
      base44.asServiceRole.entities.Appointment.filter({ practitioner_id }),
      base44.asServiceRole.entities.Client.filter({ assigned_practitioner_id: practitioner_id }),
      base44.asServiceRole.entities.ScheduledReview.filter({ assigned_practitioner: practitioner_id }),
      base44.asServiceRole.entities.Task.filter({ assigned_to: practitioner_id })
    ]);

    const today = new Date();
    const forecastEndDate = new Date();
    forecastEndDate.setDate(today.getDate() + (forecast_weeks * 7));

    const upcomingAppointments = appointments.filter(a => {
      const date = new Date(a.appointment_date);
      return date >= today && date <= forecastEndDate;
    });

    const upcomingReviews = scheduledReviews.filter(r => {
      const date = new Date(r.scheduled_date);
      return date >= today && date <= forecastEndDate && r.status !== 'completed';
    });

    const upcomingTasks = tasks.filter(t => {
      const date = new Date(t.due_date);
      return date >= today && date <= forecastEndDate && t.status !== 'completed';
    });

    // Calculate weekly breakdown
    const weeklyBreakdown = [];
    for (let week = 0; week < forecast_weeks; week++) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() + (week * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const weekAppointments = upcomingAppointments.filter(a => {
        const date = new Date(a.appointment_date);
        return date >= weekStart && date < weekEnd;
      });

      weeklyBreakdown.push({
        week: week + 1,
        week_start: weekStart.toISOString().split('T')[0],
        appointments: weekAppointments.length,
        estimated_hours: weekAppointments.length * 1.5 // Assume 1.5hr per appointment
      });
    }

    const prompt = `
You are a workforce planning specialist forecasting practitioner workload for an NDIS provider.

PRACTITIONER PROFILE:
- Name: ${practitioner.full_name}
- Role: ${practitioner.role}
- Current Caseload: ${clients.length} clients
- Caseload Capacity: ${practitioner.caseload_capacity || 20}

FORECAST PERIOD: Next ${forecast_weeks} weeks

SCHEDULED COMMITMENTS:
- Upcoming Appointments: ${upcomingAppointments.length}
- Scheduled Reviews: ${upcomingReviews.length}
- Outstanding Tasks: ${upcomingTasks.length}

WEEKLY APPOINTMENT DISTRIBUTION:
${weeklyBreakdown.map(w => `Week ${w.week} (${w.week_start}): ${w.appointments} appointments (~${w.estimated_hours}hrs)`).join('\n')}

CLIENT COMPLEXITY:
${clients.slice(0, 5).map(c => `- ${c.full_name} (${c.service_type}): Risk ${c.risk_level || 'medium'}`).join('\n')}

Provide comprehensive workload forecast including:
1. CAPACITY ANALYSIS: Current vs projected utilization
2. WORKLOAD PREDICTIONS: Week-by-week breakdown with time estimates
3. BOTTLENECK ALERTS: Periods of potential overload
4. BALANCING RECOMMENDATIONS: Workload distribution strategies
5. CONTINGENCY PLANNING: Buffer time and capacity cushion suggestions
6. EFFICIENCY OPPORTUNITIES: Process improvements to optimize time

Use NDIS service delivery standards and workforce management best practices.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          capacity_analysis: {
            type: "object",
            properties: {
              current_utilization_percentage: { type: "number" },
              projected_utilization_percentage: { type: "number" },
              capacity_status: { type: "string" },
              available_capacity_hours: { type: "number" },
              capacity_trend: { type: "string" }
            }
          },
          weekly_predictions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                week_number: { type: "number" },
                predicted_workload_hours: { type: "number" },
                utilization_level: { type: "string" },
                key_commitments: { type: "array", items: { type: "string" } },
                risk_level: { type: "string" }
              }
            }
          },
          bottleneck_alerts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                alert_type: { type: "string" },
                week_affected: { type: "number" },
                severity: { type: "string" },
                impact: { type: "string" },
                recommended_action: { type: "string" }
              }
            }
          },
          balancing_recommendations: {
            type: "array",
            items: {
              type: "string"
            }
          },
          contingency_planning: {
            type: "object",
            properties: {
              buffer_time_recommendation: { type: "string" },
              capacity_cushion_needed: { type: "string" },
              escalation_threshold: { type: "string" }
            }
          },
          efficiency_opportunities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                opportunity: { type: "string" },
                estimated_time_saving: { type: "string" },
                implementation_difficulty: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      forecast: aiResponse,
      raw_data: {
        upcoming_appointments: upcomingAppointments.length,
        upcoming_reviews: upcomingReviews.length,
        upcoming_tasks: upcomingTasks.length,
        weekly_breakdown: weeklyBreakdown
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