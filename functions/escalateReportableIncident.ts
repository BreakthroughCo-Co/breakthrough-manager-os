import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createRequestLogger } from './_shared/logger.js';

/**
 * Escalate Reportable Incidents
 * 
 * Automation: Monitors incidents and escalates if not reported within deadlines
 * - 24 hours for serious incidents
 * - 5 days for other reportable incidents
 * 
 * NDIS Compliance: Critical compliance requirement
 */

Deno.serve(async (req) => {
    const logger = createRequestLogger(req);
    
    try {
        const base44 = createClientFromRequest(req);
        
        // This function is called by automation, so we use service role
        const { event, data } = await req.json();
        
        if (!data || !data.id) {
            logger.warn('Invalid incident data received');
            return Response.json({ success: false });
        }
        
        const incident = data;
        
        // Only process reportable incidents
        if (!incident.reportable_to_commission) {
            return Response.json({ success: true, message: 'Not reportable' });
        }
        
        // Check if already reported
        if (incident.commission_notified) {
            return Response.json({ success: true, message: 'Already reported' });
        }
        
        const now = new Date();
        const incidentDate = new Date(incident.incident_date);
        const hoursSinceIncident = (now - incidentDate) / (1000 * 60 * 60);
        
        // Determine escalation urgency
        let escalate = false;
        let escalationReason = '';
        
        if (incident.severity === 'critical' && hoursSinceIncident >= 24) {
            escalate = true;
            escalationReason = 'Critical incident not reported within 24-hour deadline';
        } else if (incident.severity === 'major' && hoursSinceIncident >= 120) {
            // 5 days
            escalate = true;
            escalationReason = 'Major incident not reported within 5-day deadline';
        }
        
        if (!escalate) {
            return Response.json({ success: true, message: 'Within reporting window' });
        }
        
        logger.audit('incident_deadline_breach', {
            incident_id: incident.id,
            severity: incident.severity,
            hours_since_incident: hoursSinceIncident,
            reason: escalationReason
        });
        
        // Create urgent task for manager
        await base44.asServiceRole.entities.Task.create({
            title: `URGENT: Reportable Incident Deadline Breach - ${incident.incident_type}`,
            description: `${escalationReason}

Incident: ${incident.incident_type}
Client: ${incident.client_name || 'Unknown'}
Date: ${incident.incident_date}
Severity: ${incident.severity}

Action Required: Submit incident report to NDIS Commission immediately.`,
            category: 'Compliance',
            priority: 'urgent',
            status: 'pending',
            due_date: new Date(now.getTime() + 3600000).toISOString(), // 1 hour
            related_entity_type: 'Incident',
            related_entity_id: incident.id
        });
        
        // Send email notification
        await base44.integrations.Core.SendEmail({
            to: Deno.env.get('COMPLIANCE_EMAIL') || 'admin@breakthrough-coaching.com.au',
            subject: `URGENT: Reportable Incident Deadline Breach`,
            body: `A reportable incident has not been submitted within the required timeframe.

Incident ID: ${incident.id}
Type: ${incident.incident_type}
Severity: ${incident.severity}
Date: ${incident.incident_date}
Hours Since Incident: ${hoursSinceIncident.toFixed(1)}

Immediate action required to maintain NDIS compliance.

View incident: [Link to incident detail page]`
        });
        
        logger.info('Incident escalation completed', {
            incident_id: incident.id,
            hours_overdue: hoursSinceIncident - (incident.severity === 'critical' ? 24 : 120)
        });
        
        return Response.json({
            success: true,
            escalated: true,
            reason: escalationReason
        });
        
    } catch (error) {
        logger.error('Incident escalation failed', error);
        
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});