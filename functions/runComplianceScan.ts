import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { client_id, scan_scope = 'full' } = await req.json().catch(() => ({}));
        const scanDate = new Date().toISOString();

        // Fetch records to scan
        const filter = client_id ? { client_id } : {};
        const [clients, caseNotes, bsps, fbas, restrictive, credentials, trainingRecords] = await Promise.all([
            client_id
                ? base44.asServiceRole.entities.Client.get(client_id).then(c => [c]).catch(() => [])
                : base44.asServiceRole.entities.Client.filter({ status: 'active' }, null, 50),
            base44.asServiceRole.entities.CaseNote.filter(filter, '-session_date', 50),
            base44.asServiceRole.entities.BehaviourSupportPlan.filter(filter, '-start_date', 20),
            base44.asServiceRole.entities.FunctionalBehaviourAssessment.filter(filter, '-assessment_date', 20),
            base44.asServiceRole.entities.RestrictivePractice.filter(filter, null, 20),
            base44.asServiceRole.entities.PractitionerCredential.list(),
            base44.asServiceRole.entities.TrainingRecord.list()
        ]);

        const totalRecords = caseNotes.length + bsps.length + fbas.length + restrictive.length;
        const today = new Date();

        // Build compliance data snapshot for AI
        const snapshot = {
            clients_checked: clients.length,
            case_notes: caseNotes.map(n => ({
                id: n.id, client: n.client_name, date: n.session_date,
                has_soap: !!(n.subjective && n.objective && n.assessment && n.plan),
                has_goals: !!n.goals_addressed, status: n.status,
                has_refined_note: !!n.refined_note
            })),
            behaviour_support_plans: bsps.map(b => ({
                id: b.id, client: b.client_name, status: b.status,
                lifecycle_stage: b.lifecycle_stage, consent_obtained: b.consent_obtained,
                review_date: b.review_date,
                overdue_review: b.review_date && new Date(b.review_date) < today
            })),
            fbas: fbas.map(f => ({
                id: f.id, client: f.client_name, status: f.status,
                has_hypothesis: !!f.hypothesised_function, has_recommendations: !!f.recommendations
            })),
            restrictive_practices: restrictive.map(r => ({
                id: r.id, client: r.client_name, type: r.practice_type,
                authorisation_status: r.authorisation_status,
                expired_authorisation: r.expiry_date && new Date(r.expiry_date) < today,
                ndis_notified: r.ndis_notified, consent_obtained: r.consent_obtained
            })),
            credential_issues: credentials.filter(c => c.status === 'expired' || c.status === 'expiring_soon')
                .map(c => ({ practitioner: c.practitioner_name, type: c.credential_type, expiry: c.expiry_date, status: c.status })),
            training_issues: trainingRecords.filter(t => t.status === 'expired' || t.status === 'expiring_soon')
                .map(t => ({ practitioner: t.practitioner_name, module: t.module_name, expiry: t.expiry_date, status: t.status }))
        };

        const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `You are an NDIS Quality and Safeguards compliance auditor for an NDIS registered provider in Australia.
Analyse the following practice management data snapshot and identify compliance risks against NDIS Practice Standards, the NDIS Code of Conduct, and Behaviour Support regulatory requirements.

DATA SNAPSHOT:
${JSON.stringify(snapshot, null, 2)}

For each finding, classify severity (low/medium/high/critical), identify the specific NDIS standard breached, and provide a corrective action.
Calculate an overall audit readiness score from 0-100.
Be specific and reference actual record IDs where issues are found.`,
            response_json_schema: {
                type: "object",
                properties: {
                    audit_readiness_score: { type: "number" },
                    overall_risk_level: { type: "string" },
                    executive_summary: { type: "string" },
                    findings: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                finding_id: { type: "string" },
                                category: { type: "string" },
                                severity: { type: "string" },
                                description: { type: "string" },
                                record_reference: { type: "string" },
                                ndis_standard: { type: "string" },
                                corrective_action: { type: "string" },
                                timeline: { type: "string" }
                            }
                        }
                    },
                    corrective_actions: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                priority: { type: "string" },
                                action: { type: "string" },
                                responsible_party: { type: "string" },
                                deadline: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        const scanResult = await base44.asServiceRole.entities.ComplianceScanResult.create({
            scan_date: scanDate,
            scan_scope,
            client_id: client_id || '',
            client_name: client_id ? (clients[0]?.full_name || '') : 'All Clients',
            risk_level: aiResult?.overall_risk_level || 'medium',
            total_records_scanned: totalRecords,
            issues_found: aiResult?.findings?.length || 0,
            findings: JSON.stringify(aiResult?.findings || []),
            corrective_actions: JSON.stringify(aiResult?.corrective_actions || []),
            audit_readiness_score: aiResult?.audit_readiness_score || 0,
            status: 'pending_review'
        });

        return Response.json({
            success: true,
            scan_id: scanResult.id,
            audit_readiness_score: aiResult?.audit_readiness_score,
            risk_level: aiResult?.overall_risk_level,
            issues_found: aiResult?.findings?.length || 0,
            executive_summary: aiResult?.executive_summary,
            findings: aiResult?.findings || [],
            corrective_actions: aiResult?.corrective_actions || []
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});