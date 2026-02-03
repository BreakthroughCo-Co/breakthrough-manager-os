import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch all billing records
        const billingRecords = await base44.entities.BillingRecord.list('-service_date', 500);
        
        // Prepare data for AI analysis
        const recordsData = billingRecords.map(r => ({
            id: r.id,
            client_name: r.client_name,
            service_type: r.service_type,
            service_date: r.service_date,
            ndis_line_item: r.ndis_line_item,
            duration_hours: r.duration_hours,
            rate: r.rate,
            total_amount: r.total_amount,
            status: r.status,
            notes: r.notes
        }));

        // Call AI to analyze billing records
        const analysis = await base44.integrations.Core.InvokeLLM({
            prompt: `You are an NDIS billing optimization expert. Analyze these billing records and provide:

1. REVENUE FORECAST: Based on historical data, predict next 3 months revenue with confidence intervals
2. ERROR DETECTION: Identify potential errors in line items, rates, or service type mismatches
3. DUPLICATE DETECTION: Flag potential duplicate entries (same client, date, service type)
4. LINE ITEM OPTIMIZATION: Suggest optimal NDIS line items for each service type
5. BILLING INSIGHTS: Key patterns, anomalies, and recommendations

Billing Records (most recent 500):
${JSON.stringify(recordsData, null, 2)}

NDIS Service Type Guidelines:
- Assessment: 15_038_0117_1_3 (Behaviour Support Assessment)
- Plan Development: 15_054_0117_1_3 (Behaviour Support Plan Development)
- Direct Support: 04_104_0125_6_1 (Community Participation)
- Report Writing: 15_038_0117_1_3 (Behaviour Support Assessment/Report)
- Capacity Building - Finding and Keeping a Job: 09_001_0106_1_1
- Core - Social, Economic and Community Participation: 04_104_0125_6_1
- Core - Assistance with Daily Life: 01_011_0107_1_1

Provide comprehensive analysis with actionable insights.`,
            response_json_schema: {
                type: "object",
                properties: {
                    revenue_forecast: {
                        type: "object",
                        properties: {
                            next_month: { type: "number" },
                            month_2: { type: "number" },
                            month_3: { type: "number" },
                            confidence: { type: "string" },
                            trend: { type: "string" },
                            factors: { type: "array", items: { type: "string" } }
                        }
                    },
                    detected_errors: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                record_id: { type: "string" },
                                client_name: { type: "string" },
                                error_type: { type: "string" },
                                description: { type: "string" },
                                severity: { type: "string" },
                                suggested_fix: { type: "string" }
                            }
                        }
                    },
                    duplicate_entries: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                record_ids: { type: "array", items: { type: "string" } },
                                client_name: { type: "string" },
                                service_date: { type: "string" },
                                service_type: { type: "string" },
                                reason: { type: "string" }
                            }
                        }
                    },
                    line_item_suggestions: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                service_type: { type: "string" },
                                current_line_item: { type: "string" },
                                suggested_line_item: { type: "string" },
                                rationale: { type: "string" },
                                impact: { type: "string" }
                            }
                        }
                    },
                    insights: {
                        type: "object",
                        properties: {
                            total_records_analyzed: { type: "number" },
                            total_revenue: { type: "number" },
                            average_rate: { type: "number" },
                            most_common_service: { type: "string" },
                            compliance_score: { type: "number" },
                            key_recommendations: { type: "array", items: { type: "string" } },
                            risk_areas: { type: "array", items: { type: "string" } }
                        }
                    }
                }
            }
        });

        return Response.json({
            success: true,
            analysis: analysis,
            analyzed_at: new Date().toISOString(),
            records_count: billingRecords.length
        });

    } catch (error) {
        console.error('Error optimizing billing claims:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});