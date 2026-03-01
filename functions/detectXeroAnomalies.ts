import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch Xero token
    const xeroToken = await base44.asServiceRole.connectors.getAccessToken('xero');
    if (!xeroToken) {
      return Response.json({ error: 'Xero not configured.' }, { status: 400 });
    }

    // Fetch Xero data
    const xeroBankTransactions = await fetch('https://api.xero.com/api.xro/2.0/BankTransactions', {
      headers: {
        'Authorization': `Bearer ${xeroToken}`,
        'Accept': 'application/json'
      }
    }).then(r => r.json());

    const xeroInvoices = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
      headers: {
        'Authorization': `Bearer ${xeroToken}`,
        'Accept': 'application/json'
      }
    }).then(r => r.json());

    const anomalies = [];

    // 1. UNUSUAL TRANSACTION AMOUNTS (outliers 3x+ avg)
    if (xeroBankTransactions.BankTransactions?.length > 0) {
      const amounts = xeroBankTransactions.BankTransactions.map(tx => 
        tx.LineItems?.reduce((sum, li) => sum + Math.abs(li.LineAmount || 0), 0) || 0
      );
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const stdDev = Math.sqrt(amounts.reduce((sq, n) => sq + Math.pow(n - avgAmount, 2), 0) / amounts.length);

      xeroBankTransactions.BankTransactions.forEach(tx => {
        const txAmount = tx.LineItems?.reduce((sum, li) => sum + Math.abs(li.LineAmount || 0), 0) || 0;
        if (txAmount > avgAmount + (3 * stdDev)) {
          anomalies.push({
            type: 'unusual_amount',
            severity: 'high',
            transaction_id: tx.BankTransactionID,
            date: tx.DateString,
            description: tx.LineItems?.[0]?.Description,
            amount: txAmount,
            average_transaction: Math.round(avgAmount),
            deviation: Math.round(txAmount - avgAmount),
            message: `Transaction amount $${txAmount} is ${Math.round((txAmount / avgAmount) * 100)}% above average.`
          });
        }
      });
    }

    // 2. UNUSUAL PAYMENT FREQUENCY (same payee within 2 days)
    const payeeMap = {};
    xeroBankTransactions.BankTransactions?.forEach(tx => {
      const payee = tx.Contact?.Name || 'Unknown';
      if (!payeeMap[payee]) payeeMap[payee] = [];
      payeeMap[payee].push({ date: new Date(tx.DateString), amount: tx.LineItems?.[0]?.LineAmount || 0 });
    });

    Object.entries(payeeMap).forEach(([payee, txs]) => {
      txs.sort((a, b) => a.date - b.date);
      for (let i = 0; i < txs.length - 1; i++) {
        const daysBetween = (txs[i + 1].date - txs[i].date) / (1000 * 60 * 60 * 24);
        if (daysBetween < 2 && daysBetween > 0) {
          anomalies.push({
            type: 'frequent_payee',
            severity: 'medium',
            payee,
            transaction_count: 2,
            days_between: daysBetween.toFixed(1),
            amounts: [txs[i].amount, txs[i + 1].amount],
            message: `Payments to ${payee} within ${daysBetween.toFixed(1)} days. Verify legitimacy and consolidation.`
          });
        }
      }
    });

    // 3. NON-COMPLIANT ACCOUNT ALLOCATIONS (expenses to revenue accounts)
    const nonCompliantCategories = ['Marketing', 'Discretionary', 'Entertainment', 'Donations'];
    xeroBankTransactions.BankTransactions?.forEach(tx => {
      tx.LineItems?.forEach(li => {
        if (nonCompliantCategories.some(cat => li.AccountCode?.includes(cat) || li.Description?.includes(cat))) {
          anomalies.push({
            type: 'compliance_risk',
            severity: 'high',
            transaction_id: tx.BankTransactionID,
            date: tx.DateString,
            description: li.Description,
            amount: li.LineAmount,
            account: li.AccountCode,
            message: `Potential non-NDIS compliant allocation. Verify this expense supports NDIS service delivery.`
          });
        }
      });
    });

    // 4. ZERO-AMOUNT OR REVERSED TRANSACTIONS
    xeroBankTransactions.BankTransactions?.forEach(tx => {
      const txAmount = tx.LineItems?.reduce((sum, li) => sum + (li.LineAmount || 0), 0) || 0;
      if (txAmount === 0 || (txAmount < 0 && !tx.Description?.toLowerCase().includes('reversal'))) {
        anomalies.push({
          type: 'zero_or_reversed',
          severity: 'medium',
          transaction_id: tx.BankTransactionID,
          date: tx.DateString,
          description: tx.LineItems?.[0]?.Description,
          amount: txAmount,
          message: 'Zero or unexplained reversed transaction. Verify accuracy.'
        });
      }
    });

    // Invoke LLM for holistic anomaly analysis
    const llmAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyse these Xero financial anomalies for NDIS compliance and practice integrity risk:

${JSON.stringify(anomalies.slice(0, 15), null, 2)}

For each anomaly, provide:
1. Compliance Risk (NDIS vs general practice)
2. Recommended Investigation Steps
3. Suggested Remediation

Also provide overall financial health summary.`,
      response_json_schema: {
        type: 'object',
        properties: {
          risk_summary: { type: 'string' },
          overall_compliance_status: { type: 'string', enum: ['compliant', 'at_risk', 'non_compliant'] },
          recommended_actions: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    // Create high-severity anomaly tasks
    for (const anomaly of anomalies.filter(a => a.severity === 'high')) {
      await base44.asServiceRole.entities.Task.create({
        title: `Xero Anomaly: ${anomaly.type}`,
        description: `${anomaly.message}\n\nAmount: $${anomaly.amount}\nDate: ${anomaly.date}\n\nRecommended Action: ${llmAnalysis.recommended_actions?.[0] || 'Review and investigate.'}`,
        category: 'Finance',
        priority: 'high',
        status: 'pending',
        assigned_to: 'Finance Manager'
      });
    }

    return Response.json({
      scan_timestamp: new Date().toISOString(),
      total_anomalies: anomalies.length,
      critical: anomalies.filter(a => a.severity === 'critical').length,
      high: anomalies.filter(a => a.severity === 'high').length,
      medium: anomalies.filter(a => a.severity === 'medium').length,
      anomalies: anomalies.slice(0, 20),
      llm_analysis: llmAnalysis
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});