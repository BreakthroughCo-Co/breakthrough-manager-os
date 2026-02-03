import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Proactive Regulatory Scanning & Compliance Monitoring
 * Monitors NDIS policy updates and flags relevant compliance items
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch current compliance items for comparison
    const existingCompliance = await base44.asServiceRole.entities.ComplianceItem.list();

    // Key NDIS policy areas to monitor
    const policySearchAreas = [
      'NDIS quality and safeguards standards',
      'NDIS worker screening requirements',
      'NDIS pricing and funding updates 2025-26',
      'NDIS behavior support practice standards',
      'NDIS restrictive practice guidelines'
    ];

    // Search for policy updates
    const policyUpdates = [];
    for (const area of policySearchAreas) {
      try {
        // Search for relevant policy information
        const searchResults = await fetch(
          `https://www.ndis.gov.au/api/search?q=${encodeURIComponent(area)}&limit=3`
        ).then(r => r.json()).catch(() => ({ items: [] }));

        if (searchResults.items && searchResults.items.length > 0) {
          policyUpdates.push(...searchResults.items.map(item => ({
            policy_area: area,
            title: item.title || '',
            url: item.url || '',
            last_updated: item.date || new Date().toISOString()
          })));
        }
      } catch (e) {
        console.log(`Could not fetch ${area}`);
      }
    }

    // Build compliance context
    const complianceContext = `
CURRENT COMPLIANCE ITEMS:
${existingCompliance.slice(0, 20).map(c => 
  `- ${c.title} (${c.category}): ${c.status}`
).join('\n')}

DETECTED POLICY UPDATES/AREAS TO MONITOR:
${policyUpdates.slice(0, 10).map(p =>
  `- ${p.policy_area}: ${p.title}`
).join('\n')}

NDIS SERVICE DELIVERY CONTEXT:
- Primary Services: Behaviour Support, LEGO Therapy, Capacity Building
- Registration Status: Required
- Current Focus Areas: Quality & Safeguards, Worker Screening, Documentation`;

    // Use AI to identify compliance gaps
    const complianceReview = await base44.integrations.Core.InvokeLLM({
      prompt: `${complianceContext}

Based on current NDIS compliance requirements and detected policy updates, provide:

1. **Compliance Gaps** - Any areas where current compliance items may be outdated or missing
2. **Recommended New Compliance Items** - Specific policies/standards that should be monitored
3. **Urgent Updates Needed** - Any critical compliance areas requiring immediate attention
4. **Documentation Recommendations** - Specific evidence or documentation needed for audit readiness
5. **Training Implications** - Any staff training requirements based on policy changes

Focus on practical, NDIS-specific compliance for a behaviour support provider.`,
      response_json_schema: {
        type: "object",
        properties: {
          compliance_gaps: { type: "array", items: { type: "string" } },
          recommended_items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                category: { type: "string" },
                description: { type: "string" },
                priority: { type: "string", enum: ["critical", "high", "medium"] }
              }
            }
          },
          urgent_updates: { type: "array", items: { type: "string" } },
          documentation_needs: { type: "array", items: { type: "string" } },
          training_implications: { type: "array", items: { type: "string" } }
        }
      }
    });

    // Create ComplianceItem entities for new recommendations
    const createdItems = [];
    for (const item of complianceReview.recommended_items) {
      // Check if item already exists
      const exists = existingCompliance.some(c => c.title === item.title);
      if (!exists && (item.priority === 'critical' || item.priority === 'high')) {
        const newItem = {
          title: item.title,
          category: item.category || 'NDIS Compliance',
          description: item.description,
          status: 'pending_review',
          priority: item.priority === 'critical' ? 'critical' : 'high',
          notes: 'AI-identified from regulatory scanning',
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        };

        const created = await base44.asServiceRole.entities.ComplianceItem.create(newItem);
        createdItems.push(created);
      }
    }

    // Create task for compliance review if urgent items found
    if (complianceReview.urgent_updates.length > 0) {
      await base44.asServiceRole.entities.Task.create({
        title: 'URGENT: Compliance Updates Required - Regulatory Scan Results',
        description: `AI regulatory scan identified urgent compliance updates needed:\n\n${complianceReview.urgent_updates.map(u => `• ${u}`).join('\n')}\n\nPlease review and implement immediately.`,
        category: 'Compliance',
        priority: 'urgent',
        status: 'pending',
        due_date: new Date().toISOString().split('T')[0]
      });
    }

    return Response.json({
      scan_date: new Date().toISOString(),
      policy_sources_checked: policySearchAreas.length,
      compliance_items_created: createdItems.length,
      urgent_items_found: complianceReview.urgent_updates.length,
      review_results: complianceReview,
      created_items: createdItems
    });

  } catch (error) {
    console.error('Regulatory scanning error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});