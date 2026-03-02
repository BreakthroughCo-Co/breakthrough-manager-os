import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const payload = await req.json();
  const { client_id } = payload; // optional — if provided, analyse single client

  // Fetch data in parallel
  const [clients, allCaseNotes, allFundingReports] = await Promise.all([
    client_id
      ? base44.asServiceRole.entities.Client.filter({ id: client_id })
      : base44.asServiceRole.entities.Client.filter({ status: 'active' }),
    base44.asServiceRole.entities.CaseNote.list('-session_date', 500),
    base44.asServiceRole.entities.FundingUtilisationReport.list('-report_date', 200)
  ]);

  const now = new Date();
  const results = [];
  let outreachCreated = 0;

  for (const client of clients) {
    // --- Case note frequency analysis ---
    const clientNotes = allCaseNotes.filter(n => n.client_id === client.id);
    const recentNotes = clientNotes.filter(n => {
      const d = new Date(n.session_date);
      return (now - d) / (1000 * 60 * 60 * 24) <= 30;
    });
    const daysSinceLastNote = clientNotes.length > 0
      ? (now - new Date(clientNotes[0].session_date)) / (1000 * 60 * 60 * 24)
      : 999;

    // --- Funding utilisation risk ---
    const fundingReports = allFundingReports.filter(r => r.client_id === client.id);
    const latestFunding = fundingReports[0];
    const fundingRisk = latestFunding?.risk_level || 'on_track';

    // --- Sentiment analysis from recent case notes ---
    let sentimentScore = 50; // neutral default
    if (recentNotes.length > 0) {
      const sentimentResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyse the sentiment and engagement indicators in these NDIS case note summaries and return a numeric sentiment score from 0 (very negative/disengaged) to 100 (very positive/engaged). Consider: regression in progress ratings, negative language, missed sessions, client refusals.

Case notes (most recent first):
${recentNotes.slice(0, 5).map(n => `- ${n.session_date}: Progress=${n.progress_rating}. ${n.ai_summary || n.plan || ''}`).join('\n')}

Return JSON only.`,
        response_json_schema: {
          type: 'object',
          properties: {
            sentiment_score: { type: 'number' },
            key_indicators: { type: 'array', items: { type: 'string' } }
          }
        }
      });
      sentimentScore = sentimentResult?.sentiment_score ?? 50;
    }

    // --- Composite risk score ---
    // Inactivity: 0 notes in 30d = 40pts, >14d since last = 20pts
    let inactivityScore = 0;
    if (recentNotes.length === 0) inactivityScore = 40;
    else if (daysSinceLastNote > 14) inactivityScore = 20;
    else if (daysSinceLastNote > 7) inactivityScore = 10;

    // Funding: critical=30, over=20, under=5
    const fundingScore =
      fundingRisk === 'critical' ? 30 :
      fundingRisk === 'over_utilised' ? 20 :
      fundingRisk === 'under_utilised' ? 10 : 0;

    // Sentiment: inverted (low sentiment = high risk)
    const sentimentRisk = Math.round((100 - sentimentScore) * 0.3);

    // Client status flags
    const statusRisk = client.status === 'on_hold' ? 15 : client.status === 'plan_review' ? 10 : 0;

    const compositeScore = Math.min(100, inactivityScore + fundingScore + sentimentRisk + statusRisk);

    const riskFactors = [];
    if (inactivityScore > 0) riskFactors.push(`${Math.round(daysSinceLastNote)}d since last case note`);
    if (fundingScore > 0) riskFactors.push(`Funding risk: ${fundingRisk.replace('_', ' ')}`);
    if (sentimentRisk > 20) riskFactors.push('Low engagement sentiment in recent notes');
    if (statusRisk > 0) riskFactors.push(`Client status: ${client.status.replace('_', ' ')}`);

    results.push({ client, compositeScore, riskFactors, sentimentScore });

    // Only trigger outreach for moderate-high risk (>=35) with a contact email
    if (compositeScore >= 35 && client.primary_contact_email) {
      // Generate personalised email via LLM
      const emailContent = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a professional NDIS practice manager drafting a caring, professional outreach email to a participant's primary contact.

Client name: ${client.full_name}
Risk factors: ${riskFactors.join(', ')}
Days since last session: ${Math.round(daysSinceLastNote)}
Funding status: ${fundingRisk}

Draft a brief, warm, non-alarming check-in email that:
1. Asks how the participant is going
2. Mentions we'd love to schedule a catch-up session
3. Includes a contact prompt
Do NOT mention "risk" or internal system metrics. Keep it under 150 words. Use Australian English.`,
        response_json_schema: {
          type: 'object',
          properties: {
            subject: { type: 'string' },
            body: { type: 'string' }
          }
        }
      });

      // Send via Gmail connector
      let emailStatus = 'pending';
      let failureReason = null;
      try {
        const accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');
        const gmailResp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            raw: btoa(
              `To: ${client.primary_contact_email}\r\nSubject: ${emailContent.subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${emailContent.body}`
            ).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
          })
        });
        emailStatus = gmailResp.ok ? 'sent' : 'failed';
        if (!gmailResp.ok) {
          const errBody = await gmailResp.json();
          failureReason = errBody?.error?.message || 'Gmail send error';
        }
      } catch (e) {
        emailStatus = 'failed';
        failureReason = e.message;
      }

      // Log outreach
      await base44.asServiceRole.entities.ScheduledOutreach.create({
        client_id: client.id,
        client_name: client.full_name,
        outreach_type: 'email',
        trigger_reason: 'disengagement_risk',
        risk_score: compositeScore,
        risk_factors: JSON.stringify(riskFactors),
        email_subject: emailContent?.subject || '',
        email_body: emailContent?.body || '',
        recipient_email: client.primary_contact_email,
        status: emailStatus,
        sent_at: emailStatus === 'sent' ? new Date().toISOString() : null,
        failure_reason: failureReason,
        ai_insight: `Composite risk score: ${compositeScore}/100. Sentiment: ${Math.round(sentimentScore)}/100.`,
        triggered_by: 'System'
      });

      // Update client record
      await base44.asServiceRole.entities.Client.update(client.id, {
        predicted_disengagement_risk: compositeScore / 100
      });

      outreachCreated++;
    }
  }

  // Audit trail
  await base44.asServiceRole.entities.ComplianceAuditTrail.create({
    event_type: 'compliance_scan_result',
    event_description: `Disengagement risk scan: ${clients.length} clients analysed, ${outreachCreated} outreach triggered`,
    trigger_source: 'Disengagement Risk Engine',
    timestamp: new Date().toISOString(),
    triggered_by_user: user.email,
    severity: outreachCreated > 0 ? 'warning' : 'info'
  });

  return Response.json({
    status: 'success',
    clients_analysed: clients.length,
    outreach_triggered: outreachCreated,
    high_risk: results.filter(r => r.compositeScore >= 65).map(r => ({
      client: r.client.full_name,
      score: r.compositeScore,
      factors: r.riskFactors
    }))
  });
});