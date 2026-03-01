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

// Xero Payroll API uses a different base URL
async function xeroPayrollRequest(accessToken, path) {
  const response = await fetch(`https://api.xero.com/payroll.xro/1.0${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Xero-tenant-id': XERO_TENANT_ID,
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Xero Payroll API error (${response.status}): ${err}`);
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

    if (!XERO_CLIENT_ID || !XERO_CLIENT_SECRET) {
      return Response.json({
        connected: false,
        setup_required: true,
        missing: ['XERO_CLIENT_ID', 'XERO_CLIENT_SECRET', 'XERO_REFRESH_TOKEN', 'XERO_TENANT_ID'],
      }, { status: 503 });
    }

    const accessToken = await getXeroAccessToken();

    // ── Connection status ──────────────────────────────────────────────
    if (action === 'status') {
      const data = await xeroRequest(accessToken, '/Organisation');
      return Response.json({
        connected: true,
        organisation: data.Organisations?.[0]?.Name,
        tenant_id: XERO_TENANT_ID,
      });
    }

    // ── Accounts ───────────────────────────────────────────────────────
    if (action === 'get_accounts') {
      const data = await xeroRequest(accessToken, '/Accounts');
      return Response.json({ accounts: data.Accounts });
    }

    // ── Invoices ───────────────────────────────────────────────────────
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
        }],
        Reference: record.invoice_number || `NDIS-${record.id.slice(0, 8)}`,
        Status: 'DRAFT',
      };
      const data = await xeroRequest(accessToken, '/Invoices', 'POST', { Invoices: [invoice] });
      const created = data.Invoices?.[0];
      if (created?.InvoiceID) {
        await base44.entities.BillingRecord.update(billing_record_id, {
          invoice_number: created.InvoiceNumber || record.invoice_number,
          notes: `${record.notes || ''}\nXero Invoice ID: ${created.InvoiceID}`.trim(),
        });
      }
      return Response.json({ invoice: created });
    }

    // ── Bank Transactions ──────────────────────────────────────────────
    if (action === 'get_bank_transactions') {
      const { status: txStatus = 'AUTHORISED', bank_account_id } = body;
      let path = `/BankTransactions?Status=${txStatus}`;
      if (bank_account_id) path += `&BankAccountID=${bank_account_id}`;
      const data = await xeroRequest(accessToken, path);
      return Response.json({ transactions: data.BankTransactions });
    }

    // ── Bank Reconciliation Summary ────────────────────────────────────
    if (action === 'get_reconciliation_summary') {
      // Fetches unreconciled bank transactions for management overview
      const [authData, unreconData] = await Promise.all([
        xeroRequest(accessToken, '/BankTransactions?Status=AUTHORISED'),
        xeroRequest(accessToken, '/BankTransactions?Status=DELETED'),
      ]);

      const authorised = authData.BankTransactions || [];

      // Group by bank account
      const byAccount = {};
      for (const tx of authorised) {
        const acctId = tx.BankAccount?.AccountID || 'unknown';
        const acctName = tx.BankAccount?.Name || 'Unknown Account';
        if (!byAccount[acctId]) {
          byAccount[acctId] = { account_id: acctId, account_name: acctName, total: 0, count: 0, transactions: [] };
        }
        byAccount[acctId].total += tx.Total || 0;
        byAccount[acctId].count += 1;
        byAccount[acctId].transactions.push({
          id: tx.BankTransactionID,
          date: tx.Date,
          type: tx.Type,
          total: tx.Total,
          reference: tx.Reference,
          is_reconciled: tx.IsReconciled,
          contact: tx.Contact?.Name,
        });
      }

      const unreconciled = authorised.filter(tx => !tx.IsReconciled);

      return Response.json({
        total_transactions: authorised.length,
        unreconciled_count: unreconciled.length,
        unreconciled_total: unreconciled.reduce((s, tx) => s + (tx.Total || 0), 0),
        by_account: Object.values(byAccount),
      });
    }

    // ── Profit & Loss Report ───────────────────────────────────────────
    if (action === 'get_profit_loss') {
      const { from_date, to_date } = body;
      // Default to current financial year if not specified
      const now = new Date();
      const fyStart = now.getMonth() >= 6
        ? `${now.getFullYear()}-07-01`
        : `${now.getFullYear() - 1}-07-01`;
      const fyEnd = now.getMonth() >= 6
        ? `${now.getFullYear() + 1}-06-30`
        : `${now.getFullYear()}-06-30`;

      const fromDate = from_date || fyStart;
      const toDate = to_date || fyEnd;

      const data = await xeroRequest(
        accessToken,
        `/Reports/ProfitAndLoss?fromDate=${fromDate}&toDate=${toDate}&standardLayout=true`
      );

      return Response.json({
        report: data.Reports?.[0] || null,
        period: { from: fromDate, to: toDate },
      });
    }

    // ── Balance Sheet ──────────────────────────────────────────────────
    if (action === 'get_balance_sheet') {
      const { as_of_date } = body;
      const date = as_of_date || new Date().toISOString().split('T')[0];
      const data = await xeroRequest(accessToken, `/Reports/BalanceSheet?date=${date}&standardLayout=true`);
      return Response.json({ report: data.Reports?.[0] || null, as_of: date });
    }

    // ── Trial Balance ──────────────────────────────────────────────────
    if (action === 'get_trial_balance') {
      const { as_of_date } = body;
      const date = as_of_date || new Date().toISOString().split('T')[0];
      const data = await xeroRequest(accessToken, `/Reports/TrialBalance?date=${date}`);
      return Response.json({ report: data.Reports?.[0] || null, as_of: date });
    }

    // ── Payroll: Pay Runs ──────────────────────────────────────────────
    if (action === 'get_pay_runs') {
      const { status: prStatus = 'POSTED' } = body;
      const data = await xeroPayrollRequest(accessToken, `/PayRuns?PayRunStatus=${prStatus}`);
      return Response.json({ pay_runs: data.PayRuns });
    }

    // ── Payroll: Employees ─────────────────────────────────────────────
    if (action === 'get_employees') {
      const data = await xeroPayrollRequest(accessToken, '/Employees');
      return Response.json({ employees: data.Employees });
    }

    // ── Payroll: Payslips for a pay run ───────────────────────────────
    if (action === 'get_payslips') {
      const { pay_run_id } = body;
      if (!pay_run_id) return Response.json({ error: 'pay_run_id required' }, { status: 400 });
      const data = await xeroPayrollRequest(accessToken, `/Payslip?PayRunID=${pay_run_id}`);
      return Response.json({ payslips: data.Payslips });
    }

    // ── Bank Statements (for reconciliation feed) ──────────────────────
    if (action === 'get_bank_statements') {
      const { bank_account_id, from_date, to_date } = body;
      if (!bank_account_id) return Response.json({ error: 'bank_account_id required' }, { status: 400 });
      const now = new Date();
      const from = from_date || new Date(now.setDate(now.getDate() - 30)).toISOString().split('T')[0];
      const to = to_date || new Date().toISOString().split('T')[0];
      const data = await xeroRequest(
        accessToken,
        `/BankTransactions?where=BankAccount.AccountID=Guid("${bank_account_id}")&fromDate=${from}&toDate=${to}`
      );
      return Response.json({ statements: data.BankTransactions, period: { from, to } });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});