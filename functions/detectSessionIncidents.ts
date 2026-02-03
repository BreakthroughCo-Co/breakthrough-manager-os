import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { lookback_days = 7 } = await req.json();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - lookback_days);

    // Fetch session and support data
    const [sessions, supportLogs] = await Promise.all([
      base44.entities.SessionContext.list(),
      base44.entities.SessionSupportLog.list()
    ]);

    const recentSessions = sessions?.filter(s => new Date(s.session_date) >= cutoffDate) || [];
    const recentLogs = supportLogs?.filter(l => new Date(l.request_timestamp) >= cutoffDate) || [];

    // Compile incident indicators
    const incidentIndicators = [];

    // Pattern 1: Risk incidents recorded during sessions
    recentSessions.forEach(session => {
      if (session.risk_incidents?.length > 0) {
        session.risk_incidents.forEach(incident => {
          incidentIndicators.push({
            source: 'session_risk_incident',
            session_id: session.id,
            client_id: session.client_id,
            practitioner_id: session.practitioner_id,
            date: session.session_date,
            description: incident,
            severity_signal: 'high'
          });
        });
      }
    });

    // Pattern 2: Multiple rejected/rejected interventions
    recentSessions.forEach(session => {
      if (session.intervention_effectiveness === 'ineffective' && session.support_requests_made > 2) {
        incidentIndicators.push({
          source: 'intervention_failure',
          session_id: session.id,
          client_id: session.client_id,
          practitioner_id: session.practitioner_id,
          date: session.session_date,
          description: `Multiple ineffective interventions (${session.support_requests_made} requests made)`,
          severity_signal: 'medium'
        });
      }
    });

    // Pattern 3: High-risk support requests rejected by practitioner
    const rejectedRiskRequests = recentLogs.filter(l => 
      l.request_type === 'risk_assessment' && 
      l.practitioner_action === 'rejected'
    );
    
    rejectedRiskRequests.forEach(log => {
      incidentIndicators.push({
        source: 'rejected_risk_assessment',
        session_id: log.session_id,
        client_id: log.client_id,
        practitioner_id: log.practitioner_id,
        date: log.request_timestamp,
        description: 'Risk assessment suggestion rejected by practitioner',
        severity_signal: 'high'
      });
    });

    // Pattern 4: Low engagement combined with support requests
    recentSessions.forEach(session => {
      if ((session.client_engagement_level || 0) < 30 && session.support_requests_made > 3) {
        incidentIndicators.push({
          source: 'low_engagement_high_support',
          session_id: session.id,
          client_id: session.client_id,
          practitioner_id: session.practitioner_id,
          date: session.session_date,
          description: `Low client engagement (${session.client_engagement_level}%) with multiple support requests`,
          severity_signal: 'medium'
        });
      }
    });

    // Generate incident reports
    const incidentReports = [];

    for (const indicator of incidentIndicators) {
      const analysisPrompt = `
Evaluate if this session observation warrants an incident report. Provide a structured assessment.

OBSERVATION:
- Source: ${indicator.source}
- Date: ${indicator.date}
- Description: ${indicator.description}
- Severity Signal: ${indicator.severity_signal}

Provide assessment in JSON:
{
  "should_flag": true|false,
  "incident_type": "risk_concern|behavioral_concern|practice_concern|compliance_concern|none",
  "risk_level": "critical|high|medium|low",
  "summary": "brief factual summary of concern",
  "recommended_action": "specific action for practitioner or manager",
  "requires_immediate_attention": true|false,
  "context_needed": ["what additional information would help assess this"]
}

Guidelines:
- Flag only genuine concerns that require review
- Distinguish between normal practice variation and actual incidents
- Consider context (first occurrence vs pattern)
- Recommend proportionate response`;

      const assessment = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        response_json_schema: {
          type: 'object',
          properties: {
            should_flag: { type: 'boolean' },
            incident_type: { type: 'string' },
            risk_level: { type: 'string' },
            summary: { type: 'string' },
            recommended_action: { type: 'string' },
            requires_immediate_attention: { type: 'boolean' },
            context_needed: { type: 'array', items: { type: 'string' } }
          }
        }
      });

      if (assessment.should_flag) {
        const incident = await base44.entities.Incident.create({
          client_id: indicator.client_id,
          client_name: 'TBD', // Will be populated by UI or workflow
          practitioner_id: indicator.practitioner_id,
          practitioner_name: 'TBD',
          incident_date: indicator.date,
          incident_type: assessment.incident_type,
          risk_level: assessment.risk_level,
          description: assessment.summary,
          source: `auto_detected_${indicator.source}`,
          status: 'pending_review',
          auto_generated: true,
          ai_confidence: 0.8,
          recommended_action: assessment.recommended_action,
          requires_immediate_attention: assessment.requires_immediate_attention,
          context_notes: JSON.stringify(assessment.context_needed),
          notes: `Auto-detected from ${indicator.source} - ${indicator.description}`
        });

        incidentReports.push({
          incident_id: incident.id,
          ...assessment,
          detected_from: indicator.source,
          original_observation: indicator.description
        });
      }
    }

    return Response.json({
      success: true,
      lookback_days,
      total_observations_analyzed: incidentIndicators.length,
      incidents_flagged: incidentReports.length,
      incident_reports: incidentReports
    });
  } catch (error) {
    console.error('Incident detection error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});