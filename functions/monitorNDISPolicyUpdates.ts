import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Invoke LLM with web search to fetch latest NDIS policy updates
    const policyResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `Fetch and summarise the latest NDIS regulatory updates, policy changes, and compliance requirements from official NDIS sources (NDIS.gov.au). 
      Focus on:
      1. Changes to NDIS pricing, support categories, or line item definitions
      2. Updates to worker screening, mandatory training, or credentialing requirements
      3. New restrictions on Behaviour Support Plans or Restrictive Practices
      4. Plan management or PRODA submission changes
      5. Quality and Safeguards Commission updates
      
      For each identified change, provide:
      - Title and effective date
      - Impact on operations (HIGH/MEDIUM/LOW)
      - Recommended compliance actions
      - Affected entities (Practitioners, Clients, or Systems)
      
      Return as JSON array.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          updates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                effective_date: { type: 'string' },
                impact_level: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
                summary: { type: 'string' },
                compliance_actions: { type: 'array', items: { type: 'string' } },
                affected_entities: { type: 'array', items: { type: 'string' } },
                source_url: { type: 'string' }
              }
            }
          },
          last_checked: { type: 'string' }
        }
      }
    });

    const updates = policyResponse.updates || [];
    let itemsUpdated = 0;
    let alertsCreated = 0;
    const complianceItems = await base44.entities.ComplianceItem.list();
    const practitioners = await base44.entities.Practitioner.filter({ status: 'active' });

    // Process HIGH and MEDIUM impact updates
    for (const update of updates) {
      if (['HIGH', 'MEDIUM'].includes(update.impact_level)) {
        // Check if corresponding ComplianceItem exists
        const existingItem = complianceItems.find(ci => 
          ci.title.toLowerCase().includes(update.title.toLowerCase()) ||
          ci.description?.toLowerCase().includes(update.summary?.toLowerCase())
        );

        if (!existingItem && update.impact_level === 'HIGH') {
          // Create new ComplianceItem for high-impact changes
          await base44.asServiceRole.entities.ComplianceItem.create({
            title: update.title,
            category: 'NDIS Registration',
            description: `Policy Update (${update.effective_date}): ${update.summary}. Actions: ${update.compliance_actions.join(', ')}`,
            status: 'pending_review',
            priority: 'critical',
            due_date: update.effective_date,
            responsible_person: 'Compliance Manager'
          });
          itemsUpdated++;
        }

        // If update affects training or credentials, flag practitioners
        if (update.affected_entities?.includes('Practitioners')) {
          for (const practitioner of practitioners) {
            // Create alert notification via Task
            await base44.asServiceRole.entities.Task.create({
              title: `NDIS Policy Update: ${update.title}`,
              description: `Effective ${update.effective_date}. Impact: ${update.impact_level}.\n\nActions required:\n${update.compliance_actions.map((a, i) => `${i+1}. ${a}`).join('\n')}\n\nReview and confirm compliance within 14 days.`,
              category: 'Compliance',
              priority: update.impact_level === 'HIGH' ? 'urgent' : 'high',
              status: 'pending',
              assigned_to: practitioner.full_name,
              related_entity_type: 'Practitioner',
              related_entity_id: practitioner.id
            });
            alertsCreated++;
          }
        }
      }
    }

    // Auto-trigger credential/training expiry alerts
    const credentials = await base44.entities.PractitionerCredential.list();
    const training = await base44.entities.TrainingRecord.list();
    let expiryAlertsCreated = 0;

    credentials.forEach(cred => {
      const daysUntilExpiry = (new Date(cred.expiry_date) - new Date()) / (1000 * 60 * 60 * 24);
      if (daysUntilExpiry > 0 && daysUntilExpiry <= 90 && !cred.alert_sent_90d) {
        // Mark alert sent and create notification
        base44.asServiceRole.entities.PractitionerCredential.update(cred.id, {
          alert_sent_90d: true
        });
        expiryAlertsCreated++;
      }
    });

    training.forEach(tr => {
      const daysUntilExpiry = (new Date(tr.expiry_date) - new Date()) / (1000 * 60 * 60 * 24);
      if (daysUntilExpiry > 0 && daysUntilExpiry <= 60 && !tr.alert_sent) {
        base44.asServiceRole.entities.TrainingRecord.update(tr.id, {
          alert_sent: true
        });
        expiryAlertsCreated++;
      }
    });

    return Response.json({
      scan_timestamp: new Date().toISOString(),
      policy_updates_found: updates.length,
      high_impact_updates: updates.filter(u => u.impact_level === 'HIGH').length,
      compliance_items_created: itemsUpdated,
      practitioner_alerts_created: alertsCreated,
      expiry_alerts_sent: expiryAlertsCreated,
      summary: `Scanned NDIS sources. ${updates.length} updates identified (${updates.filter(u => u.impact_level === 'HIGH').length} high-impact). ${itemsUpdated} new compliance items created. ${alertsCreated} practitioner notifications sent. ${expiryAlertsCreated} credential/training expiry alerts triggered.`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});