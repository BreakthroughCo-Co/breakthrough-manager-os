import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAdmin } from './_shared/requireRole.js';
import { validateRequest } from './_shared/requestValidator.js';
import { createRequestLogger } from './_shared/logger.js';

/**
 * Sync Invoices with Xero
 * 
 * Automates invoice creation in Xero from billing records.
 * Eliminates manual data entry and ensures accuracy.
 * 
 * NDIS Compliance: Maintains financial audit trail
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
        const { billing_record_ids } = payload;
        
        if (!billing_record_ids || !Array.isArray(billing_record_ids)) {
            return Response.json({ 
                error: 'billing_record_ids array required' 
            }, { status: 400 });
        }
        
        const XERO_CLIENT_ID = Deno.env.get('XERO_CLIENT_ID');
        const XERO_CLIENT_SECRET = Deno.env.get('XERO_CLIENT_SECRET');
        const XERO_TENANT_ID = Deno.env.get('XERO_TENANT_ID');
        
        if (!XERO_CLIENT_ID || !XERO_CLIENT_SECRET || !XERO_TENANT_ID) {
            return Response.json({ 
                error: 'Xero credentials not configured' 
            }, { status: 500 });
        }
        
        logger.info('Starting Xero invoice sync', { 
            count: billing_record_ids.length 
        });
        
        const results = [];
        let successCount = 0;
        let errorCount = 0;
        
        for (const recordId of billing_record_ids) {
            try {
                const billingRecord = await base44.entities.BillingRecord.get(recordId);
                
                if (!billingRecord) {
                    results.push({ id: recordId, status: 'error', message: 'Record not found' });
                    errorCount++;
                    continue;
                }
                
                // Get client details
                const client = await base44.entities.Client.get(billingRecord.client_id);
                
                // Prepare Xero invoice data
                const xeroInvoice = {
                    Type: 'ACCREC', // Accounts Receivable
                    Contact: {
                        Name: client?.full_name || billingRecord.client_name,
                        EmailAddress: client?.primary_contact_email
                    },
                    LineItems: [{
                        Description: `${billingRecord.service_type} - ${billingRecord.service_date}`,
                        Quantity: billingRecord.duration_hours || 1,
                        UnitAmount: billingRecord.rate || 0,
                        AccountCode: '200', // Revenue account
                        TaxType: 'NONE' // NDIS services are GST-free
                    }],
                    Date: billingRecord.service_date,
                    DueDate: new Date(new Date(billingRecord.service_date).getTime() + 30*24*60*60*1000).toISOString().split('T')[0],
                    Reference: billingRecord.invoice_number || `BR-${billingRecord.id}`,
                    Status: 'DRAFT'
                };
                
                // Call Xero API
                // Note: In production, implement OAuth 2.0 token management
                const xeroResponse = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${XERO_ACCESS_TOKEN}`, // Implement token refresh
                        'Xero-Tenant-Id': XERO_TENANT_ID,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ Invoices: [xeroInvoice] })
                });
                
                if (!xeroResponse.ok) {
                    throw new Error(`Xero API error: ${xeroResponse.status}`);
                }
                
                const xeroData = await xeroResponse.json();
                const xeroInvoiceId = xeroData.Invoices?.[0]?.InvoiceID;
                
                // Update billing record with Xero reference
                await base44.entities.BillingRecord.update(recordId, {
                    xero_invoice_id: xeroInvoiceId,
                    xero_synced_date: new Date().toISOString()
                });
                
                results.push({ 
                    id: recordId, 
                    status: 'success', 
                    xero_invoice_id: xeroInvoiceId 
                });
                successCount++;
                
                logger.audit('xero_invoice_created', {
                    billing_record_id: recordId,
                    xero_invoice_id: xeroInvoiceId,
                    amount: billingRecord.total_amount
                });
                
            } catch (error) {
                logger.error('Failed to sync invoice', error, { record_id: recordId });
                results.push({ 
                    id: recordId, 
                    status: 'error', 
                    message: error.message 
                });
                errorCount++;
            }
        }
        
        logger.info('Xero sync completed', { 
            success: successCount, 
            errors: errorCount 
        });
        
        return Response.json({
            success: true,
            results: results,
            summary: {
                total: billing_record_ids.length,
                success: successCount,
                errors: errorCount
            }
        });
        
    } catch (error) {
        logger.error('Xero sync failed', error);
        
        return Response.json({
            error: 'Sync failed',
            message: error.message
        }, { status: 500 });
    }
});