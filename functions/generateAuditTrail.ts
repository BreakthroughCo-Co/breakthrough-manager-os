import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { entity_type, entity_id, audit_purpose } = await req.json();

        let auditData = {};
        let entityName = '';

        // Fetch comprehensive audit trail data based on entity type
        if (entity_type === 'Client') {
            const [client, caseNotes, incidents, restrictivePractices, goals, riskProfiles, billingRecords, 
                   serviceAgreements, communications, appointments, documents, feedback, proactiveAlerts] = await Promise.all([
                base44.asServiceRole.entities.Client.get(entity_id),
                base44.asServiceRole.entities.CaseNote.filter({ client_id: entity_id }),
                base44.asServiceRole.entities.Incident.filter({ client_id: entity_id }),
                base44.asServiceRole.entities.RestrictivePractice.filter({ client_id: entity_id }),
                base44.asServiceRole.entities.ClientGoal.filter({ client_id: entity_id }),
                base44.asServiceRole.entities.ClientRiskProfile.filter({ client_id: entity_id }),
                base44.asServiceRole.entities.BillingRecord.filter({ client_id: entity_id }),
                base44.asServiceRole.entities.ServiceAgreement.filter({ client_id: entity_id }),
                base44.asServiceRole.entities.ClientCommunication.filter({ client_id: entity_id }),
                base44.asServiceRole.entities.Appointment.filter({ client_id: entity_id }),
                base44.asServiceRole.entities.ClientDocument.filter({ client_id: entity_id }),
                base44.asServiceRole.entities.ClientFeedback.filter({ client_id: entity_id }),
                base44.asServiceRole.entities.ProactiveAlert.filter({ 
                    related_entity_type: 'Client',
                    related_entity_id: entity_id 
                })
            ]);

            entityName = client.full_name;
            auditData = {
                client_profile: client,
                case_notes: caseNotes,
                incidents: incidents,
                restrictive_practices: restrictivePractices,
                goals: goals,
                risk_profiles: riskProfiles,
                billing_records: billingRecords,
                service_agreements: serviceAgreements,
                communications: communications,
                appointments: appointments,
                documents: documents,
                feedback: feedback,
                proactive_alerts: proactiveAlerts
            };
        } else if (entity_type === 'ComplianceItem') {
            const [complianceItem, auditLogs, breaches, audits, relatedTasks] = await Promise.all([
                base44.asServiceRole.entities.ComplianceItem.get(entity_id),
                base44.asServiceRole.entities.AuditLog.filter({ related_entity_id: entity_id }),
                base44.asServiceRole.entities.ComplianceBreach.filter({ compliance_item_id: entity_id }),
                base44.asServiceRole.entities.ComplianceAudit.filter({ compliance_item_id: entity_id }),
                base44.asServiceRole.entities.Task.filter({ 
                    related_entity_type: 'ComplianceItem',
                    related_entity_id: entity_id 
                })
            ]);

            entityName = complianceItem.title;
            auditData = {
                compliance_item: complianceItem,
                audit_logs: auditLogs,
                breaches: breaches,
                audits: audits,
                related_tasks: relatedTasks
            };
        } else if (entity_type === 'Practitioner') {
            const [practitioner, clients, performance, training, feedback, screenings] = await Promise.all([
                base44.asServiceRole.entities.Practitioner.get(entity_id),
                base44.asServiceRole.entities.Client.filter({ assigned_practitioner_id: entity_id }),
                base44.asServiceRole.entities.MonthlyPerformanceReport.filter({ practitioner_id: entity_id }),
                base44.asServiceRole.entities.TrainingProgress.filter({ practitioner_id: entity_id }),
                base44.asServiceRole.entities.ClientFeedback.filter({ practitioner_id: entity_id }),
                base44.asServiceRole.entities.WorkerScreening.filter({ practitioner_id: entity_id })
            ]);

            entityName = practitioner.full_name;
            auditData = {
                practitioner_profile: practitioner,
                assigned_clients: clients,
                performance_reports: performance,
                training_history: training,
                client_feedback: feedback,
                worker_screenings: screenings
            };
        }

        // Use AI to compile comprehensive audit trail
        const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `You are an NDIS audit documentation specialist. Compile a comprehensive, audit-ready trail for the following entity.

Entity Type: ${entity_type}
Entity Name: ${entityName}
Audit Purpose: ${audit_purpose || 'General compliance audit'}

Complete Audit Data:
${JSON.stringify(auditData, null, 2)}

Generate a structured audit trail that includes:
1. Executive Summary - high-level overview
2. Compliance Status - assessment of NDIS compliance
3. Key Events Timeline - chronological significant events
4. Risk Assessment - identified risks and mitigation
5. Evidence Summary - categorized supporting documentation
6. Recommendations - actionable next steps
7. Audit Checklist - specific items verified

Format for NDIS audit readiness. Be thorough, professional, and compliance-focused.`,
            response_json_schema: {
                type: "object",
                properties: {
                    executive_summary: { type: "string" },
                    compliance_status: {
                        type: "object",
                        properties: {
                            overall_rating: { type: "string" },
                            compliant_areas: { type: "array", items: { type: "string" } },
                            attention_required: { type: "array", items: { type: "string" } },
                            non_compliant: { type: "array", items: { type: "string" } }
                        }
                    },
                    key_events_timeline: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                date: { type: "string" },
                                event: { type: "string" },
                                significance: { type: "string" }
                            }
                        }
                    },
                    risk_assessment: {
                        type: "object",
                        properties: {
                            current_risks: { type: "array", items: { type: "string" } },
                            mitigation_strategies: { type: "array", items: { type: "string" } }
                        }
                    },
                    evidence_summary: {
                        type: "object",
                        properties: {
                            documentation: { type: "array", items: { type: "string" } },
                            incidents: { type: "array", items: { type: "string" } },
                            communications: { type: "array", items: { type: "string" } },
                            assessments: { type: "array", items: { type: "string" } }
                        }
                    },
                    recommendations: { type: "array", items: { type: "string" } },
                    audit_checklist: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                item: { type: "string" },
                                status: { type: "string" },
                                notes: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        return Response.json({
            success: true,
            entity_type,
            entity_id,
            entity_name: entityName,
            audit_trail: response,
            raw_data: auditData,
            generated_date: new Date().toISOString(),
            generated_by: user.email
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});