/**
 * Zapier Webhook: 17hats Key Event Handler
 * Handles: Contract Signed, Questionnaire Submitted, Lead Archived
 *
 * Configure in Zapier — one Zap per event type, all POST to this URL with:
 *   event_type: "contract_signed" | "questionnaire_submitted" | "lead_archived"
 *   zapier_lead_id: 17hats project/contact ID
 *   + event-specific payload fields
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  const body = await req.json();

  const { event_type, zapier_lead_id } = body;

  if (!event_type || !zapier_lead_id) {
    return Response.json({ error: 'event_type and zapier_lead_id are required' }, { status: 400 });
  }

  // Locate the ClientIntakeRequest by zapier_lead_id
  const records = await base44.asServiceRole.entities.ClientIntakeRequest.filter({
    zapier_lead_id: zapier_lead_id
  });

  if (!records || records.length === 0) {
    return Response.json({
      success: false,
      message: `No ClientIntakeRequest found for zapier_lead_id: ${zapier_lead_id}`
    }, { status: 404 });
  }

  const intake = records[0];
  let updatePayload = {};
  let responseMessage = '';

  switch (event_type) {
    case 'contract_signed': {
      // Contract signed = Service Agreement confirmed
      // Advance status to 'converted' — triggers Client entity creation workflow
      updatePayload = {
        status: 'converted',
        conversion_notes: `Service Agreement signed via 17hats on ${new Date().toISOString().split('T')[0]}`
      };
      responseMessage = `ClientIntakeRequest ${intake.id} advanced to 'converted' — ready for Client entity creation`;
      break;
    }

    case 'questionnaire_submitted': {
      // Append questionnaire payload as structured metadata
      const questionnairePayload = body.questionnaire_data || body;
      updatePayload = {
        questionnaire_data: JSON.stringify(questionnairePayload),
        status: intake.status === 'new' ? 'pending_review' : intake.status
      };
      responseMessage = `Questionnaire data appended to ClientIntakeRequest ${intake.id}`;
      break;
    }

    case 'lead_archived': {
      // Terminate the intake request to prevent database bloat
      updatePayload = {
        status: 'archived',
        conversion_notes: `Lead archived in 17hats on ${new Date().toISOString().split('T')[0]}`
      };
      responseMessage = `ClientIntakeRequest ${intake.id} archived`;
      break;
    }

    default:
      return Response.json({ error: `Unknown event_type: ${event_type}` }, { status: 400 });
  }

  await base44.asServiceRole.entities.ClientIntakeRequest.update(intake.id, updatePayload);

  return Response.json({
    success: true,
    message: responseMessage,
    intake_id: intake.id,
    event_type
  }, { status: 200 });
});