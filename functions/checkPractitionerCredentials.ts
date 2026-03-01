import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const today = new Date();
        const in90 = new Date(today); in90.setDate(in90.getDate() + 90);
        const in60 = new Date(today); in60.setDate(in60.getDate() + 60);
        const in30 = new Date(today); in30.setDate(in30.getDate() + 30);

        const [credentials, trainingRecords] = await Promise.all([
            base44.asServiceRole.entities.PractitionerCredential.list(),
            base44.asServiceRole.entities.TrainingRecord.list()
        ]);

        const managerEmail = Deno.env.get('MANAGER_EMAIL');
        const alerts = [];
        const credUpdates = [];
        const trainingUpdates = [];

        for (const cred of credentials) {
            if (!cred.expiry_date) continue;
            const expiry = new Date(cred.expiry_date);
            const daysUntil = Math.ceil((expiry - today) / 86400000);
            let newStatus = daysUntil < 0 ? 'expired' : daysUntil <= 30 ? 'expiring_soon' : cred.status;

            if (daysUntil <= 30 && !cred.alert_sent_30d) {
                alerts.push({ type: 'credential', name: cred.credential_name || cred.credential_type, practitioner: cred.practitioner_name, days: daysUntil, id: cred.id, field: 'alert_sent_30d', entity: 'PractitionerCredential' });
            } else if (daysUntil <= 60 && daysUntil > 30 && !cred.alert_sent_60d) {
                alerts.push({ type: 'credential', name: cred.credential_name || cred.credential_type, practitioner: cred.practitioner_name, days: daysUntil, id: cred.id, field: 'alert_sent_60d', entity: 'PractitionerCredential' });
            } else if (daysUntil <= 90 && daysUntil > 60 && !cred.alert_sent_90d) {
                alerts.push({ type: 'credential', name: cred.credential_name || cred.credential_type, practitioner: cred.practitioner_name, days: daysUntil, id: cred.id, field: 'alert_sent_90d', entity: 'PractitionerCredential' });
            }

            if (newStatus !== cred.status) credUpdates.push({ id: cred.id, status: newStatus });
        }

        for (const tr of trainingRecords) {
            if (!tr.expiry_date) continue;
            const expiry = new Date(tr.expiry_date);
            const daysUntil = Math.ceil((expiry - today) / 86400000);
            let newStatus = daysUntil < 0 ? 'expired' : daysUntil <= 30 ? 'expiring_soon' : tr.status;

            if (daysUntil <= 30 && !tr.alert_sent) {
                alerts.push({ type: 'training', name: tr.module_name, practitioner: tr.practitioner_name, days: daysUntil, id: tr.id, field: 'alert_sent', entity: 'TrainingRecord' });
            }

            if (newStatus !== tr.status) trainingUpdates.push({ id: tr.id, status: newStatus });
        }

        // Apply status updates
        await Promise.all([
            ...credUpdates.map(u => base44.asServiceRole.entities.PractitionerCredential.update(u.id, { status: u.status })),
            ...trainingUpdates.map(u => base44.asServiceRole.entities.TrainingRecord.update(u.id, { status: u.status }))
        ]);

        // Send consolidated email
        if (alerts.length > 0 && managerEmail) {
            const rows = alerts.map(a =>
                `- [${a.type.toUpperCase()}] ${a.practitioner}: "${a.name}" — ${a.days < 0 ? 'EXPIRED' : `expires in ${a.days} day(s)`}`
            ).join('\n');

            await base44.asServiceRole.integrations.Core.SendEmail({
                to: managerEmail,
                subject: `[Breakthrough Manager OS] ${alerts.length} Credential/Training Alert(s)`,
                body: `The following practitioner credentials and training records require action:\n\n${rows}\n\nLog in to Practitioner Compliance to action these items.`
            });

            // Mark alerts sent
            await Promise.all(alerts.map(a => {
                const payload = {};
                payload[a.field] = true;
                return base44.asServiceRole.entities[a.entity].update(a.id, payload);
            }));
        }

        return Response.json({
            success: true,
            credentials_checked: credentials.length,
            training_checked: trainingRecords.length,
            alerts_sent: alerts.length
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});