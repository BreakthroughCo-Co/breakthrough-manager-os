import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { document_type, entity_type, entity_id, folder_name } = body;

    if (!document_type || !entity_type || !entity_id) {
      return Response.json({ error: 'document_type, entity_type, entity_id required' }, { status: 400 });
    }

    // Fetch source entity data
    let entityData = {};
    if (entity_type === 'Client') {
      entityData = await base44.asServiceRole.entities.Client.get(entity_id);
    } else if (entity_type === 'ServiceAgreement') {
      entityData = await base44.asServiceRole.entities.ServiceAgreement.get(entity_id);
    } else if (entity_type === 'BehaviourSupportPlan') {
      entityData = await base44.asServiceRole.entities.BehaviourSupportPlan.get(entity_id);
    }

    // Generate document content via AI
    const templates = {
      service_agreement: `Draft a professional NDIS Service Agreement for participant: ${JSON.stringify(entityData)}. Include: parties involved, services to be delivered, funding amounts, cancellation policy (aligned to NDIS pricing arrangements), and consent provisions. Use formal Australian legal language.`,
      plan_review_letter: `Draft a formal NDIS Plan Review Letter for participant: ${JSON.stringify(entityData)}. Include current goal progress, funding utilisation summary, recommended supports for next plan period, and next steps. Use professional clinical language.`,
      bsp_cover_letter: `Draft a Behaviour Support Plan cover letter for: ${JSON.stringify(entityData)}. Include purpose statement, legislative compliance (NDIS (Restrictive Practices and Behaviour Support) Rules 2018), practitioner credentials note, and review schedule.`,
      discharge_summary: `Draft a clinical discharge summary for NDIS participant: ${JSON.stringify(entityData)}. Include period of support, goals achieved, outcomes attained, recommendations for future supports, and practitioner sign-off section.`
    };

    const prompt = templates[document_type] || `Generate a professional ${document_type} document for NDIS context: ${JSON.stringify(entityData)}`;

    const content = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });

    // Upload to Google Drive
    const driveToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    const fileName = `${document_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} - ${entityData.full_name || entityData.client_name || entity_id} - ${new Date().toISOString().split('T')[0]}.txt`;
    const fileContent = content;

    const metadata = {
      name: fileName,
      mimeType: 'application/vnd.google-apps.document'
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const close_delim = `\r\n--${boundary}--`;

    const multipartBody =
      delimiter + 'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter + 'Content-Type: text/plain\r\n\r\n' +
      fileContent +
      close_delim;

    const driveResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${driveToken}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`,
      },
      body: multipartBody
    });

    const driveResult = await driveResponse.json();

    if (!driveResponse.ok) {
      return Response.json({ error: 'Drive upload failed', detail: driveResult }, { status: 500 });
    }

    const fileUrl = `https://docs.google.com/document/d/${driveResult.id}/edit`;

    // Log to AuditLog
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'document_generated',
      entity_type: entity_type,
      entity_id: entity_id,
      performed_by: user.email,
      details: JSON.stringify({ document_type, file_name: fileName, drive_id: driveResult.id, url: fileUrl })
    }).catch(() => {});

    return Response.json({ success: true, file_name: fileName, drive_id: driveResult.id, url: fileUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});