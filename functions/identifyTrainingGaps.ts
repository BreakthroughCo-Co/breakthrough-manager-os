import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const [practitioners, performanceReports, incidents, complianceBreaches, 
               trainingProgress, complianceAudits, clientFeedback] = await Promise.all([
            base44.asServiceRole.entities.Practitioner.filter({ status: 'active' }),
            base44.asServiceRole.entities.MonthlyPerformanceReport.list('-created_date', 100),
            base44.asServiceRole.entities.Incident.list('-created_date', 100),
            base44.asServiceRole.entities.ComplianceBreach.list('-created_date', 50),
            base44.asServiceRole.entities.TrainingProgress.list(),
            base44.asServiceRole.entities.ComplianceAudit.list('-created_date', 20),
            base44.asServiceRole.entities.ClientFeedback.list('-created_date', 100)
        ]);

        // Build practitioner gap profiles
        const practitionerGaps = practitioners.map(p => {
            const recentPerformance = performanceReports.filter(pr => pr.practitioner_id === p.id);
            const relatedIncidents = incidents.filter(i => i.reported_by === p.id || i.involved_staff?.includes(p.id));
            const relatedBreaches = complianceBreaches.filter(b => b.responsible_person === p.email);
            const completedTraining = trainingProgress.filter(t => 
                t.practitioner_id === p.id && t.status === 'completed'
            );
            const feedback = clientFeedback.filter(f => f.practitioner_id === p.id);

            const avgRating = feedback.length > 0
                ? feedback.reduce((sum, f) => sum + f.overall_satisfaction, 0) / feedback.length
                : null;

            return {
                practitioner_id: p.id,
                name: p.full_name,
                role: p.role,
                performance_summary: recentPerformance[0],
                incident_involvement: relatedIncidents.length,
                compliance_breaches: relatedBreaches.length,
                completed_training_count: completedTraining.length,
                avg_client_rating: avgRating,
                certifications: p.certifications || []
            };
        });

        // Analyze compliance audit findings
        const auditFindings = complianceAudits.flatMap(audit => 
            audit.findings ? JSON.parse(audit.findings) : []
        );

        const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `You are a compliance training specialist for an NDIS provider. Identify knowledge gaps based on performance data, incidents, and audit findings, then recommend personalized training.

Practitioner Data (${practitioners.length} active):
${JSON.stringify(practitionerGaps, null, 2)}

Recent Incidents: ${incidents.length}
Compliance Breaches: ${complianceBreaches.length}
Audit Findings: ${auditFindings.length}

For each practitioner, identify:
1. Knowledge gaps (compliance, clinical, operational)
2. Priority training needs
3. Root causes (incident patterns, performance issues)
4. Personalized training recommendations with specific modules
5. Urgency level and compliance risk

Be specific about NDIS compliance areas.`,
            response_json_schema: {
                type: "object",
                properties: {
                    overall_gap_summary: { type: "string" },
                    systemic_gaps: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                gap_area: { type: "string" },
                                severity: { type: "string" },
                                affected_practitioners_count: { type: "number" },
                                recommended_training: { type: "string" }
                            }
                        }
                    },
                    practitioner_specific_gaps: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                practitioner_name: { type: "string" },
                                practitioner_id: { type: "string" },
                                identified_gaps: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            gap_area: { type: "string" },
                                            evidence: { type: "string" },
                                            urgency: { type: "string" },
                                            compliance_risk: { type: "string" }
                                        }
                                    }
                                },
                                recommended_modules: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            module_title: { type: "string" },
                                            module_focus: { type: "string" },
                                            estimated_duration: { type: "string" },
                                            priority: { type: "string" }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    compliance_priority_areas: {
                        type: "array",
                        items: { type: "string" }
                    }
                }
            }
        });

        return Response.json({
            success: true,
            gap_analysis: response,
            analyzed_practitioners: practitioners.length,
            generated_date: new Date().toISOString()
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});