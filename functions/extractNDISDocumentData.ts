import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, document_type } = await req.json();

    if (!file_url || !document_type) {
      return Response.json({ error: 'Missing file_url or document_type' }, { status: 400 });
    }

    // Define extraction schemas based on document type
    const schemas = {
      ndis_plan: {
        participant_id: { type: 'string', description: 'NDIS participant ID' },
        plan_start_date: { type: 'string', description: 'Plan start date (YYYY-MM-DD)' },
        plan_end_date: { type: 'string', description: 'Plan end date (YYYY-MM-DD)' },
        total_funding: { type: 'number', description: 'Total plan funding allocated' },
        funding_split: {
          type: 'object',
          description: 'JSON object of funding allocations by support category',
          properties: {
            behaviour_support: { type: 'number' },
            capacity_building: { type: 'number' },
            other: { type: 'number' }
          }
        },
        participant_name: { type: 'string', description: 'Participant full name' },
        participant_dob: { type: 'string', description: 'Date of birth (YYYY-MM-DD)' },
        primary_contact_name: { type: 'string', description: 'Primary contact/guardian name' }
      },
      medical_record: {
        client_name: { type: 'string', description: 'Client full name' },
        date_of_birth: { type: 'string', description: 'Date of birth (YYYY-MM-DD)' },
        diagnosis: { type: 'string', description: 'Primary diagnosis' },
        medical_history: { type: 'string', description: 'Relevant medical history' },
        medications: { type: 'string', description: 'Current medications' },
        allergies: { type: 'string', description: 'Known allergies' },
        contact_phone: { type: 'string', description: 'Contact phone number' },
        contact_email: { type: 'string', description: 'Contact email' }
      },
      assessment_report: {
        client_name: { type: 'string', description: 'Client name' },
        assessment_date: { type: 'string', description: 'Assessment date (YYYY-MM-DD)' },
        assessor_name: { type: 'string', description: 'Assessor name' },
        key_findings: { type: 'string', description: 'Key findings and observations' },
        recommendations: { type: 'string', description: 'Recommendations' },
        support_needs: { type: 'array', items: { type: 'string' } }
      },
      support_agreement: {
        participant_name: { type: 'string', description: 'Participant name' },
        agreement_date: { type: 'string', description: 'Agreement date (YYYY-MM-DD)' },
        services_covered: { type: 'array', items: { type: 'string' } },
        support_hours: { type: 'number', description: 'Total support hours allocated' },
        frequency: { type: 'string', description: 'Support frequency (e.g., weekly)' }
      }
    };

    const selectedSchema = schemas[document_type] || schemas.ndis_plan;

    // Use LLM with vision to extract data from document with confidence scores
    const extractionResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `Extract data from the provided NDIS document. For each field, provide the extracted value and a confidence score (0-100) representing how confident you are in the accuracy of the extraction.

Return a JSON object where each field contains:
- "value": the extracted data
- "confidence": confidence score (0-100)

Be conservative with confidence scores. If a field is unclear or missing, set confidence below 50 and note "UNCLEAR" in the value.

Document Type: ${document_type}
Expected Fields: ${Object.keys(selectedSchema).join(', ')}`,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        additionalProperties: {
          type: 'object',
          properties: {
            value: { type: ['string', 'number', 'array', 'object', 'null'] },
            confidence: { type: 'number', minimum: 0, maximum: 100 }
          }
        }
      }
    });

    // Calculate average confidence
    const confidenceScores = Object.values(extractionResponse).map(field => field.confidence || 0);
    const averageConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
      : 0;

    return Response.json({
      success: true,
      extracted_data: extractionResponse,
      average_confidence: Math.round(averageConfidence),
      field_count: Object.keys(extractionResponse).length,
      fields_requiring_review: Object.entries(extractionResponse)
        .filter(([_, field]) => field.confidence < 70)
        .map(([key, _]) => key)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});