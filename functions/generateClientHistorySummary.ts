import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_id, include_sections } = await req.json();

    // Fetch comprehensive client data
    const [client, bsps, fbas, caseNotes, incidents, intakeRequests, communications] = await Promise.all([
      base44.entities.Client.filter({ id: client_id }).then(c => c[0]),
      base44.entities.BehaviourSupportPlan.filter({ client_id }),
      base44.entities.FunctionalBehaviourAssessment.filter({ client_id }),
      base44.entities.CaseNote.filter({ client_id }),
      base44.entities.Incident.filter({ client_id }),
      base44.entities.ClientIntakeRequest.filter({ client_id }),
      base44.entities.ClientCommunication.filter({ client_id }),
    ]);

    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    const sections = include_sections || ['overview', 'bsp', 'intake', 'progress', 'risks'];

    let contextData = `CLIENT: ${client.full_name}\nNDIS Number: ${client.ndis_number}\nService Type: ${client.service_type}\nRisk Level: ${client.risk_level}\n\n`;

    // Build context based on requested sections
    if (sections.includes('bsp') && bsps.length > 0) {
      contextData += `BEHAVIOUR SUPPORT PLANS (${bsps.length}):\n`;
      bsps.slice(0, 3).forEach(bsp => {
        contextData += `- Version ${bsp.plan_version} (${bsp.status})\n`;
        contextData += `  Start: ${bsp.start_date}, Review: ${bsp.review_date}\n`;
        contextData += `  Behaviour: ${bsp.behaviour_summary?.substring(0, 200)}\n`;
        contextData += `  Strategies: ${bsp.skill_building_strategies?.substring(0, 200)}\n\n`;
      });
    }

    if (sections.includes('intake') && intakeRequests.length > 0) {
      contextData += `INTAKE ASSESSMENT:\n`;
      const intake = intakeRequests[0];
      contextData += `- Support Needs: ${intake.support_needs}\n`;
      contextData += `- Service Interest: ${intake.service_interest}\n`;
      contextData += `- Urgency: ${intake.urgency}\n`;
      if (intake.ai_analysis) {
        const analysis = JSON.parse(intake.ai_analysis);
        contextData += `- Initial Assessment: ${JSON.stringify(analysis).substring(0, 200)}\n\n`;
      }
    }

    if (sections.includes('progress') && caseNotes.length > 0) {
      contextData += `RECENT PROGRESS NOTES (Last 10):\n`;
      caseNotes.slice(0, 10).forEach(note => {
        contextData += `- ${note.session_date}: ${note.summary?.substring(0, 150) || note.progress_summary?.substring(0, 150)}\n`;
        if (note.ai_summary) {
          contextData += `  AI Summary: ${note.ai_summary.substring(0, 200)}\n`;
        }
      });
      contextData += '\n';
    }

    if (sections.includes('risks')) {
      contextData += `INCIDENT HISTORY (${incidents.length} total):\n`;
      const highSeverity = incidents.filter(i => i.severity === 'high' || i.severity === 'critical');
      contextData += `- High/Critical Incidents: ${highSeverity.length}\n`;
      contextData += `- Recent Incidents (Last 5):\n`;
      incidents.slice(0, 5).forEach(inc => {
        contextData += `  ${new Date(inc.incident_date).toLocaleDateString()}: ${inc.category} (${inc.severity})\n`;
      });
      contextData += '\n';
    }

    // Generate AI summary
    const prompt = `You are an NDIS practice clinical analyst. Generate a comprehensive client history summary based on the following data.

${contextData}

Generate a professional summary with the following sections:

**CLIENT OVERVIEW**
- Brief profile and current service engagement
- Service history timeline

${sections.includes('bsp') ? '**BEHAVIOUR SUPPORT PROGRESS**\n- Evolution of BSP across versions\n- Key strategies and their effectiveness\n- Current intervention focus\n' : ''}

${sections.includes('intake') ? '**INITIAL ASSESSMENT & BASELINE**\n- Presenting concerns at intake\n- Initial goals and expectations\n- Service suitability assessment\n' : ''}

${sections.includes('progress') ? '**LONG-TERM PROGRESS TRENDS**\n- Key achievements and milestones\n- Patterns in progress notes\n- Skill development trajectory\n' : ''}

${sections.includes('risks') ? '**RISK FACTORS & SAFEGUARDS**\n- Identified risk patterns\n- Incident trends and triggers\n- Current risk mitigation strategies\n' : ''}

**CLINICAL RECOMMENDATIONS**
- Areas requiring attention
- Suggested next steps
- Long-term service planning considerations

Keep it clinical, evidence-based, and action-oriented. Highlight both successes and challenges.`;

    const aiSummary = await base44.integrations.Core.InvokeLLM({ prompt });

    return Response.json({
      client_id,
      client_name: client.full_name,
      sections_included: sections,
      data_summary: {
        bsp_count: bsps.length,
        case_notes_count: caseNotes.length,
        incidents_count: incidents.length,
        communications_count: communications.length,
      },
      comprehensive_summary: aiSummary,
      generated_date: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Client history summary error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});