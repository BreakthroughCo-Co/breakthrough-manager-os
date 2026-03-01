import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 });

    const { file_url, client_id } = await req.json();
    if (!file_url || !client_id) {
      return Response.json({ error: 'file_url and client_id are required' }, { status: 400 });
    }

    // Extract structured data from NDIS plan PDF/document
    const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          participant_name: { type: "string", description: "Full name of NDIS participant" },
          ndis_number: { type: "string", description: "NDIS participant number (9 digits)" },
          plan_start_date: { type: "string", description: "Plan start date in YYYY-MM-DD format" },
          plan_end_date: { type: "string", description: "Plan end date in YYYY-MM-DD format" },
          funding_allocated: { type: "number", description: "Total plan funding amount in AUD" },
          support_categories: {
            type: "array",
            items: { type: "string" },
            description: "NDIS support categories listed in plan"
          },
          goals: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                category: { type: "string" }
              }
            },
            description: "Participant goals extracted from plan"
          },
          primary_disability: { type: "string" },
          plan_manager_type: { type: "string", description: "self-managed, plan-managed, or agency-managed" }
        }
      }
    });

    if (extracted.status !== 'success') {
      return Response.json({ error: 'Extraction failed', details: extracted.details }, { status: 422 });
    }

    const planData = extracted.output;

    // Patch the Client entity with extracted fields
    const clientUpdates = {};
    if (planData.plan_start_date) clientUpdates.plan_start_date = planData.plan_start_date;
    if (planData.plan_end_date) clientUpdates.plan_end_date = planData.plan_end_date;
    if (planData.funding_allocated) clientUpdates.funding_allocated = planData.funding_allocated;
    if (planData.ndis_number) clientUpdates.ndis_number = planData.ndis_number;

    if (Object.keys(clientUpdates).length > 0) {
      await base44.entities.Client.update(client_id, clientUpdates);
    }

    // Create ClientGoal entities for each extracted goal
    const createdGoals = [];
    if (planData.goals && planData.goals.length > 0) {
      for (const goal of planData.goals) {
        if (goal.title) {
          const created = await base44.entities.ClientGoal.create({
            client_id,
            title: goal.title,
            description: goal.description || '',
            category: goal.category || 'NDIS Plan Goal',
            status: 'active',
            source: 'ndis_plan_extraction',
          });
          createdGoals.push(created);
        }
      }
    }

    return Response.json({
      ok: true,
      client_fields_updated: clientUpdates,
      goals_created: createdGoals.length,
      extracted_data: planData,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});