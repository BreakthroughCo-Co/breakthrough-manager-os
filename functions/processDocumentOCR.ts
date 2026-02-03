import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { document_id, file_url } = await req.json();

    // Fetch the document
    const response = await fetch(file_url);
    if (!response.ok) {
      throw new Error('Failed to fetch document');
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Use AI to extract text from image/PDF
    const extractedText = await base44.integrations.Core.InvokeLLM({
      prompt: `Extract all text content from this document. Return only the extracted text, maintaining structure where possible.`,
      file_urls: [file_url]
    });

    // Update document with extracted text
    await base44.asServiceRole.entities.ClientDocument.update(document_id, {
      extracted_text: extractedText,
      ocr_processed: true,
    });

    return Response.json({
      document_id,
      extracted_text: extractedText,
      text_length: extractedText.length,
      processed_date: new Date().toISOString(),
    });
  } catch (error) {
    console.error('OCR processing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});