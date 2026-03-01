import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { practitioner_id, date_from, date_to } = await req.json();

    // Fetch base data sets in parallel
    const [practitioners, clients, billingRecords, feedbackRecords, caseNotes] = await Promise.all([
      practitioner_id
        ? base44.asServiceRole.entities.Practitioner.filter({ id: practitioner_id })
        : base44.asServiceRole.entities.Practitioner.list(),
      base44.asServiceRole.entities.Client.list(),
      base44.asServiceRole.entities.BillingRecord.list(),
      base44.asServiceRole.entities.ClientFeedback.list(),
      base44.asServiceRole.entities.CaseNote.list('-session_date', 1000)
    ]);

    // Date filtering
    const fromDate = date_from ? new Date(date_from) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const toDate = date_to ? new Date(date_to) : new Date();

    const filteredBilling = billingRecords.filter(b => {
      const d = new Date(b.service_date);
      return d >= fromDate && d <= toDate;
    });

    const filteredNotes = caseNotes.filter(n => {
      const d = new Date(n.session_date);
      return d >= fromDate && d <= toDate;
    });

    const metrics = practitioners.map(p => {
      // Utilisation
      const utilisation_pct = p.caseload_capacity
        ? Math.round(((p.current_caseload || 0) / p.caseload_capacity) * 100)
        : null;

      // Billing metrics
      const pBilling = filteredBilling.filter(b => b.practitioner_id === p.id || b.practitioner_name === p.full_name);
      const totalBilled = pBilling.reduce((sum, b) => sum + (b.total_amount || 0), 0);
      const paidBilling = pBilling.filter(b => b.status === 'paid');
      const rejectedBilling = pBilling.filter(b => b.status === 'rejected');
      const submittedBilling = pBilling.filter(b => ['submitted', 'paid'].includes(b.status));
      const rejection_rate = submittedBilling.length
        ? Math.round((rejectedBilling.length / submittedBilling.length) * 100)
        : 0;
      const revenue_collected = paidBilling.reduce((sum, b) => sum + (b.total_amount || 0), 0);
      const billable_hours_target = p.billable_hours_target || 0;
      const billable_hours_actual = p.billable_hours_actual || 0;
      const billing_target_pct = billable_hours_target
        ? Math.round((billable_hours_actual / billable_hours_target) * 100)
        : null;

      // Client outcome metrics
      const pClients = clients.filter(c => c.assigned_practitioner_id === p.id);
      const avg_goal_attainment = pClients.length
        ? pClients.reduce((sum, c) => sum + (c.predicted_goal_attainment || 0), 0) / pClients.length
        : null;
      const high_risk_clients = pClients.filter(c => c.risk_level === 'high').length;
      const active_clients = pClients.filter(c => c.status === 'active').length;

      // Feedback
      const pFeedback = feedbackRecords.filter(f => f.practitioner_id === p.id || f.practitioner_name === p.full_name);
      const avg_feedback_score = pFeedback.length
        ? pFeedback.reduce((sum, f) => sum + (f.overall_rating || f.rating || 0), 0) / pFeedback.length
        : null;

      // Session frequency
      const pNotes = filteredNotes.filter(n => n.practitioner_id === p.id || n.practitioner_name === p.full_name);
      const sessions_in_period = pNotes.length;

      // Burnout risk heuristic: utilisation > 90% + rejection rate > 15% + high risk clients > 3
      const burnout_risk_score = Math.min(100, Math.round(
        (utilisation_pct > 90 ? 40 : utilisation_pct > 75 ? 20 : 0) +
        (rejection_rate > 15 ? 30 : rejection_rate > 5 ? 10 : 0) +
        (high_risk_clients > 3 ? 30 : high_risk_clients > 1 ? 15 : 0)
      ));

      return {
        practitioner_id: p.id,
        full_name: p.full_name,
        role: p.role,
        status: p.status,
        utilisation: {
          current_caseload: p.current_caseload || 0,
          caseload_capacity: p.caseload_capacity || 0,
          utilisation_pct
        },
        billing: {
          total_billed: totalBilled,
          revenue_collected,
          claim_count: pBilling.length,
          rejection_rate,
          billable_hours_target,
          billable_hours_actual,
          billing_target_pct
        },
        outcomes: {
          active_clients,
          high_risk_clients,
          avg_goal_attainment: avg_goal_attainment ? Math.round(avg_goal_attainment * 100) : null,
          avg_feedback_score: avg_feedback_score ? Math.round(avg_feedback_score * 10) / 10 : null,
          feedback_count: pFeedback.length
        },
        sessions: {
          sessions_in_period,
          session_types: pNotes.reduce((acc, n) => {
            acc[n.session_type] = (acc[n.session_type] || 0) + 1;
            return acc;
          }, {})
        },
        risk: {
          burnout_risk_score,
          burnout_risk_level: burnout_risk_score >= 60 ? 'high' : burnout_risk_score >= 30 ? 'medium' : 'low'
        }
      };
    });

    // Organisation-level aggregates
    const org_summary = {
      total_practitioners: practitioners.length,
      active_practitioners: practitioners.filter(p => p.status === 'active').length,
      avg_utilisation: Math.round(
        metrics.filter(m => m.utilisation.utilisation_pct !== null)
          .reduce((sum, m) => sum + m.utilisation.utilisation_pct, 0) /
        (metrics.filter(m => m.utilisation.utilisation_pct !== null).length || 1)
      ),
      total_revenue: metrics.reduce((sum, m) => sum + m.billing.revenue_collected, 0),
      avg_rejection_rate: Math.round(
        metrics.reduce((sum, m) => sum + m.billing.rejection_rate, 0) / (metrics.length || 1)
      ),
      high_burnout_risk: metrics.filter(m => m.risk.burnout_risk_level === 'high').length
    };

    return Response.json({ success: true, metrics, org_summary, date_from: fromDate.toISOString(), date_to: toDate.toISOString() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});