import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAdmin } from './_shared/requireRole.js';
import { validateRequest } from './_shared/requestValidator.js';
import { createRequestLogger } from './_shared/logger.js';

/**
 * Handle Privacy Breach / NDB Assessment
 * 
 * Automates privacy breach response workflow including:
 * - Breach assessment against OAIC criteria
 * - Notification deadline tracking
 * - Automatic escalation for eligible data breaches
 * 
 * NDIS Compliance: Privacy Act, Notifiable Data Breaches scheme
 */

Deno.serve(async (req) => {
    const logger = createRequestLogger(req);
    
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        requireAdmin(user);
        
        const payload = await req.json();
        
        validateRequest(payload, {
            required: ['breach_type', 'description', 'discovery_date'],
            types: {
                breach_type: 'string',
                description: 'string',
                discovery_date: 'string',
                affected_individuals_count: 'number'
            },
            enums: {
                breach_type: ['data_breach', 'unauthorised_access', 'unauthorised_disclosure', 
                             'data_loss', 'system_compromise', 'other'],
                severity: ['critical', 'high', 'medium', 'low']
            },
            dates: ['discovery_date', 'breach_date']
        });
        
        const {
            breach_type,
            description,
            discovery_date,
            breach_date,
            affected_individuals_count = 0,
            affected_data_types = [],
            severity = 'medium'
        } = payload;
        
        logger.audit('privacy_breach_reported', {
            breach_type,
            severity,
            affected_individuals_count,
            reported_by: user.email
        });
        
        // AI-powered breach assessment
        const assessment = await base44.integrations.Core.InvokeLLM({
            prompt: `Assess this privacy breach against OAIC Notifiable Data Breaches criteria:
            
Breach Type: ${breach_type}
Description: ${description}
Affected Individuals: ${affected_individuals_count}
Data Types: ${affected_data_types.join(', ')}
Severity: ${severity}

Provide assessment in JSON format:
{
    "notifiable_under_ndb": boolean,
    "rationale": "explanation",
    "recommended_actions": ["action1", "action2"],
    "notification_urgency": "immediate/urgent/standard",
    "oaic_notification_required": boolean,
    "individual_notification_required": boolean
}`,
            response_json_schema: {
                type: 'object',
                properties: {
                    notifiable_under_ndb: { type: 'boolean' },
                    rationale: { type: 'string' },
                    recommended_actions: { type: 'array', items: { type: 'string' } },
                    notification_urgency: { type: 'string' },
                    oaic_notification_required: { type: 'boolean' },
                    individual_notification_required: { type: 'boolean' }
                }
            }
        });
        
        // Create breach record
        const breachRecord = await base44.asServiceRole.entities.PrivacyBreach.create({
            breach_id: `PB-${Date.now()}`,
            breach_type,
            severity,
            discovery_date,
            breach_date: breach_date || discovery_date,
            affected_individuals_count,
            affected_data_types,
            description,
            status: 'assessment_in_progress',
            notifiable_under_ndb: assessment.notifiable_under_ndb,
            investigated_by: user.email,
            responsible_party: user.email
        });
        
        // Create tasks for required actions
        const tasks = [];
        
        // Task 1: Immediate containment
        tasks.push(await base44.asServiceRole.entities.Task.create({
            title: `Contain Privacy Breach ${breachRecord.breach_id}`,
            description: `Immediate containment required for ${breach_type}`,
            category: 'Compliance',
            priority: 'urgent',
            status: 'pending',
            due_date: new Date(Date.now() + 3600000).toISOString(), // 1 hour
            assigned_to: user.email,
            related_entity_type: 'PrivacyBreach',
            related_entity_id: breachRecord.id
        }));
        
        // Task 2: OAIC notification if required
        if (assessment.oaic_notification_required) {
            const notificationDeadline = new Date(discovery_date);
            notificationDeadline.setDate(notificationDeadline.getDate() + 30); // 30 days
            
            tasks.push(await base44.asServiceRole.entities.Task.create({
                title: `OAIC Notification - ${breachRecord.breach_id}`,
                description: `Notify OAIC of eligible data breach (30-day deadline)`,
                category: 'Compliance',
                priority: 'urgent',
                status: 'pending',
                due_date: notificationDeadline.toISOString(),
                assigned_to: user.email,
                related_entity_type: 'PrivacyBreach',
                related_entity_id: breachRecord.id
            }));
        }
        
        // Task 3: Individual notifications if required
        if (assessment.individual_notification_required) {
            tasks.push(await base44.asServiceRole.entities.Task.create({
                title: `Notify Affected Individuals - ${breachRecord.breach_id}`,
                description: `Notify ${affected_individuals_count} affected individuals`,
                category: 'Compliance',
                priority: 'high',
                status: 'pending',
                due_date: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days
                assigned_to: user.email,
                related_entity_type: 'PrivacyBreach',
                related_entity_id: breachRecord.id
            }));
        }
        
        logger.audit('privacy_breach_assessment_completed', {
            breach_id: breachRecord.id,
            notifiable: assessment.notifiable_under_ndb,
            tasks_created: tasks.length
        });
        
        return Response.json({
            success: true,
            breach_id: breachRecord.id,
            breach_reference: breachRecord.breach_id,
            assessment: assessment,
            tasks_created: tasks.length,
            recommended_actions: assessment.recommended_actions
        });
        
    } catch (error) {
        logger.error('Privacy breach handling failed', error);
        
        return Response.json({
            error: 'Breach handling failed',
            message: error.message
        }, { status: error.statusCode || 500 });
    }
});