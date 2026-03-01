import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch Xero access token
    const xeroToken = await base44.asServiceRole.connectors.getAccessToken('xero');
    if (!xeroToken) {
      return Response.json({ error: 'Xero not configured. Authorize in settings.' }, { status: 400 });
    }

    // Fetch base44 financial data
    const billingRecords = await base44.entities.BillingRecord.list();
    const ndisClaims = await base44.entities.NDISClaimData.list();
    const paidClaims = ndisClaims.filter(c => c.status === 'paid');

    // Fetch Xero invoices via REST API
    const xeroInvoices = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
      headers: {
        'Authorization': `Bearer ${xeroToken}`,
        'Accept': 'application/json'
      }
    }).then(r => r.json());

    // Fetch Xero bank transactions
    const xeroBankTransactions = await fetch('https://api.xero.com/api.xro/2.0/BankTransactions', {
      headers: {
        'Authorization': `Bearer ${xeroToken}`,
        'Accept': 'application/json'
      }
    }).then(r => r.json());

    const reconciliationResults = {
      matched_invoices: 0,
      unmatched_base44_records: [],
      unmatched_xero_invoices: [],
      income_variance: 0,
      expense_variance: 0
    };

    // Match base44 billing to Xero invoices
    billingRecords.forEach(br => {
      const xeroMatch = xeroInvoices.Invoices?.find(xi =>
        xi.LineItems?.[0]?.Description?.includes(br.client_name) &&
        Math.abs(xi.Total - br.total_amount) < 1
      );

      if (xeroMatch) {
        reconciliationResults.matched_invoices++;
      } else if (br.status === 'submitted' || br.status === 'paid') {
        reconciliationResults.unmatched_base44_records.push({
          billing_record_id: br.id,
          client_name: br.client_name,
          service_date: br.service_date,
          amount: br.total_amount,
          status: br.status
        });
      }
    });

    // Check for unmatched Xero invoices (potential income not recorded in base44)
    xeroInvoices.Invoices?.forEach(xi => {
      const base44Match = billingRecords.find(br =>
        br.client_name && xi.LineItems?.[0]?.Description?.includes(br.client_name) &&
        Math.abs(xi.Total - br.total_amount) < 1
      );

      if (!base44Match && xi.Status === 'AUTHORISED') {
        reconciliationResults.unmatched_xero_invoices.push({
          invoice_id: xi.InvoiceID,
          reference: xi.InvoiceNumber,
          description: xi.LineItems?.[0]?.Description,
          amount: xi.Total,
          date: xi.InvoiceDate
        });
      }
    });

    // Calculate variance (base44 invoiced vs Xero recorded income)
    const base44Total = billingRecords.reduce((sum, br) => sum + (br.total_amount || 0), 0);
    const xeroTotal = xeroInvoices.Invoices?.reduce((sum, xi) => sum + (xi.Total || 0), 0) || 0;
    reconciliationResults.income_variance = xeroTotal - base44Total;

    // Fetch Xero expense accounts for compliance check
    const xeroAccounts = await fetch('https://api.xero.com/api.xro/2.0/Accounts', {
      headers: {
        'Authorization': `Bearer ${xeroToken}`,
        'Accept': 'application/json'
      }
    }).then(r => r.json());

    // Identify potential non-NDIS compliant expenses
    const complianceFlags = [];
    xeroBankTransactions.BankTransactions?.forEach(tx => {
      if (tx.LineItems?.some(li => 
        li.Description?.toLowerCase().includes('marketing') ||
        li.Description?.toLowerCase().includes('entertainment') ||
        li.Description?.toLowerCase().includes('discretionary')
      )) {
        complianceFlags.push({
          transaction_id: tx.BankTransactionID,
          date: tx.DateString,
          description: tx.LineItems?.[0]?.Description,
          amount: tx.LineItems?.reduce((sum, li) => sum + (li.LineAmount || 0), 0),
          flag: 'Potential non-NDIS compliant expense. Verify allocation to practice overhead.'
        });
      }
    });

    return Response.json({
      reconciliation_timestamp: new Date().toISOString(),
      matched_invoices: reconciliationResults.matched_invoices,
      total_base44_records: billingRecords.length,
      unmatched_base44_records: reconciliationResults.unmatched_base44_records.length,
      unmatched_xero_invoices: reconciliationResults.unmatched_xero_invoices.length,
      income_variance: reconciliationResults.income_variance,
      expense_flags: complianceFlags.length,
      details: {
        unmatched_base44: reconciliationResults.unmatched_base44_records.slice(0, 10),
        unmatched_xero: reconciliationResults.unmatched_xero_invoices.slice(0, 10),
        compliance_flags: complianceFlags.slice(0, 10)
      },
      reconciliation_status: reconciliationResults.unmatched_base44_records.length === 0 && reconciliationResults.unmatched_xero_invoices.length === 0 ? 'complete' : 'requires_review'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});