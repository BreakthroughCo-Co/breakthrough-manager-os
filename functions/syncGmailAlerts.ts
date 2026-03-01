/**
 * Gmail NDIS Alert Parser
 * Scans Gmail for NDIS Commission / PRODA emails and surfaces them as ProactiveAlerts.
 * Designed to be called by a scheduled automation (e.g. daily at 8am AEST).
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');

  // Search for NDIS-related emails in the last 3 days
  const query = encodeURIComponent('from:(ndiscommission.gov.au OR myplace.ndis.gov.au OR proda.humanservices.gov.au) newer_than:3d');

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=20`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!listRes.ok) {
    const err = await listRes.text();
    return Response.json({ error: 'Gmail fetch failed', details: err }, { status: 502 });
  }

  const listData = await listRes.json();
  const messages = listData.messages || [];
  const alerts = [];

  for (const msg of messages.slice(0, 10)) {
    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!msgRes.ok) continue;
    const msgData = await msgRes.json();

    const headers = msgData.payload?.headers || [];
    const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
    const from = headers.find(h => h.name === 'From')?.value || '';
    const date = headers.find(h => h.name === 'Date')?.value || '';

    // Create a ProactiveAlert for each email
    const existingAlerts = await base44.asServiceRole.entities.ProactiveAlert.filter({
      external_reference: msg.id
    });

    if (!existingAlerts || existingAlerts.length === 0) {
      await base44.asServiceRole.entities.ProactiveAlert.create({
        title: `NDIS Email: ${subject}`,
        description: `From: ${from}\nDate: ${date}\nGmail Message ID: ${msg.id}`,
        alert_type: 'compliance',
        severity: 'medium',
        status: 'active',
        external_reference: msg.id,
        source: 'gmail_scanner',
      });
      alerts.push({ subject, from });
    }
  }

  return Response.json({
    success: true,
    emails_scanned: messages.length,
    new_alerts_created: alerts.length,
    alerts,
  });
});