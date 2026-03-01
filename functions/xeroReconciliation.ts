import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function getXeroToken() {
  const clientId = Deno.env.get('XERO_CLIENT_ID');
  const clientSecret = Deno.env.get('XERO_CLIENT_SECRET');
  const refreshToken = Deno.env.get('XERO_REFRESH_TOKEN');

  const res = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`)
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });

  const data = await res.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const tenantId = Deno.env.get('XERO_TENANT_ID');
    const accessToken = await getXeroToken();

    // Fetch Xero invoices (AUTHORISED and PAID)
    const invoicesRes = await fetch(
      'https://api.xero.com/api.xro/2.0/Invoices?Statuses=AUTHORISED,PAID&Type=ACCREC',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Xero-Tenant-Id': tenantId,
          'Accept': 'application/json'
        }
      }
    );
    const invoicesData = await invoicesRes.json();
    const xeroInvoices = invoicesData.Invoices || [];

    // Fetch internal billing records
    const billingRecords = await base44.asServiceRole.entities.BillingRecord.list();
    const clients = await base44.asServiceRole.entities.Client.list();

    const discrepancies = [];
    const matched = [];

    for (const invoice of xeroInvoices) {
      const invoiceAmount = invoice.AmountDue || invoice.Total || 0;
      const contactName = invoice.Contact?.Name || '';

      // Attempt match by client name and amount
      const matchedClient = clients.find(c =>
        contactName.toLowerCase().includes(c.full_name?.toLowerCase()) ||
        c.full_name?.toLowerCase().includes(contactName.toLowerCase())
      );

      if (!matchedClient) {
        discrepancies.push({
          type: 'unmatched_invoice',
          xero_invoice_id: invoice.InvoiceID,
          xero_invoice_number: invoice.InvoiceNumber,
          xero_contact: contactName,
          xero_amount: invoiceAmount,
          xero_status: invoice.Status,
          xero_date: invoice.DateString,
          resolution_suggestion: `No matching Client record found for Xero contact "${contactName}". Verify client name alignment or create missing client record.`
        });
        continue;
      }

      // Match against billing records for this client
      const clientBilling = billingRecords.filter(b => b.client_id === matchedClient.id);
      const totalBilled = clientBilling
        .filter(b => ['submitted', 'paid'].includes(b.status))
        .reduce((sum, b) => sum + (b.total_amount || 0), 0);

      const variance = Math.abs(invoiceAmount - totalBilled);
      const variancePct = totalBilled > 0 ? (variance / totalBilled) * 100 : 100;

      if (variancePct > 5) {
        discrepancies.push({
          type: 'amount_variance',
          client_id: matchedClient.id,
          client_name: matchedClient.full_name,
          xero_invoice_id: invoice.InvoiceID,
          xero_invoice_number: invoice.InvoiceNumber,
          xero_amount: invoiceAmount,
          internal_billed: totalBilled,
          variance,
          variance_pct: Math.round(variancePct),
          xero_status: invoice.Status,
          resolution_suggestion: variancePct > 5
            ? `Variance of $${variance.toFixed(2)} (${Math.round(variancePct)}%) detected. Review billing records for ${matchedClient.full_name} — check for unbilled sessions, rate discrepancies, or rejected claims not resubmitted.`
            : null
        });
      } else {
        matched.push({
          client_id: matchedClient.id,
          client_name: matchedClient.full_name,
          xero_invoice_id: invoice.InvoiceID,
          xero_amount: invoiceAmount,
          internal_billed: totalBilled,
          variance_pct: Math.round(variancePct)
        });
      }
    }

    // AI analysis for discrepancy resolution
    let ai_resolution_report = null;
    if (discrepancies.length > 0) {
      ai_resolution_report = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an NDIS financial compliance officer. Analyse these Xero reconciliation discrepancies and provide specific, actionable resolution pathways for each.

Discrepancies:
${JSON.stringify(discrepancies, null, 2)}

For each discrepancy, provide: root_cause (most probable cause), priority (high/medium/low), corrective_action (specific steps), and prevention_measure.

Return as JSON object with key "resolutions" as an array matching the discrepancy order.`,
        response_json_schema: {
          type: 'object',
          properties: {
            resolutions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  root_cause: { type: 'string' },
                  priority: { type: 'string' },
                  corrective_action: { type: 'string' },
                  prevention_measure: { type: 'string' }
                }
              }
            }
          }
        }
      });

      // Merge AI resolutions into discrepancy objects
      if (ai_resolution_report?.resolutions) {
        discrepancies.forEach((d, i) => {
          d.ai_analysis = ai_resolution_report.resolutions[i] || null;
        });
      }
    }

    return Response.json({
      success: true,
      summary: {
        total_xero_invoices: xeroInvoices.length,
        matched: matched.length,
        discrepancies: discrepancies.length,
        total_variance: discrepancies.reduce((sum, d) => sum + (d.variance || 0), 0)
      },
      discrepancies,
      matched,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});