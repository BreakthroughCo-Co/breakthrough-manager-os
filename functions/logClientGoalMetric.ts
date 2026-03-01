import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 });

        const { client_id, metric_name, metric_unit, current_value, baseline_value, target_value, measurement_date, case_note_id, ndis_domain, goal_description, notes } = await req.json();
        if (!client_id || !metric_name || current_value === undefined) {
            return Response.json({ error: 'client_id, metric_name, current_value required' }, { status: 400 });
        }

        const [client, history] = await Promise.all([
            base44.asServiceRole.entities.Client.get(client_id).catch(() => null),
            base44.asServiceRole.entities.ClientGoalMetric.filter({ client_id, metric_name }, '-measurement_date', 8).catch(() => [])
        ]);

        let trend = 'insufficient_data';
        let ai_insight = '';

        if (history.length >= 2) {
            const values = [...history.map(h => ({ date: h.measurement_date, value: h.current_value })), { date: measurement_date, value: current_value }]
                .sort((a, b) => a.date.localeCompare(b.date));

            const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
                prompt: `Analyse NDIS goal metric data and classify trend. Metric: "${metric_name}" (unit: ${metric_unit || 'N/A'}) | Target: ${target_value ?? 'N/A'} | Data: ${JSON.stringify(values)}. Classify as: improving, stable, declining, achieved, or insufficient_data. Provide one clinical paragraph.`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        trend: { type: "string" },
                        insight: { type: "string" }
                    }
                }
            }).catch(() => null);

            if (aiResult) { trend = aiResult.trend || 'insufficient_data'; ai_insight = aiResult.insight || ''; }
        }

        const metric = await base44.asServiceRole.entities.ClientGoalMetric.create({
            client_id,
            client_name: client?.full_name || '',
            goal_description: goal_description || '',
            ndis_domain: ndis_domain || 'daily_activities',
            metric_name,
            metric_unit: metric_unit || '',
            baseline_value: baseline_value ?? null,
            target_value: target_value ?? null,
            current_value,
            measurement_date: measurement_date || new Date().toISOString().split('T')[0],
            recorded_by: user.full_name || user.email,
            case_note_id: case_note_id || '',
            trend,
            ai_insight,
            notes: notes || ''
        });

        return Response.json({ success: true, metric, trend, ai_insight });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});