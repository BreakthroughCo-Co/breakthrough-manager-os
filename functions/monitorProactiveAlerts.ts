import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Fetch all relevant data for proactive monitoring
        const [clients, practitioners, complianceItems, incidents, riskProfiles, ndisPlans, restrictivePractices] = await Promise.all([
            base44.asServiceRole.entities.Client.list(),
            base44.asServiceRole.entities.Practitioner.list(),
            base44.asServiceRole.entities.ComplianceItem.list(),
            base44.asServiceRole.entities.Incident.list(),
            base44.asServiceRole.entities.ClientRiskProfile.list(),
            base44.asServiceRole.entities.NDISPlan.list(),
            base44.asServiceRole.entities.RestrictivePractice.list()
        ]);

        // Build context for AI analysis
        const monitoringContext = {
            compliance_items: complianceItems.filter(c => 
                c.status === 'attention_needed' || c.status === 'non_compliant' || 
                (c.due_date && new Date(c.due_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
            ).map(c => ({
                id: c.id,
                title: c.title,
                category: c.category,
                status: c.status,
                due_date: c.due_date,
                priority: c.priority
            })),
            high_risk_clients: clients.filter(c => c.risk_level === 'high').map(c => ({
                id: c.id,
                name: c.full_name,
                ndis_number: c.ndis_number,
                risk_level: c.risk_level,
                status: c.status
            })),
            recent_incidents: incidents.filter(i => 
                new Date(i.created_date) > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
            ).map(i => ({
                id: i.id,
                client_name: i.client_name,
                incident_type: i.incident_type,
                severity: i.severity,
                date: i.incident_date
            })),
            expiring_plans: ndisPlans.filter(p => 
                p.end_date && new Date(p.end_date) <= new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
            ).map(p => ({
                id: p.id,
                client_name: p.client_name,
                end_date: p.end_date
            })),
            practitioners_over_capacity: practitioners.filter(p => 
                p.current_caseload && p.caseload_capacity && 
                (p.current_caseload / p.caseload_capacity) > 0.9
            ).map(p => ({
                id: p.id,
                name: p.full_name,
                caseload: p.current_caseload,
                capacity: p.caseload_capacity
            })),
            restrictive_practices_due_review: restrictivePractices.filter(rp => 
                rp.last_review_date && 
                new Date(rp.last_review_date) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            ).map(rp => ({
                id: rp.id,
                client_name: rp.client_name,
                practice_type: rp.practice_type,
                last_review_date: rp.last_review_date
            }))
        };

        // Use AI to analyze and generate proactive alerts
        const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `You are an AI monitoring system for an NDIS provider. Analyze the following operational data and identify critical issues that require immediate managerial attention.

Current Monitoring Data:
${JSON.stringify(monitoringContext, null, 2)}

Your task:
1. Identify the most critical issues that pose compliance, safety, or operational risks
2. For each issue, determine:
   - Alert type and severity level (critical/high/medium/low)
   - Clear, actionable title and description
   - Specific suggested actions for managers
   - Priority score (0-100 based on urgency and impact)
3. Focus on issues that:
   - Could lead to NDIS compliance breaches
   - Represent client safety risks
   - Indicate significant operational inefficiencies
   - Require immediate managerial intervention

Generate alerts only for significant issues that warrant managerial attention. Be specific and actionable.`,
            response_json_schema: {
                type: "object",
                properties: {
                    alerts: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                alert_type: {
                                    type: "string",
                                    enum: [
                                        "compliance_risk",
                                        "client_risk",
                                        "practitioner_performance",
                                        "funding_threshold",
                                        "plan_expiry",
                                        "incident_pattern",
                                        "documentation_gap",
                                        "restrictive_practice_review"
                                    ]
                                },
                                severity: {
                                    type: "string",
                                    enum: ["critical", "high", "medium", "low"]
                                },
                                title: { type: "string" },
                                description: { type: "string" },
                                suggested_actions: {
                                    type: "array",
                                    items: { type: "string" }
                                },
                                related_entity_type: { type: "string" },
                                related_entity_id: { type: "string" },
                                related_entity_name: { type: "string" },
                                priority_score: { type: "number" },
                                context_data: { type: "object" }
                            }
                        }
                    }
                }
            }
        });

        const generatedAlerts = response.alerts || [];

        // Check for existing alerts to avoid duplicates
        const existingAlerts = await base44.asServiceRole.entities.ProactiveAlert.filter({
            status: 'active'
        });

        // Create new alerts
        const newAlerts = [];
        for (const alert of generatedAlerts) {
            // Check if similar alert already exists
            const isDuplicate = existingAlerts.some(ea => 
                ea.related_entity_id === alert.related_entity_id &&
                ea.alert_type === alert.alert_type &&
                ea.status === 'active'
            );

            if (!isDuplicate) {
                const newAlert = await base44.asServiceRole.entities.ProactiveAlert.create({
                    ...alert,
                    detected_date: new Date().toISOString(),
                    status: 'active',
                    context_data: JSON.stringify(alert.context_data || {})
                });
                newAlerts.push(newAlert);
            }
        }

        return Response.json({
            success: true,
            alerts_generated: newAlerts.length,
            total_alerts_analyzed: generatedAlerts.length,
            new_alerts: newAlerts
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});