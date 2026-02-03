import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const payload = await req.json();
    const { 
      start_date, 
      end_date, 
      optimization_criteria = 'balanced', // 'client_needs' | 'staff_availability' | 'balanced' | 'minimize_travel'
      consider_travel = true 
    } = payload;

    if (!start_date || !end_date) {
      return Response.json({ error: 'start_date and end_date are required' }, { status: 400 });
    }

    // Fetch practitioners and their availability
    const practitioners = await base44.asServiceRole.entities.Practitioner.filter({ status: 'active' });

    // Fetch active clients and their practitioners
    const clients = await base44.asServiceRole.entities.Client.filter({ status: 'active' });

    // Fetch appointments in the date range
    const appointments = await base44.asServiceRole.entities.Appointment.filter({});
    const relevantAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.appointment_date);
      return aptDate >= new Date(start_date) && aptDate <= new Date(end_date);
    });

    // Fetch recent case notes to understand service frequency
    const caseNotes = await base44.asServiceRole.entities.CaseNote.list('-session_date', 100);

    // Analyze client service patterns
    const clientServicePatterns = {};
    clients.forEach(client => {
      const clientNotes = caseNotes.filter(note => note.client_id === client.id);
      if (clientNotes.length >= 2) {
        const dates = clientNotes.map(n => new Date(n.session_date)).sort((a, b) => b - a);
        const intervals = [];
        for (let i = 0; i < dates.length - 1; i++) {
          const daysBetween = (dates[i] - dates[i + 1]) / (1000 * 60 * 60 * 24);
          intervals.push(daysBetween);
        }
        const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
        clientServicePatterns[client.id] = {
          avg_interval_days: Math.round(avgInterval),
          last_service_date: dates[0],
          frequency: avgInterval <= 7 ? 'weekly' : avgInterval <= 14 ? 'fortnightly' : 'monthly',
        };
      }
    });

    // Prepare data for AI optimization
    const practitionerData = practitioners.map(p => ({
      id: p.id,
      name: p.full_name,
      role: p.role,
      current_caseload: p.current_caseload || 0,
      caseload_capacity: p.caseload_capacity || 20,
      billable_hours_target: p.billable_hours_target || 120,
      billable_hours_actual: p.billable_hours_actual || 0,
      assigned_clients: clients.filter(c => c.assigned_practitioner_id === p.id).length,
    }));

    const clientData = clients.map(c => ({
      id: c.id,
      name: c.full_name,
      assigned_practitioner_id: c.assigned_practitioner_id,
      service_type: c.service_type,
      risk_level: c.risk_level,
      service_pattern: clientServicePatterns[c.id] || null,
      funding_remaining: (c.funding_allocated || 0) - (c.funding_utilised || 0),
    }));

    const appointmentData = relevantAppointments.map(apt => ({
      id: apt.id,
      client_id: apt.client_id,
      practitioner_id: apt.practitioner_id,
      date: apt.appointment_date,
      duration: apt.duration_minutes,
      status: apt.status,
    }));

    const aiPrompt = `You are an AI scheduling optimizer for an NDIS service provider.

OPTIMIZATION PERIOD: ${start_date} to ${end_date}
OPTIMIZATION CRITERIA: ${optimization_criteria}
CONSIDER TRAVEL: ${consider_travel}

PRACTITIONERS:
${JSON.stringify(practitionerData, null, 2)}

CLIENTS:
${JSON.stringify(clientData, null, 2)}

EXISTING APPOINTMENTS:
${JSON.stringify(appointmentData, null, 2)}

CLIENT SERVICE PATTERNS:
${JSON.stringify(clientServicePatterns, null, 2)}

TASK:
Create an optimized scheduling recommendation that:
1. Ensures all clients receive services according to their patterns/needs
2. Balances workload across practitioners
3. Helps practitioners meet billable hours targets
4. ${consider_travel ? 'Minimizes travel time by grouping clients geographically where possible' : ''}
5. Prioritizes high-risk clients
6. Respects practitioner caseload capacity
7. ${optimization_criteria === 'client_needs' ? 'Prioritizes client needs above all' : ''}
8. ${optimization_criteria === 'staff_availability' ? 'Optimizes for staff utilization' : ''}
9. ${optimization_criteria === 'minimize_travel' ? 'Minimizes travel distance/time' : ''}

Output as JSON:
{
  "scheduling_recommendations": [
    {
      "client_id": "string",
      "client_name": "string",
      "practitioner_id": "string",
      "practitioner_name": "string",
      "recommended_date": "YYYY-MM-DD",
      "recommended_time": "HH:MM",
      "duration_minutes": 60,
      "service_type": "direct_support|assessment|etc",
      "priority": "high|medium|low",
      "rationale": "why this scheduling"
    }
  ],
  "workload_distribution": {
    "practitioner_id": {
      "total_appointments": 10,
      "total_hours": 15,
      "utilization_rate": 0.75,
      "target_gap": -5
    }
  },
  "optimization_notes": "overall strategy and considerations",
  "warnings": ["any scheduling conflicts or concerns"]
}`;

    const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: aiPrompt,
      add_context_from_internet: false,
      response_json_schema: {
        type: 'object',
        properties: {
          scheduling_recommendations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                client_id: { type: 'string' },
                client_name: { type: 'string' },
                practitioner_id: { type: 'string' },
                practitioner_name: { type: 'string' },
                recommended_date: { type: 'string' },
                recommended_time: { type: 'string' },
                duration_minutes: { type: 'number' },
                service_type: { type: 'string' },
                priority: { type: 'string' },
                rationale: { type: 'string' },
              },
            },
          },
          workload_distribution: { type: 'object' },
          optimization_notes: { type: 'string' },
          warnings: { type: 'array', items: { type: 'string' } },
        },
      },
    });

    return Response.json({
      success: true,
      period: { start_date, end_date },
      optimization_criteria,
      scheduling_recommendations: aiResult.scheduling_recommendations,
      workload_distribution: aiResult.workload_distribution,
      optimization_notes: aiResult.optimization_notes,
      warnings: aiResult.warnings,
      summary: {
        total_recommendations: aiResult.scheduling_recommendations.length,
        practitioners_involved: [...new Set(aiResult.scheduling_recommendations.map(r => r.practitioner_id))].length,
        clients_scheduled: [...new Set(aiResult.scheduling_recommendations.map(r => r.client_id))].length,
      },
    });
  } catch (error) {
    console.error('Staff scheduling optimization error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});