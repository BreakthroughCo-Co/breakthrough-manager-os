import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Sends outreach via Gmail (email) connector.
// SMS via Twilio: set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER secrets
// and uncomment the SMS block below.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { log_id, recipient_email, recipient_phone, subject, body, channel } = await req.json();

    const results = { email: null, sms: null };

    // --- EMAIL via Gmail connector ---
    if (channel === 'email' || channel === 'both') {
      if (!recipient_email) {
        results.email = { success: false, error: 'No recipient email provided' };
      } else {
        const accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');
        const emailPayload = {
          to: recipient_email,
          subject: subject,
          body: body
        };

        const raw = btoa(
          `To: ${recipient_email}\r\nSubject: ${subject}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${body}`
        ).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ raw })
        });

        const gmailData = await gmailRes.json();
        results.email = { success: gmailRes.ok, message_id: gmailData.id, error: gmailData.error };
      }
    }

    // --- SMS via Twilio (uncomment when TWILIO secrets are set) ---
    // if (channel === 'sms' || channel === 'both') {
    //   const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    //   const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    //   const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER');
    //   const twilioRes = await fetch(
    //     `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    //     {
    //       method: 'POST',
    //       headers: {
    //         'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
    //         'Content-Type': 'application/x-www-form-urlencoded'
    //       },
    //       body: new URLSearchParams({ To: recipient_phone, From: fromNumber, Body: body })
    //     }
    //   );
    //   const twilioData = await twilioRes.json();
    //   results.sms = { success: twilioRes.ok, sid: twilioData.sid, error: twilioData.message };
    // }

    // Update communication log status
    if (log_id) {
      const status = (results.email?.success || results.sms?.success) ? 'sent' : 'failed';
      await base44.asServiceRole.entities.ClientCommunication.update(log_id, {
        status,
        notes: JSON.stringify(results)
      });
    }

    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});