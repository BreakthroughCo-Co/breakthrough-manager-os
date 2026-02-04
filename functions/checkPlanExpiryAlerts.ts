import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all active clients
    const clients = await base44.asServiceRole.entities.Client.filter({ status: 'active' });
    
    // Get existing notifications to avoid duplicates
    const existingNotifications = await base44.asServiceRole.entities.Notification.list();
    
    const alerts = [];
    const now = new Date();
    
    for (const client of clients) {
      if (!client.plan_end_date) continue;
      
      const expiryDate = new Date(client.plan_end_date);
      const daysRemaining = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));
      
      // Check if we should create an alert at 90, 60, or 30 days
      const thresholds = [90, 60, 30];
      
      for (const threshold of thresholds) {
        if (daysRemaining === threshold) {
          // Check if notification already exists for this client and threshold
          const notificationKey = `plan_expiry_${client.id}_${threshold}`;
          const exists = existingNotifications.some(n => 
            n.notification_type === 'plan_expiry_alert' && 
            n.metadata?.includes(notificationKey)
          );
          
          if (!exists) {
            let priority = 'medium';
            if (threshold <= 30) priority = 'critical';
            else if (threshold <= 60) priority = 'high';
            
            // Create notification
            await base44.asServiceRole.entities.Notification.create({
              notification_type: 'plan_expiry_alert',
              title: `NDIS Plan Expiring: ${client.full_name}`,
              message: `NDIS plan for ${client.full_name} expires in ${daysRemaining} days (${client.plan_end_date}). Action required to ensure continuity of service.`,
              priority: priority,
              entity_type: 'Client',
              entity_id: client.id,
              is_read: false,
              metadata: notificationKey,
              action_url: `/ClientDetail?clientId=${client.id}`
            });
            
            alerts.push({
              client_id: client.id,
              client_name: client.full_name,
              days_remaining: daysRemaining,
              threshold: threshold,
              priority: priority
            });
          }
        }
      }
    }
    
    // Send email summary to admins if there are critical alerts
    const criticalAlerts = alerts.filter(a => a.priority === 'critical');
    
    if (criticalAlerts.length > 0) {
      const adminUsers = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      
      for (const admin of adminUsers) {
        const emailBody = `
          <h2>NDIS Plan Expiry Alerts - Critical</h2>
          <p>The following NDIS plans require immediate attention:</p>
          <ul>
            ${criticalAlerts.map(a => 
              `<li><strong>${a.client_name}</strong> - ${a.days_remaining} days remaining</li>`
            ).join('')}
          </ul>
          <p>Please review these clients and initiate plan renewal processes.</p>
        `;
        
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject: `⚠️ URGENT: ${criticalAlerts.length} NDIS Plan(s) Expiring Soon`,
          body: emailBody
        });
      }
    }
    
    return Response.json({ 
      success: true,
      alerts_created: alerts.length,
      critical_alerts: criticalAlerts.length,
      alerts: alerts
    });
    
  } catch (error) {
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});