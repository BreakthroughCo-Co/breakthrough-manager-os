import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { alert_id, entity_type, entity_id, event_type } = await req.json();

        // Fetch the entity data based on type
        let entityData = null;
        let workflowContext = {};

        if (alert_id) {
            // Workflow triggered by a proactive alert
            const alert = await base44.asServiceRole.entities.ProactiveAlert.get(alert_id);
            entityData = alert;
            workflowContext = {
                trigger: 'proactive_alert',
                alert_type: alert.alert_type,
                severity: alert.severity,
                related_entity_type: alert.related_entity_type,
                related_entity_id: alert.related_entity_id
            };
        } else if (entity_type && entity_id) {
            // Workflow triggered by entity event
            workflowContext = {
                trigger: 'entity_event',
                entity_type,
                entity_id,
                event_type
            };
        }

        // Fetch related data for context
        let relatedData = {};
        if (workflowContext.related_entity_type === 'Client' || entity_type === 'Client') {
            const clientId = workflowContext.related_entity_id || entity_id;
            const [client, caseNotes, goals] = await Promise.all([
                base44.asServiceRole.entities.Client.get(clientId),
                base44.asServiceRole.entities.CaseNote.filter({ client_id: clientId }),
                base44.asServiceRole.entities.ClientGoal.filter({ client_id: clientId })
            ]);
            relatedData = { client, recent_case_notes: caseNotes.slice(0, 5), goals };
        } else if (workflowContext.related_entity_type === 'Incident' || entity_type === 'Incident') {
            const incidentId = workflowContext.related_entity_id || entity_id;
            const incident = await base44.asServiceRole.entities.Incident.get(incidentId);
            relatedData = { incident };
        } else if (workflowContext.related_entity_type === 'ComplianceItem' || entity_type === 'ComplianceItem') {
            const complianceId = workflowContext.related_entity_id || entity_id;
            const complianceItem = await base44.asServiceRole.entities.ComplianceItem.get(complianceId);
            relatedData = { complianceItem };
        }

        // Use AI to determine workflow actions
        const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `You are an AI workflow orchestration system for an NDIS provider. Based on the following context, determine what automated actions should be taken to support the manager.

Workflow Context:
${JSON.stringify(workflowContext, null, 2)}

Related Data:
${JSON.stringify(relatedData, null, 2)}

Alert/Entity Data:
${JSON.stringify(entityData, null, 2)}

Your task:
1. Determine what follow-up tasks should be automatically created
2. Identify if any communications should be drafted (internal messages or client communications)
3. Suggest any forms or documents that should be pre-filled
4. Ensure all actions are NDIS-compliant and audit-ready

Generate specific, actionable workflow steps that reduce managerial cognitive load while maintaining compliance and quality.`,
            response_json_schema: {
                type: "object",
                properties: {
                    tasks_to_create: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                title: { type: "string" },
                                description: { type: "string" },
                                category: { type: "string" },
                                priority: { type: "string" },
                                due_date: { type: "string" },
                                assigned_to: { type: "string" },
                                related_entity_type: { type: "string" },
                                related_entity_id: { type: "string" }
                            }
                        }
                    },
                    messages_to_draft: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                recipient_id: { type: "string" },
                                subject: { type: "string" },
                                content: { type: "string" },
                                message_type: { type: "string" },
                                priority: { type: "string" }
                            }
                        }
                    },
                    client_communications_to_draft: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                client_id: { type: "string" },
                                communication_type: { type: "string" },
                                subject: { type: "string" },
                                content: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        const orchestrationResults = {
            tasks_created: [],
            messages_drafted: [],
            communications_drafted: []
        };

        // Create tasks
        for (const task of response.tasks_to_create || []) {
            const createdTask = await base44.asServiceRole.entities.Task.create({
                ...task,
                status: 'pending',
                notes: `Auto-generated by AI workflow orchestration`
            });
            orchestrationResults.tasks_created.push(createdTask);
        }

        // Draft messages
        for (const message of response.messages_to_draft || []) {
            const draftedMessage = await base44.asServiceRole.entities.Message.create({
                sender_id: 'system',
                sender_name: 'Breakthrough Manager OS',
                ...message,
                is_read: false
            });
            orchestrationResults.messages_drafted.push(draftedMessage);
        }

        // Draft client communications
        for (const comm of response.client_communications_to_draft || []) {
            const draftedComm = await base44.asServiceRole.entities.ClientCommunication.create({
                ...comm,
                status: 'draft',
                sent_date: null
            });
            orchestrationResults.communications_drafted.push(draftedComm);
        }

        // Update alert with generated task IDs if applicable
        if (alert_id) {
            const taskIds = orchestrationResults.tasks_created.map(t => t.id);
            await base44.asServiceRole.entities.ProactiveAlert.update(alert_id, {
                auto_generated_task_ids: taskIds
            });
        }

        return Response.json({
            success: true,
            ...orchestrationResults
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});