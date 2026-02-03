import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      report_category, 
      data_points = [], 
      filters = {},
      format = 'json' 
    } = await req.json();

    let reportData = {};
    let aiAnalysis = null;

    // Fetch base data
    const [clients, incidents, caseNotes, practitioners, breaches, auditReports] = await Promise.all([
      base44.entities.Client.list(),
      base44.entities.Incident.list(),
      base44.entities.CaseNote.list(),
      base44.entities.Practitioner.list(),
      base44.entities.ComplianceBreach.list(),
      base44.entities.ComplianceAuditReport.list(),
    ]);

    // Generate report based on category
    if (report_category === 'client_demographics') {
      const ageGroups = { '0-10': 0, '11-18': 0, '19-30': 0, '31-50': 0, '51+': 0 };
      const serviceTypes = {};
      const riskLevels = { low: 0, medium: 0, high: 0, critical: 0 };

      clients.forEach(c => {
        if (c.date_of_birth) {
          const age = new Date().getFullYear() - new Date(c.date_of_birth).getFullYear();
          if (age <= 10) ageGroups['0-10']++;
          else if (age <= 18) ageGroups['11-18']++;
          else if (age <= 30) ageGroups['19-30']++;
          else if (age <= 50) ageGroups['31-50']++;
          else ageGroups['51+']++;
        }
        
        serviceTypes[c.service_type] = (serviceTypes[c.service_type] || 0) + 1;
        riskLevels[c.risk_level || 'low']++;
      });

      reportData = {
        total_clients: clients.length,
        active_clients: clients.filter(c => c.status === 'active').length,
        age_distribution: ageGroups,
        service_type_distribution: serviceTypes,
        risk_level_distribution: riskLevels,
      };

      const contextData = `
CLIENT DEMOGRAPHICS REPORT
Total Clients: ${reportData.total_clients}
Active: ${reportData.active_clients}

Age Distribution:
${Object.entries(ageGroups).map(([range, count]) => `${range}: ${count}`).join('\n')}

Service Types:
${Object.entries(serviceTypes).map(([type, count]) => `${type}: ${count}`).join('\n')}

Risk Levels:
${Object.entries(riskLevels).map(([level, count]) => `${level}: ${count}`).join('\n')}`;

      aiAnalysis = await base44.integrations.Core.InvokeLLM({
        prompt: `${contextData}\n\nProvide executive insights on this client demographics data. Identify patterns, risks, and opportunities for service optimization.`,
        response_json_schema: {
          type: "object",
          properties: {
            key_insights: { type: "array", items: { type: "string" } },
            demographic_trends: { type: "string" },
            service_recommendations: { type: "array", items: { type: "string" } }
          }
        }
      });
    } else if (report_category === 'service_utilization') {
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);

      const recentNotes = caseNotes.filter(n => new Date(n.session_date) > last30Days);
      const sessionsByType = {};
      const notesByPractitioner = {};

      recentNotes.forEach(n => {
        sessionsByType[n.session_type] = (sessionsByType[n.session_type] || 0) + 1;
        notesByPractitioner[n.practitioner_name] = (notesByPractitioner[n.practitioner_name] || 0) + 1;
      });

      reportData = {
        total_sessions_30days: recentNotes.length,
        sessions_by_type: sessionsByType,
        sessions_by_practitioner: notesByPractitioner,
        avg_session_duration: recentNotes.reduce((sum, n) => sum + (n.duration_minutes || 0), 0) / recentNotes.length,
      };

      aiAnalysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Service Utilization Data (Last 30 Days):\nTotal Sessions: ${reportData.total_sessions_30days}\nSession Types: ${JSON.stringify(sessionsByType)}\n\nAnalyze service utilization patterns and provide capacity planning recommendations.`,
        response_json_schema: {
          type: "object",
          properties: {
            utilization_insights: { type: "array", items: { type: "string" } },
            capacity_recommendations: { type: "string" },
            efficiency_opportunities: { type: "array", items: { type: "string" } }
          }
        }
      });
    } else if (report_category === 'incident_patterns') {
      const incidentsByCategory = {};
      const incidentsBySeverity = {};
      const incidentTrends = [];

      incidents.forEach(i => {
        incidentsByCategory[i.category] = (incidentsByCategory[i.category] || 0) + 1;
        incidentsBySeverity[i.severity] = (incidentsBySeverity[i.severity] || 0) + 1;
      });

      // Monthly trends
      const monthlyIncidents = {};
      incidents.forEach(i => {
        const month = new Date(i.incident_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        monthlyIncidents[month] = (monthlyIncidents[month] || 0) + 1;
      });

      reportData = {
        total_incidents: incidents.length,
        incidents_by_category: incidentsByCategory,
        incidents_by_severity: incidentsBySeverity,
        monthly_trends: monthlyIncidents,
        ndis_reportable_count: incidents.filter(i => i.ndis_reportable).length,
      };

      aiAnalysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Incident Pattern Analysis:\n${JSON.stringify(reportData, null, 2)}\n\nAnalyze patterns and provide risk mitigation strategies.`,
        response_json_schema: {
          type: "object",
          properties: {
            pattern_insights: { type: "array", items: { type: "string" } },
            risk_areas: { type: "array", items: { type: "string" } },
            mitigation_strategies: { type: "array", items: { type: "string" } }
          }
        }
      });
    } else if (report_category === 'compliance_summary') {
      const recentAudits = auditReports.slice(0, 5);
      const avgComplianceScore = recentAudits.reduce((sum, a) => sum + (a.overall_compliance_score || 0), 0) / recentAudits.length;

      reportData = {
        recent_audits_count: recentAudits.length,
        average_compliance_score: avgComplianceScore.toFixed(1),
        total_breaches: breaches.length,
        high_severity_breaches: breaches.filter(b => b.severity === 'high' || b.severity === 'critical').length,
        breach_categories: breaches.reduce((acc, b) => {
          acc[b.breach_type] = (acc[b.breach_type] || 0) + 1;
          return acc;
        }, {}),
      };

      aiAnalysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Compliance Summary:\n${JSON.stringify(reportData, null, 2)}\n\nProvide compliance improvement recommendations.`,
        response_json_schema: {
          type: "object",
          properties: {
            compliance_status: { type: "string" },
            priority_actions: { type: "array", items: { type: "string" } },
            systemic_improvements: { type: "array", items: { type: "string" } }
          }
        }
      });
    }

    // Format output
    if (format === 'csv') {
      const csv = convertToCSV(reportData);
      return new Response(csv, {
        headers: { 'Content-Type': 'text/csv' }
      });
    }

    return Response.json({
      report_category,
      report_data: reportData,
      ai_analysis: aiAnalysis,
      generated_date: new Date().toISOString(),
      generated_by: user.email,
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function convertToCSV(data) {
  const rows = [];
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'object') {
      Object.entries(value).forEach(([k, v]) => {
        rows.push(`${key}.${k},${v}`);
      });
    } else {
      rows.push(`${key},${value}`);
    }
  });
  return rows.join('\n');
}