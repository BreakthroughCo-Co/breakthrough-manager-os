import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_id, report_period_start, report_period_end, report_type = 'comprehensive' } = await req.json();

    const [client, appointments, caseNotes, feedback, goals, bsp] = await Promise.all([
      base44.asServiceRole.entities.Client.get(client_id),
      base44.asServiceRole.entities.Appointment.filter({ client_id }),
      base44.asServiceRole.entities.CaseNote.filter({ client_id }),
      base44.asServiceRole.entities.ClientFeedback.filter({ client_id }),
      base44.asServiceRole.entities.ClientGoal.filter({ client_id }),
      base44.asServiceRole.entities.BehaviourSupportPlan.filter({ client_id, status: 'active' }).then(p => p[0]).catch(() => null)
    ]);

    // Filter by report period
    const periodStart = new Date(report_period_start);
    const periodEnd = new Date(report_period_end);

    const periodAppointments = appointments.filter(a => {
      const date = new Date(a.appointment_date);
      return date >= periodStart && date <= periodEnd;
    });

    const periodNotes = caseNotes.filter(n => {
      const date = new Date(n.created_date);
      return date >= periodStart && date <= periodEnd;
    });

    const periodFeedback = feedback.filter(f => {
      const date = new Date(f.feedback_date);
      return date >= periodStart && date <= periodEnd;
    });

    // Calculate metrics
    const completedAppointments = periodAppointments.filter(a => a.status === 'completed').length;
    const totalScheduled = periodAppointments.length;
    const attendanceRate = totalScheduled > 0 ? (completedAppointments / totalScheduled) * 100 : 0;

    const avgSatisfaction = periodFeedback.length > 0
      ? periodFeedback.reduce((sum, f) => sum + (f.overall_satisfaction || 0), 0) / periodFeedback.length
      : null;

    const goalProgress = goals.map(g => ({
      goal: g.goal_description,
      progress: g.current_progress || 0,
      status: g.status
    }));

    const prompt = `
You are generating a ${report_type} service delivery report for an NDIS client.

CLIENT INFORMATION:
- Name: ${client.full_name}
- NDIS Number: ${client.ndis_number}
- Service Type: ${client.service_type}
- Report Period: ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}

SERVICE METRICS:
- Appointments Completed: ${completedAppointments}/${totalScheduled}
- Attendance Rate: ${attendanceRate.toFixed(1)}%
- Client Satisfaction: ${avgSatisfaction ? avgSatisfaction.toFixed(1) + '/5' : 'Not available'}

PRACTITIONER NOTES SUMMARY:
${periodNotes.slice(0, 10).map(n => 
  `${new Date(n.created_date).toLocaleDateString()}: ${n.observations || ''} | Progress: ${n.progress_against_goals || ''}`
).join('\n')}

GOAL ATTAINMENT:
${goalProgress.map(g => `- ${g.goal}: ${g.progress}% (${g.status})`).join('\n')}

ACTIVE BEHAVIOUR SUPPORT PLAN:
${bsp ? `Plan active since ${bsp.plan_start_date}, Focus: ${bsp.primary_target_behaviors || 'General support'}` : 'No active BSP'}

Generate ${report_type} report including:
1. EXECUTIVE SUMMARY: High-level overview for senior management
2. SERVICE DELIVERY METRICS: Key performance indicators
3. PROGRESS NARRATIVE: Client development and goal attainment
4. INTERVENTION EFFECTIVENESS: Analysis of strategies used
5. RECOMMENDATIONS: Evidence-based next steps
6. COMPLIANCE NOTES: NDIS reporting requirements met

Customize output for: ${report_type === 'ndis_commission' ? 'NDIS Commission audit' : report_type === 'management' ? 'Internal management review' : 'Comprehensive stakeholder report'}`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          executive_summary: { type: "string" },
          service_delivery_metrics: {
            type: "object",
            properties: {
              total_appointments: { type: "number" },
              attendance_rate: { type: "number" },
              client_satisfaction: { type: "string" },
              practitioner_continuity: { type: "string" },
              service_intensity: { type: "string" }
            }
          },
          progress_narrative: { type: "string" },
          goal_attainment_summary: {
            type: "array",
            items: {
              type: "object",
              properties: {
                goal: { type: "string" },
                progress_percentage: { type: "number" },
                achievements: { type: "string" },
                barriers: { type: "string" },
                next_steps: { type: "string" }
              }
            }
          },
          intervention_effectiveness: {
            type: "array",
            items: {
              type: "object",
              properties: {
                intervention: { type: "string" },
                effectiveness_rating: { type: "string" },
                evidence: { type: "string" },
                adjustments_made: { type: "string" }
              }
            }
          },
          recommendations: {
            type: "array",
            items: {
              type: "string"
            }
          },
          compliance_notes: {
            type: "object",
            properties: {
              ndis_standards_met: { type: "array", items: { type: "string" } },
              documentation_status: { type: "string" },
              plan_review_status: { type: "string" }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      report: aiResponse,
      report_metadata: {
        client_name: client.full_name,
        report_period: `${periodStart.toISOString()} to ${periodEnd.toISOString()}`,
        report_type,
        generated_by: user.email
      },
      raw_data: {
        appointments: periodAppointments.length,
        notes: periodNotes.length,
        feedback: periodFeedback.length
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