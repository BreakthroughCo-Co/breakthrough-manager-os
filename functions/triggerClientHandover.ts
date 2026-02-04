import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { event, data, old_data } = await req.json();
    
    // Only trigger on Client updates where practitioner changes
    if (event.type !== 'update' || !data || !old_data) {
      return Response.json({ success: true, message: 'No action needed' });
    }

    // Check if practitioner assignment changed
    if (data.assigned_practitioner_id === old_data.assigned_practitioner_id) {
      return Response.json({ success: true, message: 'No practitioner change' });
    }

    // Skip if unassigning (setting to null/empty)
    if (!data.assigned_practitioner_id) {
      return Response.json({ success: true, message: 'Practitioner unassigned' });
    }

    const clientId = event.entity_id;
    const clientName = data.full_name;

    // Generate handover summary
    const handoverResponse = await base44.asServiceRole.functions.invoke('generateClientHandover', {
      client_id: clientId
    });

    if (handoverResponse.data?.success) {
      // Get practitioner details
      const newPractitioner = await base44.asServiceRole.entities.Practitioner.get(
        data.assigned_practitioner_id
      ).catch(() => null);

      const oldPractitioner = old_data.assigned_practitioner_id 
        ? await base44.asServiceRole.entities.Practitioner.get(
            old_data.assigned_practitioner_id
          ).catch(() => null)
        : null;

      // Create notification for new practitioner
      await base44.asServiceRole.entities.Notification.create({
        notification_type: 'handover_ready',
        title: `New Client Assignment: ${clientName}`,
        message: `You have been assigned as primary practitioner for ${clientName}. A comprehensive handover summary has been generated to support your transition.`,
        priority: 'high',
        entity_type: 'Client',
        entity_id: clientId,
        is_read: false,
        action_url: `/ClientDetail?clientId=${clientId}`,
        metadata: JSON.stringify({
          from_practitioner: oldPractitioner?.full_name || 'None',
          to_practitioner: newPractitioner?.full_name || 'Unknown',
          handover_summary: handoverResponse.data.handover_summary
        })
      });

      // Send email to new practitioner
      if (newPractitioner?.email) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: newPractitioner.email,
          subject: `New Client Assignment: ${clientName}`,
          body: `
            <h2>Client Handover Notification</h2>
            <p>You have been assigned as the primary practitioner for <strong>${clientName}</strong>.</p>
            <p>A comprehensive AI-generated handover summary is available in the system.</p>
            <p><a href="${Deno.env.get('BASE_URL') || ''}/ClientDetail?clientId=${clientId}">View Client Profile</a></p>
            <hr/>
            <h3>Handover Summary Preview:</h3>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; white-space: pre-wrap;">
              ${handoverResponse.data.handover_summary.substring(0, 500)}...
            </div>
            <p style="margin-top: 20px;"><em>Full summary available in the client profile.</em></p>
          `
        });
      }

      return Response.json({
        success: true,
        message: 'Handover process triggered',
        handover_generated: true,
        notification_created: true
      });
    }

    return Response.json({
      success: false,
      message: 'Failed to generate handover summary'
    });

  } catch (error) {
    console.error('Handover trigger error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});