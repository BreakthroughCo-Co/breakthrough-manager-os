import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_id, section } = await req.json();

    // Fetch relevant data based on section
    let data = {};
    if (section === 'case_notes') {
      const notes = await base44.entities.CaseNote.filter({ client_id });
      data.notes = notes.slice(0, 10);
    } else if (section === 'incidents') {
      const incidents = await base44.entities.Incident.filter({ client_id });
      data.incidents = incidents.slice(0, 10);
    } else if (section === 'compliance') {
      const reports = await base44.asServiceRole.entities.ComplianceAuditReport.list('-audit_date', 20);
      const findings = reports.flatMap(r => {
        try {
          return JSON.parse(r.findings || '[]').filter(f => f.client_id === client_id);
        } catch {
          return [];
        }
      });
      data.findings = findings;
    } else if (section === 'overall') {
      const [notes, incidents, client] = await Promise.all([
        base44.entities.CaseNote.filter({ client_id }),
        base44.entities.Incident.filter({ client_id }),
        base44.entities.Client.filter({ id: client_id }).then(c => c[0]),
      ]);
      data = { notes: notes.slice(0, 10), incidents: incidents.slice(0, 10), client };
    }

    // Build context-specific prompt
    let prompt = '';
    if (section === 'case_notes') {
      prompt = `Analyze the following case notes and provide a concise summary (150-200 words) highlighting:
1. Overall progress and trends
2. Key interventions and their effectiveness
3. Areas of concern or regression
4. Recommendations for next steps

Case Notes:
${data.notes.map(n => `Date: ${n.session_date}\nSummary: ${n.summary || n.progress_summary || 'N/A'}\n`).join('\n')}

Provide a professional, clinical summary in paragraph form.`;
    } else if (section === 'incidents') {
      prompt = `Analyze the following incident reports and provide a risk assessment summary (150-200 words) covering:
1. Incident frequency and severity trends
2. Common triggers or patterns
3. Effectiveness of current risk management strategies
4. Recommended preventive measures

Incidents:
${data.incidents.map(i => `Date: ${new Date(i.incident_date).toLocaleDateString()}\nCategory: ${i.category}\nSeverity: ${i.severity}\nDescription: ${i.description.substring(0, 200)}\n`).join('\n')}

Provide a risk-focused clinical assessment.`;
    } else if (section === 'compliance') {
      prompt = `Review the following compliance audit findings and provide a summary (150-200 words) addressing:
1. Key compliance gaps identified
2. Risk level and urgency
3. Impact on service quality
4. Priority remediation steps

Findings:
${data.findings.map(f => `Standard: ${f.standard}\nIssue: ${f.issue}\nSeverity: ${f.severity}\nRemediation: ${f.remediation || 'N/A'}\n`).join('\n')}

Provide a compliance-focused summary with actionable insights.`;
    } else if (section === 'overall') {
      prompt = `Provide a comprehensive client progress and risk summary (250-300 words) based on:

Client: ${data.client?.full_name}
Service Type: ${data.client?.service_type}
Risk Level: ${data.client?.risk_level}

Recent Case Notes (${data.notes.length}):
${data.notes.slice(0, 5).map(n => `- ${n.session_date}: ${n.progress_summary || 'Session completed'}`).join('\n')}

Incidents (${data.incidents.length} total, ${data.incidents.filter(i => i.severity === 'high' || i.severity === 'critical').length} high/critical):
${data.incidents.slice(0, 3).map(i => `- ${new Date(i.incident_date).toLocaleDateString()}: ${i.category} (${i.severity})`).join('\n')}

Provide a holistic summary covering:
1. Overall client progress and trajectory
2. Key risk factors and trends
3. Service effectiveness
4. Strategic recommendations for ongoing support`;
    }

    const summary = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
    });

    return Response.json({ summary, section });
  } catch (error) {
    console.error('Summary generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});