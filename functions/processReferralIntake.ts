import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { validateRequest } from './_shared/requestValidator.js';
import { createRequestLogger } from './_shared/logger.js';

/**
 * Process Referral Intake
 * 
 * Automated referral screening and assignment workflow.
 * Reduces manual intake processing and ensures timely response.
 * 
 * NDIS Compliance: Proper intake documentation and service matching
 */

Deno.serve(async (req) => {
    const logger = createRequestLogger(req);
    
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const payload = await req.json();
        
        validateRequest(payload, {
            required: ['referral_id'],
            types: {
                referral_id: 'string',
                action: 'string'
            },
            enums: {
                action: ['screen', 'accept', 'decline', 'waitlist']
            }
        });
        
        const { referral_id, action, notes } = payload;
        
        const referral = await base44.entities.ReferralIntake.get(referral_id);
        
        if (!referral) {
            return Response.json({ error: 'Referral not found' }, { status: 404 });
        }
        
        logger.info('Processing referral', { referral_id, action });
        
        if (action === 'screen') {
            // AI-powered referral screening
            const screening = await base44.integrations.Core.InvokeLLM({
                prompt: `Screen this NDIS referral for service suitability:

Participant: ${referral.participant_name}
Service Requested: ${referral.service_requested}
Referral Reason: ${referral.referral_reason}
Urgency: ${referral.urgency}
Funding Available: $${referral.funding_available || 'Unknown'}

Provide screening assessment in JSON format:
{
    "suitable": boolean,
    "rationale": "explanation",
    "recommended_service": "service type",
    "recommended_practitioner_skills": ["skill1", "skill2"],
    "capacity_check_required": boolean,
    "funding_adequacy": "adequate/insufficient/unclear",
    "priority_score": 0-100,
    "suggested_next_steps": ["step1", "step2"]
}`,
                response_json_schema: {
                    type: 'object',
                    properties: {
                        suitable: { type: 'boolean' },
                        rationale: { type: 'string' },
                        recommended_service: { type: 'string' },
                        recommended_practitioner_skills: { type: 'array', items: { type: 'string' } },
                        capacity_check_required: { type: 'boolean' },
                        funding_adequacy: { type: 'string' },
                        priority_score: { type: 'number' },
                        suggested_next_steps: { type: 'array', items: { type: 'string' } }
                    }
                }
            });
            
            // Update referral with screening results
            await base44.entities.ReferralIntake.update(referral_id, {
                status: 'screening',
                assigned_to: user.email,
                notes: `AI Screening:\n${screening.rationale}\n\nNext Steps:\n${screening.suggested_next_steps.join('\n')}`
            });
            
            return Response.json({
                success: true,
                screening: screening,
                recommended_action: screening.suitable ? 'accept' : 'review_required'
            });
        }
        
        if (action === 'accept') {
            // Create client record
            const client = await base44.entities.Client.create({
                full_name: referral.participant_name,
                ndis_number: referral.participant_ndis_number,
                date_of_birth: referral.participant_dob,
                primary_contact_name: referral.contact_name,
                primary_contact_phone: referral.contact_phone,
                primary_contact_email: referral.contact_email,
                plan_start_date: referral.plan_start_date,
                plan_end_date: referral.plan_end_date,
                funding_allocated: referral.funding_available,
                status: 'active',
                service_type: referral.service_requested,
                notes: `Converted from referral: ${referral_id}`
            });
            
            // Update referral
            await base44.entities.ReferralIntake.update(referral_id, {
                status: 'converted',
                converted_client_id: client.id,
                notes: notes || 'Accepted and converted to active client'
            });
            
            // Create onboarding task
            await base44.entities.Task.create({
                title: `Client Onboarding - ${client.full_name}`,
                description: `Complete onboarding for new client from referral`,
                category: 'HR',
                priority: 'high',
                status: 'pending',
                due_date: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
                assigned_to: user.email,
                related_entity_type: 'Client',
                related_entity_id: client.id
            });
            
            logger.audit('referral_accepted', {
                referral_id,
                client_id: client.id,
                participant_name: client.full_name
            });
            
            return Response.json({
                success: true,
                client_id: client.id,
                message: 'Referral accepted and client created'
            });
        }
        
        if (action === 'decline') {
            await base44.entities.ReferralIntake.update(referral_id, {
                status: 'declined',
                decline_reason: notes || 'Service not suitable',
                assigned_to: user.email
            });
            
            logger.audit('referral_declined', { referral_id });
            
            return Response.json({
                success: true,
                message: 'Referral declined'
            });
        }
        
        if (action === 'waitlist') {
            await base44.entities.ReferralIntake.update(referral_id, {
                status: 'waitlist',
                notes: notes || 'Added to waitlist',
                assigned_to: user.email
            });
            
            return Response.json({
                success: true,
                message: 'Referral added to waitlist'
            });
        }
        
        return Response.json({ error: 'Invalid action' }, { status: 400 });
        
    } catch (error) {
        logger.error('Referral processing failed', error);
        
        return Response.json({
            error: 'Processing failed',
            message: error.message
        }, { status: 500 });
    }
});