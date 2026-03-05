import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const body = await req.json().catch(() => ({}));
        const { start_date, end_date } = body;
        const runId = `recon_${Date.now()}`;

        // Fetch billing records, NDIS claims, and Xero invoices in parallel
        const [allBilling, allClaims, xeroResult] = await Promise.all([
            base44.asServiceRole.entities.BillingRecord.list(),
            base44.asServiceRole.entities.NDISClaimData.list(),
            (async () => {
                try {
                    const { accessToken } = await base44.asServiceRole.connectors.getConnection('xero');
                    const tenantId = Deno.env.get('XERO_TENANT_ID') || '';
                    const res = await fetch('https://api.xero.com/api.xro/2.0/Invoices?Statuses=AUTHORISED,PAID', {
                        headers: { 'Authorization': `Bearer ${accessToken}`, 'Xero-tenant-id': tenantId, 'Accept': 'application/json' }
                    });
                    if (!res.ok) return null;
                    const data = await res.json();
                    return data?.Invoices || [];
                } catch { return null; }
            })()
        ]);

        // Filter by date range if provided
        const billing = start_date
            ? allBilling.filter(b => b.service_date >= start_date && (!end_date || b.service_date <= end_date))
            : allBilling;
        const claims = start_date
            ? allClaims.filter(c => c.service_date >= start_date && (!end_date || c.service_date <= end_date))
            : allClaims;

        const discrepancies = [];
        const matchedClaimIds = new Set();

        // Match internal billing records to NDIS claims
        for (const bill of billing) {
            const matchedClaims = claims.filter(c =>
                c.client_id === bill.client_id &&
                c.service_date === bill.service_date &&
                c.ndis_line_item === bill.ndis_line_item
            );

            if (matchedClaims.length === 0) {
                // Unclaimed internal record
                discrepancies.push({
                    billing_record_id: bill.id,
                    client_id: bill.client_id,
                    client_name: bill.client_name || '',
                    service_date: bill.service_date,
                    ndis_line_item: bill.ndis_line_item || '',
                    discrepancy_type: 'unclaimed_internal',
                    severity: bill.total_amount > 500 ? 'high' : 'medium',
                    internal_amount: bill.total_amount || 0,
                    claimed_amount: 0,
                    variance_amount: -(bill.total_amount || 0),
                    internal_hours: bill.duration_hours || 0,
                    claimed_hours: 0,
                    variance_hours: -(bill.duration_hours || 0),
                    description: `Internal billing record for ${bill.client_name} on ${bill.service_date} (${bill.ndis_line_item}) has no corresponding NDIS claim. Amount at risk: $${(bill.total_amount || 0).toFixed(2)}.`,
                    status: 'new',
                    reconciliation_run_id: runId
                });
            } else {
                const claim = matchedClaims[0];
                matchedClaimIds.add(claim.id);

                const variantAmount = (claim.claimed_amount || 0) - (bill.total_amount || 0);
                const variantHours = (claim.claimed_hours || 0) - (bill.duration_hours || 0);
                const amountMismatch = Math.abs(variantAmount) > 0.01;
                const hoursMismatch = Math.abs(variantHours) > 0.01;

                if (amountMismatch || hoursMismatch) {
                    const severity = Math.abs(variantAmount) > 200 ? 'critical'
                        : Math.abs(variantAmount) > 50 ? 'high'
                        : Math.abs(variantAmount) > 10 ? 'medium' : 'low';

                    discrepancies.push({
                        billing_record_id: bill.id,
                        ndis_claim_id: claim.id,
                        client_id: bill.client_id,
                        client_name: bill.client_name || '',
                        service_date: bill.service_date,
                        ndis_line_item: bill.ndis_line_item || '',
                        discrepancy_type: amountMismatch && hoursMismatch ? 'amount_mismatch' : amountMismatch ? 'amount_mismatch' : 'hour_mismatch',
                        severity,
                        internal_amount: bill.total_amount || 0,
                        claimed_amount: claim.claimed_amount || 0,
                        variance_amount: variantAmount,
                        internal_hours: bill.duration_hours || 0,
                        claimed_hours: claim.claimed_hours || 0,
                        variance_hours: variantHours,
                        description: `Mismatch for ${bill.client_name} on ${bill.service_date}: Internal $${(bill.total_amount || 0).toFixed(2)} vs Claimed $${(claim.claimed_amount || 0).toFixed(2)} (variance $${variantAmount.toFixed(2)}).`,
                        status: 'new',
                        reconciliation_run_id: runId
                    });
                }
            }
        }

        // Unmatched NDIS claims (claim exists, no internal record)
        for (const claim of claims) {
            if (!matchedClaimIds.has(claim.id)) {
                discrepancies.push({
                    ndis_claim_id: claim.id,
                    client_id: claim.client_id,
                    client_name: claim.client_name || '',
                    service_date: claim.service_date,
                    ndis_line_item: claim.ndis_line_item || '',
                    discrepancy_type: 'unmatched_claim',
                    severity: 'high',
                    internal_amount: 0,
                    claimed_amount: claim.claimed_amount || 0,
                    variance_amount: claim.claimed_amount || 0,
                    internal_hours: 0,
                    claimed_hours: claim.claimed_hours || 0,
                    variance_hours: claim.claimed_hours || 0,
                    description: `NDIS claim ${claim.claim_number} for ${claim.client_name} on ${claim.service_date} has no matching internal billing record. Claimed: $${(claim.claimed_amount || 0).toFixed(2)}.`,
                    status: 'new',
                    reconciliation_run_id: runId
                });
            }
        }

        // AI analysis for high/critical discrepancies
        if (discrepancies.length > 0) {
            const highPriority = discrepancies.filter(d => d.severity === 'high' || d.severity === 'critical');
            if (highPriority.length > 0) {
                const aiPrompt = `You are an NDIS billing compliance analyst. Analyse the following financial discrepancies and for each provide: 1) likely root cause, 2) corrective action, 3) preventive measure. Return JSON array with fields: index, root_cause, corrective_action, preventive_measure.\n\nDiscrepancies:\n${JSON.stringify(highPriority.map((d, i) => ({ index: i, type: d.discrepancy_type, description: d.description, variance: d.variance_amount })), null, 2)}`;

                const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
                    prompt: aiPrompt,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            analyses: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        index: { type: "number" },
                                        root_cause: { type: "string" },
                                        corrective_action: { type: "string" },
                                        preventive_measure: { type: "string" }
                                    }
                                }
                            }
                        }
                    }
                });

                if (aiResult?.analyses) {
                    aiResult.analyses.forEach(a => {
                        if (highPriority[a.index]) {
                            highPriority[a.index].ai_analysis = `Root Cause: ${a.root_cause}\nCorrective Action: ${a.corrective_action}\nPreventive Measure: ${a.preventive_measure}`;
                        }
                    });
                }
            }
        }

        // Persist discrepancies
        let created = 0;
        for (const d of discrepancies) {
            await base44.asServiceRole.entities.FinancialDiscrepancy.create(d);
            created++;
        }

        return Response.json({
            success: true,
            run_id: runId,
            billing_records_processed: billing.length,
            claims_processed: claims.length,
            discrepancies_found: created,
            summary: {
                unclaimed_internal: discrepancies.filter(d => d.discrepancy_type === 'unclaimed_internal').length,
                unmatched_claim: discrepancies.filter(d => d.discrepancy_type === 'unmatched_claim').length,
                amount_mismatch: discrepancies.filter(d => d.discrepancy_type === 'amount_mismatch').length,
                hour_mismatch: discrepancies.filter(d => d.discrepancy_type === 'hour_mismatch').length,
                critical: discrepancies.filter(d => d.severity === 'critical').length,
                high: discrepancies.filter(d => d.severity === 'high').length
            }
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});