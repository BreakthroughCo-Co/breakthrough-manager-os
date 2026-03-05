import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const managerEmail = Deno.env.get('MANAGER_EMAIL');
        const today = new Date();
        const in30 = new Date(today); in30.setDate(in30.getDate() + 30);

        const docs = await base44.asServiceRole.entities.ResourceDocument.filter({ status: 'current' });
        const alerts = [];

        for (const doc of docs) {
            if (!doc.review_due_date) continue;
            const reviewDate = new Date(doc.review_due_date);
            const daysUntil = Math.ceil((reviewDate - today) / 86400000);

            if (daysUntil <= 30) {
                alerts.push({ doc, daysUntil });

                // Create a Task
                await base44.asServiceRole.entities.Task.create({
                    title: `Document Review Due: ${doc.title}`,
                    description: `"${doc.title}" (v${doc.version || '1.0'}, ${doc.category}) ${daysUntil < 0 ? `is ${Math.abs(daysUntil)} day(s) overdue for review.` : `is due for review in ${daysUntil} day(s) on ${doc.review_due_date}.`} Review and update or confirm currency.`,
                    category: 'Compliance',
                    priority: daysUntil < 0 ? 'critical' : 'high',
                    status: 'pending',
                    assigned_to: managerEmail,
                    related_entity_type: 'ResourceDocument',
                    related_entity_id: doc.id
                });
            }
        }

        if (alerts.length > 0 && managerEmail) {
            const rows = alerts.map(a =>
                `- "${a.doc.title}" (v${a.doc.version || '1.0'}, ${a.doc.category}): ${a.daysUntil < 0 ? `OVERDUE by ${Math.abs(a.daysUntil)} day(s)` : `due in ${a.daysUntil} day(s) on ${a.doc.review_due_date}`}`
            ).join('\n');

            await base44.asServiceRole.integrations.Core.SendEmail({
                to: managerEmail,
                subject: `[Breakthrough Manager OS] ${alerts.length} Resource Document Review(s) Due`,
                body: `The following documents in the Resource Library are due for review:\n\n${rows}\n\nLog in to the Resource Library to action these items and maintain NDIS audit compliance.`
            });
        }

        return Response.json({
            success: true,
            documents_checked: docs.length,
            alerts_raised: alerts.length
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});