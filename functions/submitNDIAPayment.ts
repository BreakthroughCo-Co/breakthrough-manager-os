import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAdmin } from './_shared/requireRole.js';
import { validateRequest } from './_shared/requestValidator.js';
import { createRequestLogger } from './_shared/logger.js';

/**
 * Submit Payment Request to NDIA myplace
 * 
 * Automates claim submission to NDIS myplace portal.
 * Critical for cash flow and reducing administrative burden.
 * 
 * NDIS Compliance: Accurate service booking and claim submission
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
            required: ['payment_request_id'],
            types: {
                payment_request_id: 'string'
            }
        });
        
        const { payment_request_id } = payload;
        
        // Get payment request
        const paymentRequest = await base44.entities.NDIAPaymentRequest.get(payment_request_id);
        
        if (!paymentRequest) {
            return Response.json({ error: 'Payment request not found' }, { status: 404 });
        }
        
        if (paymentRequest.status !== 'ready_to_submit') {
            return Response.json({ 
                error: `Cannot submit: status is ${paymentRequest.status}` 
            }, { status: 400 });
        }
        
        logger.info('Submitting NDIA payment request', {
            payment_request_id,
            amount: paymentRequest.total_amount
        });
        
        // Prepare NDIA submission
        const ndiaSubmission = {
            participantNDISNumber: paymentRequest.ndis_number,
            serviceBookingNumber: paymentRequest.service_booking_number,
            supportItemNumber: paymentRequest.support_item_number,
            serviceDate: paymentRequest.service_date,
            hoursDelivered: paymentRequest.hours_claimed,
            rateCharged: paymentRequest.rate_claimed,
            totalAmount: paymentRequest.total_amount,
            providerABN: Deno.env.get('PROVIDER_ABN'),
            claimReference: paymentRequest.claim_reference
        };
        
        // IMPORTANT: In production, implement actual NDIA API integration
        // This is a placeholder showing the workflow structure
        
        // Simulated API call (replace with actual NDIA endpoint)
        // const ndiaResponse = await fetch('https://myplace.ndis.gov.au/api/claims/submit', {
        //     method: 'POST',
        //     headers: {
        //         'Authorization': `Bearer ${NDIA_ACCESS_TOKEN}`,
        //         'Content-Type': 'application/json'
        //     },
        //     body: JSON.stringify(ndiaSubmission)
        // });
        
        // For now, simulate success
        const mockSubmissionId = `NDIA-${Date.now()}`;
        
        // Update payment request
        await base44.entities.NDIAPaymentRequest.update(payment_request_id, {
            status: 'submitted',
            submission_date: new Date().toISOString(),
            submitted_by: user.email,
            myplace_submission_id: mockSubmissionId
        });
        
        logger.audit('ndia_payment_submitted', {
            payment_request_id,
            myplace_submission_id: mockSubmissionId,
            amount: paymentRequest.total_amount,
            client_id: paymentRequest.client_id
        });
        
        // Create task for follow-up
        await base44.entities.Task.create({
            title: `Monitor NDIA Payment - ${paymentRequest.client_name}`,
            description: `Track payment approval for claim ${paymentRequest.claim_reference}`,
            category: 'Finance',
            priority: 'medium',
            status: 'pending',
            due_date: new Date(Date.now() + 7*24*60*60*1000).toISOString(), // 7 days
            assigned_to: user.email,
            related_entity_type: 'NDIAPaymentRequest',
            related_entity_id: payment_request_id
        });
        
        return Response.json({
            success: true,
            submission_id: mockSubmissionId,
            message: 'Payment request submitted successfully',
            note: 'Production deployment requires NDIA API credentials'
        });
        
    } catch (error) {
        logger.error('NDIA payment submission failed', error);
        
        return Response.json({
            error: 'Submission failed',
            message: error.message
        }, { status: 500 });
    }
});