import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { practitioner_id } = await req.json();

    // Gather comprehensive practitioner data
    const [practitioner, caseNotes, feedback, trainingProgress, incidents, skillMatrix, appointments] = await Promise.all([
      base44.asServiceRole.entities.Practitioner.get(practitioner_id),
      base44.asServiceRole.entities.CaseNote.filter({ practitioner_id }, '-created_date', 100),
      base44.asServiceRole.entities.ClientFeedback.filter({ practitioner_id }),
      base44.asServiceRole.entities.TrainingProgress.filter({ practitioner_id }),
      base44.asServiceRole.entities.Incident.filter({ practitioner_id }, '-incident_date', 20),
      base44.asServiceRole.entities.PractitionerSkill.filter({ practitioner_id }),
      base44.asServiceRole.entities.Appointment.filter({ practitioner_id }, '-appointment_date', 100)
    ]);

    // Calculate performance metrics
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const recentNotes = caseNotes.filter(n => new Date(n.created_date) >= last30Days);
    const recentFeedback = feedback.filter(f => new Date(f.feedback_date) >= last30Days);
    const avgFeedback = feedback.length > 0
      ? feedback.reduce((sum, f) => sum + (f.overall_satisfaction || 0), 0) / feedback.length
      : null;

    const completedTraining = trainingProgress.filter(t => t.status === 'completed');
    const pendingTraining = trainingProgress.filter(t => t.status === 'in_progress' || t.status === 'not_started');

    const recentIncidents = incidents.filter(i => new Date(i.incident_date) >= last30Days);
    const criticalIncidents = incidents.filter(i => i.severity === 'critical');

    const completedAppointments = appointments.filter(a => a.status === 'completed');
    const cancelledAppointments = appointments.filter(a => a.status === 'cancelled');

    const prompt = `
You are a performance analytics specialist conducting a comprehensive review of an NDIS practitioner.

PRACTITIONER PROFILE:
- Name: ${practitioner.full_name}
- Role: ${practitioner.role}
- Experience: ${practitioner.years_of_experience || 'Unknown'} years
- Employment Status: ${practitioner.status}

DOCUMENTATION PERFORMANCE:
- Total Case Notes: ${caseNotes.length}
- Recent Notes (30 days): ${recentNotes.length}
- Documentation Frequency: ${(recentNotes.length / 30).toFixed(1)} notes/day

CLIENT FEEDBACK:
- Total Reviews: ${feedback.length}
- Average Satisfaction: ${avgFeedback ? avgFeedback.toFixed(1) : 'N/A'}/5
- Recent Feedback (30 days): ${recentFeedback.length} reviews
${feedback.length > 0 ? `- Common Improvement Areas: ${[...new Set(feedback.flatMap(f => f.improvement_areas || []))].slice(0, 5).join(', ')}` : ''}

TRAINING & DEVELOPMENT:
- Completed Modules: ${completedTraining.length}
- In Progress/Pending: ${pendingTraining.length}
- Average Quiz Score: ${completedTraining.length > 0 ? (completedTraining.reduce((sum, t) => sum + (t.quiz_score || 0), 0) / completedTraining.length).toFixed(1) : 'N/A'}%

SKILL COMPETENCIES:
${skillMatrix.slice(0, 10).map(s => `- ${s.skill_name}: ${s.proficiency_level}`).join('\n')}

INCIDENT INVOLVEMENT:
- Total Incidents: ${incidents.length}
- Recent (30 days): ${recentIncidents.length}
- Critical Incidents: ${criticalIncidents.length}

SERVICE DELIVERY:
- Total Appointments: ${appointments.length}
- Completed: ${completedAppointments.length}
- Cancellations: ${cancelledAppointments.length}
- Attendance Rate: ${appointments.length > 0 ? ((completedAppointments.length / appointments.length) * 100).toFixed(1) : 0}%

Conduct comprehensive performance analysis and provide:
1. OVERALL PERFORMANCE RATING (0-100)
2. KEY STRENGTHS: Specific areas of excellence with evidence
3. DEVELOPMENT AREAS: Concrete skill gaps or improvement opportunities
4. PROFESSIONAL DEVELOPMENT RECOMMENDATIONS: Targeted training/coaching aligned with gaps
5. RECOGNITION OPPORTUNITIES: Achievements worth acknowledging
6. RISK FACTORS: Performance concerns requiring intervention
7. CAREER PROGRESSION READINESS: Assessment for next role/responsibility level

Use evidence-based performance assessment and NDIS workforce development frameworks.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          overall_rating: { type: "number" },
          performance_summary: { type: "string" },
          key_strengths: {
            type: "array",
            items: {
              type: "object",
              properties: {
                strength: { type: "string" },
                evidence: { type: "string" },
                impact: { type: "string" }
              }
            }
          },
          development_areas: {
            type: "array",
            items: {
              type: "object",
              properties: {
                area: { type: "string" },
                current_gap: { type: "string" },
                priority: { type: "string" },
                recommended_action: { type: "string" }
              }
            }
          },
          professional_development: {
            type: "array",
            items: {
              type: "object",
              properties: {
                resource_type: { type: "string" },
                resource_name: { type: "string" },
                rationale: { type: "string" },
                urgency: { type: "string" }
              }
            }
          },
          recognition_opportunities: {
            type: "array",
            items: {
              type: "string"
            }
          },
          risk_factors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                risk: { type: "string" },
                severity: { type: "string" },
                mitigation: { type: "string" }
              }
            }
          },
          career_progression: {
            type: "object",
            properties: {
              readiness_level: { type: "string" },
              recommended_next_step: { type: "string" },
              timeline: { type: "string" },
              prerequisites: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      practitioner_id,
      practitioner_name: practitioner.full_name,
      performance_insights: aiResponse,
      metrics: {
        documentation_count: caseNotes.length,
        avg_client_satisfaction: avgFeedback,
        completed_training: completedTraining.length,
        incident_count: incidents.length,
        appointment_attendance_rate: appointments.length > 0 ? (completedAppointments.length / appointments.length) * 100 : 0
      },
      analyzed_at: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});