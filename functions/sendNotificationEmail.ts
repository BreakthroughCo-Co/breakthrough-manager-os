import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Send email notifications for critical alerts
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const { event, data } = await req.json();
    
    if (event.type !== 'create') {
      return Response.json({ skipped: true });
    }

    const notification = data;
    
    // Only send emails for high/critical priority
    if (notification.priority !== 'high' && notification.priority !== 'critical') {
      return Response.json({ skipped: true, reason: 'Not high priority' });
    }

    // Send email
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: notification.user_email,
      subject: `[${notification.priority.toUpperCase()}] ${notification.title}`,
      body: `
        <h2>${notification.title}</h2>
        <p>${notification.message}</p>
        <p><strong>Priority:</strong> ${notification.priority}</p>
        ${notification.action_url ? `<p><a href="${notification.action_url}">View Details</a></p>` : ''}
        <hr>
        <p style="color: #666; font-size: 12px;">This is an automated notification from Breakthrough Manager OS.</p>
      `,
    });

    // Update notification record
    await base44.asServiceRole.entities.Notification.update(notification.id, {
      email_sent: true,
      email_sent_at: new Date().toISOString(),
    });

    return Response.json({ success: true, email_sent: true });
  } catch (error) {
    console.error('Email notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});