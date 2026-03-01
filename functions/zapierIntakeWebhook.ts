/**
 * Zapier Webhook: 17hats New Lead/Project → ClientIntakeRequest
 *
 * Configure in Zapier:
 *   Trigger: 17hats > New Project (or New Contact from Lead Form)
 *   Action: Webhooks by Zapier > POST to this function URL
 *
 * Zapier field mapping:
 *   first_name       → given_name
 *   last_name        → surname
 *   email            → contact_email
 *   phone_number     → contact_phone
 *   custom_NDIS      → ndis_number
 *   project_date     → intake_date
 *   project_id       → zapier_lead_id
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);

  const body = await req.json();

  const {
    first_name,
    last_name,
    email,
    phone_number,
    custom_NDIS,
    project_date,
    project_id,
    support_needs,
    service_interest
  } = body;

  if (!email) {
    return Response.json({ error: 'email is required' }, { status: 400 });
  }

  // Deduplication: check if a request with this zapier_lead_id already exists
  if (project_id) {
    const existing = await base44.asServiceRole.entities.ClientIntakeRequest.filter({
      zapier_lead_id: project_id
    });
    if (existing && existing.length > 0) {
      return Response.json({
        message: 'Duplicate: intake already exists for this lead',
        id: existing[0].id
      }, { status: 200 });
    }
  }

  const given_name = first_name || '';
  const surname = last_name || '';
  const participant_name = [given_name, surname].filter(Boolean).join(' ');

  const intakeData = {
    given_name,
    surname,
    participant_name,
    contact_name: participant_name,
    contact_email: email,
    contact_phone: phone_number || '',
    ndis_number: custom_NDIS || '',
    intake_date: project_date || new Date().toISOString().split('T')[0],
    zapier_lead_id: project_id || '',
    source: '17hats_zapier',
    support_needs: support_needs || 'Pending — submitted via 17hats lead form',
    service_interest: service_interest || 'Not Sure',
    status: 'new',
    urgency: 'medium'
  };

  const created = await base44.asServiceRole.entities.ClientIntakeRequest.create(intakeData);

  return Response.json({
    success: true,
    message: 'ClientIntakeRequest created',
    id: created.id
  }, { status: 201 });
});