import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const ENTITY_MAP = {
    compliance: 'ComplianceItem',
    incidents: 'Incident',
    worker_screening: 'WorkerScreening',
    training: 'TrainingProgress',
    restrictive_practices: 'RestrictivePractice',
    bsps: 'BehaviourSupportPlan',
    risk_assessments: 'RiskAssessment',
    clients: 'Client',
    practitioners: 'Practitioner',
    audit_log: 'AuditLog',
};

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const body = await req.json();
        const { sections = [], date_from, date_to } = body;

        const packageData = {
            metadata: {
                generated_at: new Date().toISOString(),
                generated_by: user.full_name,
                generated_by_email: user.email,
                period_from: date_from || null,
                period_to: date_to || null,
                sections_included: sections,
            },
        };

        const fetchPromises = sections.map(async (sectionId) => {
            const entityName = ENTITY_MAP[sectionId];
            if (!entityName) return [sectionId, []];
            try {
                const records = await base44.asServiceRole.entities[entityName].list('-created_date', 500);
                return [sectionId, records || []];
            } catch (_e) {
                return [sectionId, []];
            }
        });

        const results = await Promise.all(fetchPromises);
        results.forEach(([sectionId, records]) => {
            packageData[sectionId] = records;
        });

        return Response.json(packageData);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});