/**
 * Funding Utilisation Burn Rate Monitor
 * Scheduled weekly — checks all active clients for funding burn rate risk.
 * Creates ProactiveAlerts for clients at risk of exhausting funds before plan end date.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const clients = await base44.asServiceRole.entities.Client.filter({ status: 'active' });
  const alerts = [];
  const today = new Date();

  for (const client of clients) {
    if (!client.plan_end_date || !client.funding_allocated || !client.funding_utilised) continue;

    const planEnd = new Date(client.plan_end_date);
    const planStart = client.plan_start_date ? new Date(client.plan_start_date) : new Date(today.getFullYear(), 0, 1);
    const totalDays = Math.max(1, (planEnd - planStart) / (1000 * 60 * 60 * 24));
    const daysElapsed = Math.max(0, (today - planStart) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, (planEnd - today) / (1000 * 60 * 60 * 24));

    const expectedUtilisationRate = daysElapsed / totalDays;
    const actualUtilisationRate = client.funding_utilised / client.funding_allocated;
    const remainingFunding = client.funding_allocated - client.funding_utilised;

    // Projected daily spend
    const dailySpend = daysElapsed > 0 ? client.funding_utilised / daysElapsed : 0;
    const projectedTotal = dailySpend * totalDays;
    const projectedOverrun = projectedTotal - client.funding_allocated;

    let alertLevel = null;
    let message = '';

    if (projectedOverrun > 0) {
      alertLevel = 'high';
      message = `Projected overrun of $${projectedOverrun.toFixed(0)} at current burn rate. Plan ends ${client.plan_end_date}.`;
    } else if (actualUtilisationRate < expectedUtilisationRate - 0.2 && daysRemaining < 90) {
      alertLevel = 'medium';
      message = `Underspend risk: only ${(actualUtilisationRate * 100).toFixed(0)}% utilised with ${Math.round(daysRemaining)} days remaining.`;
    } else if (remainingFunding < dailySpend * 30) {
      alertLevel = 'high';
      message = `Less than 30 days of funding remaining at current spend rate.`;
    }

    if (alertLevel) {
      // Dedup: check if alert already exists
      const existing = await base44.asServiceRole.entities.ProactiveAlert.filter({
        related_entity_id: client.id,
        alert_type: 'funding_burn_rate',
        status: 'active',
      });

      if (!existing || existing.length === 0) {
        await base44.asServiceRole.entities.ProactiveAlert.create({
          title: `Funding Burn Rate Alert: ${client.full_name}`,
          description: message,
          alert_type: 'funding_burn_rate',
          severity: alertLevel,
          status: 'active',
          related_entity_type: 'Client',
          related_entity_id: client.id,
        });
        alerts.push({ client: client.full_name, level: alertLevel, message });
      }
    }
  }

  return Response.json({
    success: true,
    clients_checked: clients.length,
    alerts_created: alerts.length,
    alerts,
  });
});