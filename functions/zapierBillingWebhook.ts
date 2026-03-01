/**
 * Zapier Webhook: 17hats Invoice Status Change → BillingRecord Update
 *
 * Configure in Zapier:
 *   Trigger: 17hats > Invoice Updated (filter status = Paid or Past Due)
 *   Action: Webhooks by Zapier > POST to this function URL
 *
 * Zapier field mapping:
 *   invoice_id   → matched against BillingRecord.invoice_number
 *   amount_paid  → total_amount
 *   date_paid    → service_date
 *   status       → status (mapped: paid → paid, past_due → queried)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  const body = await req.json();

  const { invoice_id, amount_paid, date_paid, status } = body;

  if (!invoice_id) {
    return Response.json({ error: 'invoice_id is required' }, { status: 400 });
  }

  const statusMap = {
    paid: 'paid',
    past_due: 'queried',
    overdue: 'queried',
    void: 'rejected'
  };

  const mappedStatus = statusMap[status?.toLowerCase()] || 'submitted';

  // Find BillingRecord by invoice_number
  const records = await base44.asServiceRole.entities.BillingRecord.filter({
    invoice_number: invoice_id
  });

  if (!records || records.length === 0) {
    // Log for audit — do not silently fail
    return Response.json({
      success: false,
      message: `No BillingRecord found for invoice_id: ${invoice_id}`
    }, { status: 404 });
  }

  const record = records[0];

  const updatePayload = {
    status: mappedStatus
  };

  if (amount_paid !== undefined) updatePayload.total_amount = parseFloat(amount_paid);
  if (date_paid) updatePayload.service_date = date_paid;
  if (status) updatePayload.notes = `17hats status sync: ${status} on ${date_paid || 'unknown date'}`;

  await base44.asServiceRole.entities.BillingRecord.update(record.id, updatePayload);

  return Response.json({
    success: true,
    message: `BillingRecord ${record.id} updated to status: ${mappedStatus}`
  }, { status: 200 });
});