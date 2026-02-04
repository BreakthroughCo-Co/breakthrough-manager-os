import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Fetch current compliance baseline
        const [knowledgeBaseArticles, complianceItems, restrictivePractices, clientRiskProfiles] = await Promise.all([
            base44.asServiceRole.entities.KnowledgeBaseArticle.list(),
            base44.asServiceRole.entities.ComplianceItem.list(),
            base44.asServiceRole.entities.RestrictivePractice.list(),
            base44.asServiceRole.entities.ClientRiskProfile.list()
        ]);

        // Use AI with web search to detect NDIS policy changes
        const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `You are an NDIS compliance monitoring system. Search for recent NDIS policy changes, updates, and regulatory announcements.

Current date: ${new Date().toISOString().split('T')[0]}

Focus on:
1. NDIS Practice Standards updates
2. NDIS Quality and Safeguards Commission announcements
3. Behaviour Support regulations
4. Restrictive practices guidelines
5. Worker screening requirements
6. Risk assessment frameworks

For each significant change detected:
- Determine which internal entities might be affected
- Assess the severity and urgency
- Draft an impact assessment
- Suggest specific actions

Current Internal State Summary:
- Knowledge Base Articles: ${knowledgeBaseArticles.length} (categories: ${[...new Set(knowledgeBaseArticles.map(a => a.category))].join(', ')})
- Compliance Items: ${complianceItems.length}
- Restrictive Practices: ${restrictivePractices.length}
- Client Risk Profiles: ${clientRiskProfiles.length}

Identify policy changes from the last 90 days that would impact this NDIS provider.`,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    policy_changes: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                policy_source: {
                                    type: "string",
                                    enum: ["NDIS Commission", "NDIS Practice Standards", "State Legislation", "Federal Legislation", "Internal Policy"]
                                },
                                change_title: { type: "string" },
                                change_description: { type: "string" },
                                effective_date: { type: "string" },
                                severity: {
                                    type: "string",
                                    enum: ["critical", "high", "medium", "low"]
                                },
                                affected_entity_types: {
                                    type: "array",
                                    items: { type: "string" }
                                },
                                impact_assessment: { type: "string" },
                                suggested_actions: {
                                    type: "array",
                                    items: { type: "string" }
                                },
                                compliance_deadline: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        const detectedChanges = response.policy_changes || [];

        // Create PolicyChangeMonitor records for new changes
        const existingChanges = await base44.asServiceRole.entities.PolicyChangeMonitor.list();
        const newChanges = [];

        for (const change of detectedChanges) {
            // Check if similar change already tracked
            const isDuplicate = existingChanges.some(ec => 
                ec.change_title === change.change_title &&
                ec.policy_source === change.policy_source
            );

            if (!isDuplicate) {
                // Identify specific affected entities
                const affectedIds = [];
                
                if (change.affected_entity_types.includes('KnowledgeBaseArticle')) {
                    const relevantArticles = knowledgeBaseArticles.filter(a => 
                        change.change_description.toLowerCase().includes(a.category.toLowerCase()) ||
                        a.tags?.some(tag => change.change_description.toLowerCase().includes(tag.toLowerCase()))
                    );
                    affectedIds.push(...relevantArticles.map(a => a.id));
                }

                if (change.affected_entity_types.includes('ComplianceItem')) {
                    const relevantItems = complianceItems.filter(c => 
                        change.change_description.toLowerCase().includes(c.category.toLowerCase())
                    );
                    affectedIds.push(...relevantItems.map(c => c.id));
                }

                const newChange = await base44.asServiceRole.entities.PolicyChangeMonitor.create({
                    ...change,
                    detected_date: new Date().toISOString(),
                    affected_entity_ids: affectedIds,
                    status: 'detected'
                });
                newChanges.push(newChange);

                // Auto-create tasks for critical changes
                if (change.severity === 'critical' || change.severity === 'high') {
                    await base44.asServiceRole.entities.Task.create({
                        title: `Review Policy Change: ${change.change_title}`,
                        description: `${change.impact_assessment}\n\nSuggested Actions:\n${change.suggested_actions.join('\n')}`,
                        category: 'Compliance',
                        priority: change.severity === 'critical' ? 'urgent' : 'high',
                        status: 'pending',
                        due_date: change.compliance_deadline,
                        assigned_to: user.email,
                        related_entity_type: 'PolicyChangeMonitor',
                        related_entity_id: newChange.id
                    });
                }
            }
        }

        return Response.json({
            success: true,
            changes_detected: detectedChanges.length,
            new_changes_tracked: newChanges.length,
            new_changes: newChanges
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});