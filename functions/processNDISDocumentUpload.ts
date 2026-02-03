import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Process NDIS Document Upload
 * Extracts key information from uploaded client documents (NDIS plans, medical records)
 * Automatically populates Client and NDISPlan entity fields
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json().catch(() => ({}));
    const { file_url, client_id, document_type } = payload;

    if (!file_url || !client_id) {
      return Response.json({ error: 'Missing file_url or client_id' }, { status: 400 });
    }

    // Determine document type and schema
    const docSchemas = {
      ndis_plan: {
        type: 'object',
        properties: {
          plan_number: { type: 'string' },
          plan_start_date: { type: 'string' },
          plan_end_date: { type: 'string' },
          total_budget: { type: 'number' },
          core_budget: { type: 'number' },
          capacity_building_budget: { type: 'number' },
          behaviour_support_budget: { type: 'number' },
          plan_manager: { type: 'string' },
          support_coordinator: { type: 'string' },
          stated_goals: { type: 'string' }
        }
      },
      medical_record: {
        type: 'object',
        properties: {
          diagnosis: { type: 'string' },
          diagnosis_date: { type: 'string' },
          medical_conditions: { type: 'array', items: { type: 'string' } },
          medications: { type: 'array', items: { type: 'string' } },
          allergies: { type: 'array', items: { type: 'string' } },
          specialist_referrals: { type: 'array', items: { type: 'string' } }
        }
      }
    };

    const schema = docSchemas[document_type] || docSchemas.ndis_plan;

    // Extract data from document
    const extractedData = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: schema
    });

    if (extractedData.status !== 'success' || !extractedData.output) {
      return Response.json({
        status: 'extraction_failed',
        message: extractedData.details || 'Could not extract data from document',
        error: extractedData.details
      }, { status: 400 });
    }

    const extracted = extractedData.output;
    const client = await base44.entities.Client.get(client_id);

    // Update based on document type
    let updatedPlan = null;
    if (document_type === 'ndis_plan') {
      // Find or create NDISPlan record
      const existingPlan = await base44.asServiceRole.entities.NDISPlan.filter(
        { client_id, status: 'active' },
        '-plan_start_date',
        1
      );

      const planData = {
        client_id,
        client_name: client.full_name,
        plan_number: extracted.plan_number,
        plan_start_date: extracted.plan_start_date,
        plan_end_date: extracted.plan_end_date,
        total_budget: extracted.total_budget,
        core_budget: extracted.core_budget || 0,
        capacity_building_budget: extracted.capacity_building_budget || 0,
        behaviour_support_budget: extracted.behaviour_support_budget || 0,
        plan_manager: extracted.plan_manager || 'plan_managed',
        plan_manager_name: extracted.plan_manager_name,
        support_coordinator: extracted.support_coordinator,
        stated_goals: extracted.stated_goals
      };

      if (existingPlan && existingPlan.length > 0) {
        // Update existing
        await base44.asServiceRole.entities.NDISPlan.update(existingPlan[0].id, planData);
        updatedPlan = { id: existingPlan[0].id, ...planData };
      } else {
        // Create new
        const newPlan = await base44.asServiceRole.entities.NDISPlan.create(planData);
        updatedPlan = newPlan;
      }

      // Also update Client entity with plan dates
      await base44.asServiceRole.entities.Client.update(client_id, {
        plan_start_date: extracted.plan_start_date,
        plan_end_date: extracted.plan_end_date,
        funding_allocated: extracted.total_budget
      });
    }

    // Log document processing for audit trail
    const docLog = {
      client_id,
      client_name: client.full_name,
      document_type,
      file_url,
      extracted_fields: Object.keys(extracted),
      extracted_data: extracted,
      processed_date: new Date().toISOString(),
      processed_by: user.email,
      status: 'completed'
    };

    // Create a case note documenting the document processing
    await base44.asServiceRole.entities.CaseNote.create({
      client_id,
      client_name: client.full_name,
      practitioner_id: user.id,
      practitioner_name: user.full_name,
      session_date: new Date().toISOString().split('T')[0],
      session_type: 'documentation',
      assessment: `Document processed: ${document_type}. Data extracted and fields populated.`,
      plan: JSON.stringify(docLog),
      status: 'completed'
    });

    return Response.json({
      status: 'success',
      message: 'Document processed and data extracted successfully',
      document_type,
      extracted_fields: Object.keys(extracted),
      extracted_data: extracted,
      updated_plan: updatedPlan,
      audit_log: docLog
    });

  } catch (error) {
    console.error('NDIS document processing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});