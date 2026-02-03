import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { document_name, file_content_preview } = await req.json();

    if (!document_name || !file_content_preview) {
      return Response.json(
        { error: 'Missing document_name or file_content_preview' },
        { status: 400 }
      );
    }

    // Use LLM to classify document type
    const classificationResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `Classify the following NDIS-related document. Based on the document name and content preview, determine its type.

Document Name: ${document_name}
Content Preview (first 500 chars):
${file_content_preview}

Respond with ONLY a JSON object containing:
{
  "document_type": "one of: ndis_plan, medical_record, assessment_report, support_agreement, other",
  "confidence": 0-100,
  "reasoning": "brief explanation"
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          document_type: {
            type: 'string',
            enum: ['ndis_plan', 'medical_record', 'assessment_report', 'support_agreement', 'other']
          },
          confidence: { type: 'number', minimum: 0, maximum: 100 },
          reasoning: { type: 'string' }
        }
      }
    });

    return Response.json({
      success: true,
      document_type: classificationResponse.document_type,
      confidence: classificationResponse.confidence,
      reasoning: classificationResponse.reasoning
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});