import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const XERO_CLIENT_ID = Deno.env.get('XERO_CLIENT_ID');
const XERO_CLIENT_SECRET = Deno.env.get('XERO_CLIENT_SECRET');
const XERO_TENANT_ID = Deno.env.get('XERO_TENANT_ID');
const XERO_REFRESH_TOKEN = Deno.env.get('XERO_REFRESH_TOKEN');

async function getXeroAccessToken() {
  if (!XERO_CLIENT_ID || !XERO_CLIENT_SECRET || !XERO_REFRESH_TOKEN) {
    throw new Error('Xero credentials not configured. Please set XERO_CLIENT_ID, XERO_CLIENT_SECRET, XERO_REFRESH_TOKEN, and XERO_TENANT_ID secrets.');
  }

  const response = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: XERO_REFRESH_TOKEN,
      client_id: XERO_CLIENT_ID,
      client_secret: XERO_CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Xero token refresh failed: ${err}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function xeroRequest(accessToken, path, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Xero-tenant-id': XERO_TENANT_ID,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`https://api.xero.com/api.xro/2.0${path}`, options);
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Xero API error (${response.status}): ${err}`);
  }
  return response.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { action } = body;

    // Check credentials configured
    if (!XERO_CLIENT_ID || !XERO_CLIENT_SECRET) {
      return Response.json({
        error: 'Xero not configured',
        setup_required: ['XERO_CLIENT_ID', 'XERO_CLIENT_SECRET', 'XERO_REFRESH_TOKEN', 'XERO_TENANT_ID'],
        message: 'Please set Xero API credentials in Settings → Environment Variables.',
      }, { status: 503 });
    }

    const accessToken = await getXeroAccessToken();

    if (action === 'get_accounts') {
      const data = await xeroRequest(accessToken, '/Accounts');
      return Response.json({ accounts: data.Accounts });
    }

    if (action === 'get_invoices') {
      const { status: invoiceStatus = 'AUTHORISED', page = 1 } = body;
      const data = await xeroRequest(accessToken, `/Invoices?Statuses=${invoiceStatus}&page=${page}`);
      return Response.json({ invoices: data.Invoices });
    }

    if (action === 'create_invoice') {
      const { billing_record_id } = body;
      if (!billing_record_id) return Response.json({ error: 'billing_record_id required' }, { status: 400 });

      const records = await base44.entities.BillingRecord.filter({ id: billing_record_id });
      const record = records[0];
      if (!record) return Response.json({ error: 'Billing record not found' }, { status: 404 });

      const invoice = {
        Type: 'ACCREC',
        Contact: { Name: record.client_name },
        Date: record.service_date,
        DueDate: record.service_date,
        LineItems: [{
          Description: `${record.service_type} — ${record.duration_hours}h`,
          Quantity: record.duration_hours,
          UnitAmount: record.rate || 0,
          AccountCode: '200',
          TaxType: 'NONE',
          LineItemID: record.ndis_line_item || undefined,
        }],
        Reference: record.invoice_number || `NDIS-${record.id.slice(0, 8)}`,
        Status: 'DRAFT',
      };

      const data = await xeroRequest(accessToken, '/Invoices', 'POST', { Invoices: [invoice] });
      const created = data.Invoices?.[0];

      // Update billing record with Xero invoice ID
      if (created?.InvoiceID) {
        await base44.entities.BillingRecord.update(billing_record_id, {
          invoice_number: created.InvoiceNumber || record.invoice_number,
          notes: `${record.notes || ''}\nXero Invoice ID: ${created.InvoiceID}`.trim(),
        });
      }

      return Response.json({ invoice: created });
    }

    if (action === 'get_bank_transactions') {
      const data = await xeroRequest(accessToken, '/BankTransactions?Status=AUTHORISED');
      return Response.json({ transactions: data.BankTransactions });
    }

    if (action === 'status') {
      const data = await xeroRequest(accessToken, '/Organisation');
      return Response.json({
        connected: true,
        organisation: data.Organisations?.[0]?.Name,
        tenant_id: XERO_TENANT_ID,
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});