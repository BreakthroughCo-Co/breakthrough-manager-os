import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const today = new Date().toISOString().split('T')[0];
        const clients = await base44.asServiceRole.entities.Client.list();
        const billingRecords = await base44.asServiceRole.entities.BillingRecord.list();

        const activeClients = clients.filter(c => c.status === 'active' && c.plan_end_date && c.funding_allocated > 0);
        const reports = [];

        for (const client of activeClients) {
            const clientBilling = billingRecords.filter(b =>
                b.client_id === client.id &&
                b.status !== 'rejected' &&
                b.service_date >= (client.plan_start_date || '2000-01-01')
            );

            const utilisedFunding = clientBilling.reduce((sum, b) => sum + (b.total_amount || 0), 0);
            const remainingFunding = (client.funding_allocated || 0) - utilisedFunding;
            const utilisationPct = client.funding_allocated > 0
                ? (utilisedFunding / client.funding_allocated) * 100
                : 0;

            const planStart = new Date(client.plan_start_date || today);
            const planEnd = new Date(client.plan_end_date);
            const planDaysTotal = Math.max(1, (planEnd - planStart) / (1000 * 60 * 60 * 24));
            const planDaysElapsed = Math.max(0, (new Date(today) - planStart) / (1000 * 60 * 60 * 24));
            const weeksElapsed = Math.max(1, planDaysElapsed / 7);
            const weeksRemaining = Math.max(0, (planEnd - new Date(today)) / (1000 * 60 * 60 * 24 * 7));

            // Session frequency variance: compute weekly session counts for std dev
            const sessionsByWeek = {};
            clientBilling.forEach(b => {
                const weekKey = Math.floor((new Date(b.service_date) - new Date(client.plan_start_date || today)) / (7 * 86400000));
                sessionsByWeek[weekKey] = (sessionsByWeek[weekKey] || 0) + 1;
            });
            const weekCounts = Object.values(sessionsByWeek);
            const avgSessions = weekCounts.length > 0 ? weekCounts.reduce((a, b) => a + b, 0) / weekCounts.length : 0;
            const variance = weekCounts.length > 1
                ? weekCounts.reduce((sum, v) => sum + Math.pow(v - avgSessions, 2), 0) / weekCounts.length
                : 0;
            const stdDev = Math.sqrt(variance);
            // Volatility-adjusted burn rate: high variance → use upper bound
            const adjustedBurnRate = stdDev > 1 ? Math.max(utilisedFunding / weeksElapsed, (utilisedFunding + stdDev * 50) / weeksElapsed) : utilisedFunding / weeksElapsed;

            const burnRateWeekly = utilisedFunding / weeksElapsed;
            const projectedEndBalance = remainingFunding - (adjustedBurnRate * weeksRemaining);
            const depletionConfidence = stdDev < 0.5 ? 'high' : stdDev < 1.5 ? 'medium' : 'low';

            // Estimate depletion date using adjusted burn rate
            let depletionDate = null;
            if (adjustedBurnRate > 0 && remainingFunding > 0) {
                const weeksToDepletion = remainingFunding / adjustedBurnRate;
                const depletionMs = new Date(today).getTime() + (weeksToDepletion * 7 * 24 * 60 * 60 * 1000);
                depletionDate = new Date(depletionMs).toISOString().split('T')[0];
            }

            // Risk classification
            const expectedPct = planDaysTotal > 0 ? (planDaysElapsed / planDaysTotal) * 100 : 0;
            const variancePct = utilisationPct - expectedPct;
            let riskLevel = 'on_track';
            if (projectedEndBalance < -100) riskLevel = 'critical';
            else if (variancePct > 15) riskLevel = 'over_utilised';
            else if (variancePct < -20 && weeksRemaining < 8) riskLevel = 'under_utilised';

            reports.push({
                report_date: today,
                client_id: client.id,
                client_name: client.full_name,
                plan_start_date: client.plan_start_date || null,
                plan_end_date: client.plan_end_date,
                total_funding: client.funding_allocated,
                utilised_funding: utilisedFunding,
                remaining_funding: remainingFunding,
                utilisation_percentage: Math.round(utilisationPct * 10) / 10,
                burn_rate_weekly: Math.round(burnRateWeekly * 100) / 100,
                weeks_remaining_in_plan: Math.round(weeksRemaining * 10) / 10,
                projected_end_balance: Math.round(projectedEndBalance * 100) / 100,
                estimated_depletion_date: depletionDate,
                risk_level: riskLevel,
                ai_insights: null
            });
        }

        // AI insights for at-risk clients
        const atRisk = reports.filter(r => r.risk_level === 'critical' || r.risk_level === 'over_utilised' || r.risk_level === 'under_utilised');
        if (atRisk.length > 0) {
            const aiPrompt = `You are an NDIS funding analyst. For each at-risk client below, provide a concise 2-sentence insight: what the funding pattern indicates and what action the practice manager should take. Return a JSON array with fields: client_id, insight.\n\nAt-risk clients:\n${JSON.stringify(atRisk.map(r => ({
                client_id: r.client_id,
                client_name: r.client_name,
                risk_level: r.risk_level,
                utilisation_pct: r.utilisation_percentage,
                projected_end_balance: r.projected_end_balance,
                weeks_remaining: r.weeks_remaining_in_plan,
                burn_rate_weekly: r.burn_rate_weekly
            })), null, 2)}`;

            const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
                prompt: aiPrompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        insights: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    client_id: { type: "string" },
                                    insight: { type: "string" }
                                }
                            }
                        }
                    }
                }
            });

            if (aiResult?.insights) {
                aiResult.insights.forEach(ins => {
                    const r = reports.find(r => r.client_id === ins.client_id);
                    if (r) r.ai_insights = ins.insight;
                });
            }
        }

        // Persist reports
        for (const report of reports) {
            await base44.asServiceRole.entities.FundingUtilisationReport.create(report);
        }

        return Response.json({
            success: true,
            report_date: today,
            clients_analysed: reports.length,
            at_risk_count: atRisk.length,
            summary: {
                critical: reports.filter(r => r.risk_level === 'critical').length,
                over_utilised: reports.filter(r => r.risk_level === 'over_utilised').length,
                under_utilised: reports.filter(r => r.risk_level === 'under_utilised').length,
                on_track: reports.filter(r => r.risk_level === 'on_track').length
            }
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});