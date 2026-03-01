/**
 * PRODA Bulk Upload File Generator
 * Compiles active BillingRecords into a PRODA-compatible CSV structure.
 * Admin only — returns a CSV download.
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

  const body = await req.json();
  const { month, year } = body;

  // Fetch draft/submitted billing records
  const records = await base44.asServiceRole.entities.BillingRecord.filter({ status: 'submitted' });
  const clients = await base44.asServiceRole.entities.Client.list();
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));

  if (!records || records.length === 0) {
    return Response.json({ error: 'No submitted billing records found' }, { status: 404 });
  }

  // PRODA bulk payment request CSV headers
  const headers = [
    'RegistrationNumber',
    'NDISNumber',
    'SupportsDeliveredFrom',
    'SupportsDeliveredTo',
    'SupportNumber',
    'ClaimReference',
    'Quantity',
    'Hours',
    'UnitPrice',
    'GSTCode',
    'AuthorisedBy',
    'ParticipantApproved',
    'InKindFundingProgram',
    'CancellationReason',
    'ABN',
    'ClaimType',
    'TrackingNumber',
  ];

  const rows = records.map(r => {
    const client = clientMap[r.client_id] || {};
    const from = r.service_date || '';
    const to = r.service_date || '';
    const hours = r.duration_hours || 0;
    const rate = r.rate || 0;
    const supportNo = r.ndis_line_item || 'CB_DS_DAILY_HIGH';

    return [
      '', // RegistrationNumber — provider fills in
      client.ndis_number || '',
      from,
      to,
      supportNo,
      r.invoice_number || r.id.slice(0, 8),
      1, // Quantity
      hours,
      rate,
      'P1', // GST free for NDIS
      '', // AuthorisedBy
      'Y',
      '',
      '',
      '', // ABN — provider fills in
      'NDIS',
      '',
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename=PRODA_Bulk_Upload_${year || ''}_${month || ''}.csv`,
    },
  });
});