import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
        }

        // Fetch active scheduling rules
        const rules = await base44.asServiceRole.entities.OutreachSchedulingRule.filter({ is_active: true });

        const results = {
            evaluated_rules: 0,
            scheduled_messages: 0,
            messages_created: []
        };

        for (const rule of rules) {
            try {
                // Parse client criteria
                let criteria = {};
                try {
                    criteria = JSON.parse(rule.client_criteria || '{}');
                } catch (e) {
                    console.error(`Invalid criteria for rule ${rule.id}:`, e);
                    continue;
                }

                // Fetch matching clients
                const clients = await base44.asServiceRole.entities.Client.filter(criteria);

                for (const client of clients) {
                    // Check if message should be scheduled
                    let shouldSchedule = false;

                    if (rule.trigger_type === 'date_based') {
                        // Check if enough time has passed since last trigger
                        if (rule.last_trigger_date) {
                            const daysSinceLastTrigger = (new Date() - new Date(rule.last_trigger_date)) / (1000 * 60 * 60 * 24);
                            shouldSchedule = daysSinceLastTrigger >= (rule.frequency_days || 30);
                        } else {
                            shouldSchedule = true;
                        }
                    } else if (rule.trigger_type === 'inactivity') {
                        // Check last case note or communication
                        const recentCaseNotes = await base44.asServiceRole.entities.CaseNote.filter(
                            { client_id: client.id },
                            '-session_date',
                            1
                        );
                        if (recentCaseNotes.length > 0) {
                            const daysSinceLastNote = (new Date() - new Date(recentCaseNotes[0].session_date)) / (1000 * 60 * 60 * 24);
                            shouldSchedule = daysSinceLastNote >= (rule.frequency_days || 14);
                        } else {
                            shouldSchedule = true;
                        }
                    } else if (rule.trigger_type === 'milestone') {
                        // Check for plan review dates or goal achievements
                        if (client.plan_end_date) {
                            const daysUntilPlanEnd = (new Date(client.plan_end_date) - new Date()) / (1000 * 60 * 60 * 24);
                            shouldSchedule = daysUntilPlanEnd <= 60 && daysUntilPlanEnd > 0;
                        }
                    }

                    if (shouldSchedule && rule.auto_schedule) {
                        // Generate personalized message
                        const messageResponse = await base44.asServiceRole.functions.invoke('generatePersonalizedOutreach', {
                            client_id: client.id,
                            template: rule.message_template,
                            message_type: rule.message_type
                        });

                        const message = messageResponse.data?.message || rule.message_template;

                        // Schedule the outreach
                        const scheduledDate = new Date();
                        scheduledDate.setDate(scheduledDate.getDate() + 1); // Schedule for tomorrow

                        const scheduledOutreach = await base44.asServiceRole.entities.ScheduledOutreach.create({
                            client_id: client.id,
                            client_name: client.full_name,
                            message_type: rule.message_type,
                            subject: `Check-in from Breakthrough Coaching`,
                            message_body: message,
                            scheduled_date: scheduledDate.toISOString(),
                            send_status: 'scheduled',
                            created_by: 'System (Auto-scheduled)'
                        });

                        results.scheduled_messages++;
                        results.messages_created.push({
                            client: client.full_name,
                            rule: rule.rule_name,
                            scheduled_date: scheduledDate
                        });
                    }
                }

                // Update rule's last trigger date
                await base44.asServiceRole.entities.OutreachSchedulingRule.update(rule.id, {
                    last_trigger_date: new Date().toISOString()
                });

                results.evaluated_rules++;

            } catch (ruleError) {
                console.error(`Error evaluating rule ${rule.id}:`, ruleError);
            }
        }

        return Response.json({
            success: true,
            results,
            evaluated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error evaluating outreach rules:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});