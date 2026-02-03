import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_id } = await req.json();

    // Fetch comprehensive client data
    const [client, incidents, breaches, caseNotes, bsps, communications] = await Promise.all([
      base44.entities.Client.filter({ id: client_id }).then(c => c[0]),
      base44.entities.Incident.filter({ client_id }),
      base44.entities.ComplianceBreach.filter({ related_entity_id: client_id }),
      base44.entities.CaseNote.filter({ client_id }),
      base44.entities.BehaviourSupportPlan.filter({ client_id }),
      base44.entities.ClientCommunication.filter({ client_id }),
    ]);

    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    // Calculate metrics
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const recentIncidents = incidents.filter(i => new Date(i.incident_date) > last30Days);
    const highSeverityIncidents = incidents.filter(i => 
      i.severity === 'high' || i.severity === 'critical'
    );
    const recentHighSeverity = recentIncidents.filter(i => 
      i.severity === 'high' || i.severity === 'critical'
    );

    const restrictivePracticeIncidents = incidents.filter(i => 
      i.restrictive_practice_used || i.category === 'unauthorized_restrictive_practice'
    );

    const recentCaseNotes = caseNotes.filter(n => new Date(n.session_date) > last30Days);
    const regressionNotes = caseNotes.filter(n => n.progress_rating === 'regression');

    const activeBSP = bsps.find(b => b.status === 'active');
    const bspOverdue = activeBSP && new Date(activeBSP.review_date) < new Date();

    const recentComms = communications.filter(c => new Date(c.sent_date) > last30Days);
    const urgentComms = communications.filter(c => 
      c.subject?.toLowerCase().includes('concern') || 
      c.subject?.toLowerCase().includes('urgent') ||
      c.subject?.toLowerCase().includes('risk')
    );

    // Calculate historical trends (compare last 30 vs previous 30)
    const prev60Days = new Date();
    prev60Days.setDate(prev60Days.getDate() - 60);
    const prevPeriodIncidents = incidents.filter(i => {
      const date = new Date(i.incident_date);
      return date > prev60Days && date <= last30Days;
    });

    const trendDirection = recentIncidents.length > prevPeriodIncidents.length ? 'increasing' : 
                          recentIncidents.length < prevPeriodIncidents.length ? 'decreasing' : 'stable';

    // Build context for AI
    const contextData = `
CLIENT: ${client.full_name}
Current Risk Level: ${client.risk_level}
Service Type: ${client.service_type}

INCIDENT HISTORY:
- Total Incidents: ${incidents.length}
- High/Critical Severity: ${highSeverityIncidents.length}
- Recent (Last 30 days): ${recentIncidents.length} (${recentHighSeverity.length} high severity)
- Previous Period (30-60 days ago): ${prevPeriodIncidents.length}
- Trend: ${trendDirection}
- Restrictive Practice Used: ${restrictivePracticeIncidents.length}
- Injury-related: ${incidents.filter(i => i.injuries_sustained).length}

COMPLIANCE FINDINGS:
- Total Breaches: ${breaches.length}
- High/Critical Breaches: ${breaches.filter(b => b.severity === 'high' || b.severity === 'critical').length}

PROGRESS PATTERNS:
- Case Notes (Last 30 days): ${recentCaseNotes.length}
- Regression Noted: ${regressionNotes.length} instances
- Active BSP: ${activeBSP ? 'Yes' : 'No'}
- BSP Review Overdue: ${bspOverdue ? 'Yes' : 'No'}

COMMUNICATION & ENGAGEMENT:
- Recent Communications: ${recentComms.length}
- Urgent/Concern Communications: ${urgentComms.length}

SUPPORT PLAN STATUS:
- BSPs: ${bsps.length} total, ${bsps.filter(b => b.status === 'active').length} active
- Latest BSP Review Date: ${activeBSP?.review_date || 'N/A'}

Recent Incident Categories:
${recentIncidents.slice(0, 5).map(i => `- ${i.category}: ${i.severity}`).join('\n')}

Recent Communication Concerns:
${urgentComms.slice(0, 3).map(c => `- ${c.subject}`).join('\n')}

Analyze this client data and provide a comprehensive risk assessment.`;

    const aiAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt: `${contextData}

Provide a comprehensive risk assessment for this NDIS client with:
1. **Risk Score** (0-100, where 100 is highest risk)
2. **Risk Level** (low, medium, high, critical)
3. **Key Contributing Factors** (list 3-5 specific factors)
4. **Risk Trends** (increasing, stable, decreasing)
5. **Immediate Concerns** (any urgent issues requiring attention)
6. **Recommended Actions** (3-5 specific recommendations)

Base your analysis on incident frequency, severity patterns, compliance issues, and progress trends. Be clinical and evidence-based.`,
      response_json_schema: {
        type: "object",
        properties: {
          risk_score: { type: "number" },
          risk_level: { type: "string" },
          contributing_factors: { type: "array", items: { type: "string" } },
          risk_trend: { type: "string" },
          immediate_concerns: { type: "array", items: { type: "string" } },
          recommended_actions: { type: "array", items: { type: "string" } }
        }
      }
    });

    // Check if alert should be triggered
    const shouldAlert = aiAnalysis.risk_level === 'high' || aiAnalysis.risk_level === 'critical';
    const riskEscalated = aiAnalysis.risk_level === 'high' && client.risk_level !== 'high' ||
                         aiAnalysis.risk_level === 'critical' && client.risk_level !== 'critical';

    if (shouldAlert || riskEscalated) {
      // Get assigned practitioner and admin users
      const practitioners = await base44.asServiceRole.entities.Practitioner.filter({ 
        id: client.assigned_practitioner_id 
      });
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      
      const notifyList = [
        ...practitioners.map(p => p.email).filter(Boolean),
        ...admins.map(a => a.email).filter(Boolean)
      ];

      // Create risk alert
      if (notifyList.length > 0) {
        await base44.asServiceRole.entities.RiskAlert.create({
          client_id,
          client_name: client.full_name,
          alert_type: riskEscalated ? 'risk_escalation' : 'high_risk_detected',
          risk_score: aiAnalysis.risk_score,
          risk_level: aiAnalysis.risk_level,
          contributing_factors: JSON.stringify(aiAnalysis.contributing_factors),
          triggered_date: new Date().toISOString(),
          notified_staff: JSON.stringify(notifyList),
          status: 'active',
        });

        // Send email notifications
        for (const email of notifyList) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: email,
            subject: `⚠️ ${riskEscalated ? 'Risk Escalation' : 'High Risk'} Alert: ${client.full_name}`,
            body: `A ${aiAnalysis.risk_level} risk level has been detected for client ${client.full_name}.

Risk Score: ${aiAnalysis.risk_score}/100

Key Contributing Factors:
${aiAnalysis.contributing_factors.map(f => `• ${f}`).join('\n')}

Immediate Concerns:
${aiAnalysis.immediate_concerns.map(c => `• ${c}`).join('\n')}

Recommended Actions:
${aiAnalysis.recommended_actions.map(a => `• ${a}`).join('\n')}

Please review this client's profile and take appropriate action.`
          });
        }
      }
    }

    return Response.json({
      client_id,
      client_name: client.full_name,
      current_risk_level: client.risk_level,
      assessment: aiAnalysis,
      alert_triggered: shouldAlert || riskEscalated,
      metrics: {
        total_incidents: incidents.length,
        high_severity_incidents: highSeverityIncidents.length,
        recent_incidents: recentIncidents.length,
        previous_period_incidents: prevPeriodIncidents.length,
        trend_direction: trendDirection,
        compliance_breaches: breaches.length,
        restrictive_practices: restrictivePracticeIncidents.length,
        recent_case_notes: recentCaseNotes.length,
        recent_communications: recentComms.length,
        urgent_communications: urgentComms.length,
      },
      generated_date: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Risk score calculation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});