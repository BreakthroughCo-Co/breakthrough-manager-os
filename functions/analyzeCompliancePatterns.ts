import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
        }

        // Fetch comprehensive compliance data
        const [complianceItems, incidents, breaches, auditReports, restrictivePractices, workerScreenings] = await Promise.all([
            base44.asServiceRole.entities.ComplianceItem.list('-due_date', 300),
            base44.asServiceRole.entities.Incident.list('-incident_date', 200),
            base44.asServiceRole.entities.ComplianceBreach.list('-breach_date', 100),
            base44.asServiceRole.entities.ComplianceAuditReport.list('-audit_date', 50),
            base44.asServiceRole.entities.RestrictivePractice.list('-recorded_date', 100),
            base44.asServiceRole.entities.WorkerScreening.list('-expiry_date', 200)
        ]);

        // Calculate pattern metrics
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

        const recentBreaches = breaches.filter(b => new Date(b.breach_date) > thirtyDaysAgo);
        const recentIncidents = incidents.filter(i => new Date(i.incident_date) > thirtyDaysAgo);
        
        // Identify expiring items
        const expiringScreenings = workerScreenings.filter(w => {
            const expiryDate = new Date(w.expiry_date);
            const daysUntilExpiry = (expiryDate - now) / (1000 * 60 * 60 * 24);
            return daysUntilExpiry > 0 && daysUntilExpiry <= 60;
        });

        // Analyze with AI
        const analysis = await base44.integrations.Core.InvokeLLM({
            prompt: `You are an NDIS compliance expert analyzing organizational compliance patterns.

COMPLIANCE ITEMS (${complianceItems.length} total):
Status breakdown:
- Compliant: ${complianceItems.filter(c => c.status === 'compliant').length}
- Attention needed: ${complianceItems.filter(c => c.status === 'attention_needed').length}
- Non-compliant: ${complianceItems.filter(c => c.status === 'non_compliant').length}
- Pending review: ${complianceItems.filter(c => c.status === 'pending_review').length}

Categories with issues:
${JSON.stringify(complianceItems.filter(c => c.status !== 'compliant').slice(0, 20), null, 2)}

INCIDENTS (last 30 days: ${recentIncidents.length}):
${JSON.stringify(recentIncidents.slice(0, 30), null, 2)}

COMPLIANCE BREACHES (last 30 days: ${recentBreaches.length}):
${JSON.stringify(recentBreaches, null, 2)}

RECENT AUDIT REPORTS:
${JSON.stringify(auditReports.slice(0, 10), null, 2)}

RESTRICTIVE PRACTICES:
${JSON.stringify(restrictivePractices.slice(0, 20), null, 2)}

EXPIRING WORKER SCREENINGS (next 60 days: ${expiringScreenings.length}):
${JSON.stringify(expiringScreenings, null, 2)}

Analyze these patterns and provide:
1. Identified Patterns: Recurring compliance issues, trends, systemic problems
2. Root Causes: Why these patterns are occurring
3. Policy Gaps: Areas where policies may be outdated or insufficient
4. Risk Predictions: What compliance breaches are likely to occur in the next 3-6 months
5. Recommended Policy Updates: Specific policy changes to address identified issues
6. Immediate Actions: Urgent steps to take now
7. Long-term Strategy: Systematic improvements needed`,
            response_json_schema: {
                type: "object",
                properties: {
                    identified_patterns: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                pattern: { type: "string" },
                                frequency: { type: "string" },
                                severity: { type: "string" },
                                affected_areas: { type: "array", items: { type: "string" } }
                            }
                        }
                    },
                    root_causes: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                issue: { type: "string" },
                                root_cause: { type: "string" },
                                evidence: { type: "string" }
                            }
                        }
                    },
                    policy_gaps: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                policy_area: { type: "string" },
                                gap_description: { type: "string" },
                                impact: { type: "string" },
                                priority: { type: "string" }
                            }
                        }
                    },
                    risk_predictions: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                risk_area: { type: "string" },
                                risk_category: { type: "string" },
                                probability: { type: "number" },
                                impact: { type: "string" },
                                time_to_materialize: { type: "string" },
                                contributing_factors: { type: "array", items: { type: "string" } },
                                recommended_actions: { type: "array", items: { type: "string" } }
                            }
                        }
                    },
                    policy_updates: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                policy_name: { type: "string" },
                                update_type: { type: "string" },
                                reason: { type: "string" },
                                draft_changes: { type: "string" }
                            }
                        }
                    },
                    immediate_actions: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                action: { type: "string" },
                                urgency: { type: "string" },
                                responsible_role: { type: "string" },
                                deadline: { type: "string" }
                            }
                        }
                    },
                    long_term_strategy: {
                        type: "object",
                        properties: {
                            strategic_recommendations: { type: "array", items: { type: "string" } },
                            capability_building: { type: "array", items: { type: "string" } },
                            system_improvements: { type: "array", items: { type: "string" } }
                        }
                    }
                }
            }
        });

        // Save risk forecasts to database
        const savedForecasts = [];
        if (analysis.risk_predictions) {
            for (const risk of analysis.risk_predictions.slice(0, 20)) {
                const forecast = await base44.asServiceRole.entities.ComplianceRiskForecast.create({
                    risk_area: risk.risk_area,
                    risk_category: risk.risk_category,
                    probability: risk.probability,
                    impact: risk.impact,
                    contributing_factors: JSON.stringify(risk.contributing_factors || []),
                    recommended_actions: JSON.stringify(risk.recommended_actions || []),
                    forecast_date: new Date().toISOString().split('T')[0],
                    confidence_score: 75,
                    time_to_materialize: risk.time_to_materialize,
                    status: 'forecasted'
                });
                savedForecasts.push(forecast.id);
            }
        }

        return Response.json({
            success: true,
            analysis,
            metrics: {
                total_compliance_items: complianceItems.length,
                non_compliant: complianceItems.filter(c => c.status === 'non_compliant').length,
                recent_breaches: recentBreaches.length,
                recent_incidents: recentIncidents.length,
                expiring_screenings: expiringScreenings.length
            },
            forecasts_created: savedForecasts.length,
            analyzed_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error analyzing compliance patterns:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});