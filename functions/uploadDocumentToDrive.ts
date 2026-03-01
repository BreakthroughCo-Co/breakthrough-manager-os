/**
 * Google Drive Auto-Filing
 * Uploads a document (BSP, Service Agreement, Incident Report) to Google Drive
 * in a structured /NDIS/{ParticipantName}/{DocType}/ folder path.
 *
 * Note: Due to drive.file scope restrictions, we can only create new files.
 * Folders are created as needed.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function createOrGetFolder(accessToken, folderName, parentId = null) {
  // Create the folder (drive.file scope allows creating files/folders)
  const metadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) metadata.parents = [parentId];

  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create folder ${folderName}: ${err}`);
  }

  const data = await res.json();
  return data.id;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { participant_name, doc_type, file_name, file_content_base64, mime_type } = body;

  if (!participant_name || !doc_type || !file_name || !file_content_base64) {
    return Response.json({ error: 'participant_name, doc_type, file_name, and file_content_base64 are required' }, { status: 400 });
  }

  const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

  // Create folder hierarchy: NDIS > ParticipantName > DocType
  const ndisFolder = await createOrGetFolder(accessToken, 'NDIS Records');
  const participantFolder = await createOrGetFolder(accessToken, participant_name, ndisFolder);
  const docTypeFolder = await createOrGetFolder(accessToken, doc_type, participantFolder);

  // Upload the file
  const fileBytes = Uint8Array.from(atob(file_content_base64), c => c.charCodeAt(0));
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataStr = JSON.stringify({ name: file_name, parents: [docTypeFolder] });

  const multipartBody = `${delimiter}Content-Type: application/json\r\n\r\n${metadataStr}${delimiter}Content-Type: ${mime_type || 'application/pdf'}\r\nContent-Transfer-Encoding: base64\r\n\r\n${file_content_base64}${closeDelimiter}`;

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    return Response.json({ error: 'Drive upload failed', details: err }, { status: 502 });
  }

  const uploaded = await uploadRes.json();

  return Response.json({
    success: true,
    file_id: uploaded.id,
    file_name,
    participant: participant_name,
    doc_type,
  });
});