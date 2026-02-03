import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      report_type, 
      timeframe_days, 
      practitioner_id, 
      format 
    } = await req.json();

    // Fetch data
    const [practitioners, agentLogs, trainingAssignments, incidents, breaches, caseNotes] = await Promise.all([
      base44.entities.Practitioner.list(),
      base44.entities.AgentPerformanceLog.list('-execution_date', 500),
      base44.entities.TrainingAssignment.list(),
      base44.entities.Incident.list('-incident_date', 200),
      base44.entities.ComplianceBreach.list(),
      base44.entities.CaseNote.list('-session_date', 200),
    ]);

    // Filter by practitioner if specified
    const targetPractitioners = practitioner_id 
      ? practitioners.filter(p => p.id === practitioner_id)
      : practitioners;

    // Calculate metrics
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (timeframe_days || 30));

    const metricsData = targetPractitioners.map(p => {
      const assignments = trainingAssignments.filter(a => a.practitioner_id === p.id);
      const completed = assignments.filter(a => a.completion_status === 'completed');
      const overdue = assignments.filter(a => 
        a.completion_status !== 'completed' && new Date(a.due_date) < new Date()
      );

      const reportedIncidents = incidents.filter(inc => inc.reported_by === p.email);
      const highSeverityIncidents = reportedIncidents.filter(inc => 
        inc.severity === 'high' || inc.severity === 'critical'
      );

      const relatedBreaches = breaches.filter(b => 
        b.description?.includes(p.email) || b.description?.includes(p.full_name)
      );

      const practitionerNotes = caseNotes.filter(n => n.practitioner_id === p.id);
      const recentNotes = practitionerNotes.filter(n => {
        const noteDate = new Date(n.session_date);
        return noteDate > cutoffDate;
      });

      const trainingRate = assignments.length > 0 ? (completed.length / assignments.length) * 100 : 100;
      const performanceScore = Math.max(0, Math.round(
        100 - (100 - trainingRate) * 0.3 - highSeverityIncidents.length * 5 - relatedBreaches.length * 10
      ));

      return {
        name: p.full_name,
        role: p.role,
        training_completion_rate: Math.round(trainingRate),
        overdue_training: overdue.length,
        incidents_reported: reportedIncidents.length,
        high_severity_incidents: highSeverityIncidents.length,
        compliance_breaches: relatedBreaches.length,
        case_notes_count: recentNotes.length,
        performance_score: performanceScore,
      };
    });

    // Generate AI-powered insights
    const prompt = `You are an NDIS practice performance analyst. Generate a comprehensive performance report based on the following staff metrics.

REPORT TYPE: ${report_type || 'General Performance Review'}
TIMEFRAME: Last ${timeframe_days || 30} days
STAFF ANALYZED: ${metricsData.length} practitioners

METRICS SUMMARY:
${metricsData.map(m => `
- ${m.name} (${m.role})
  Training Completion: ${m.training_completion_rate}%
  Overdue Training: ${m.overdue_training}
  Performance Score: ${m.performance_score}/100
  Case Notes: ${m.case_notes_count}
  Incidents Reported: ${m.incidents_reported} (${m.high_severity_incidents} high-severity)
  Compliance Breaches: ${m.compliance_breaches}
`).join('\n')}

Generate a professional report with:

**EXECUTIVE SUMMARY** (3-4 sentences on overall performance trends)

**KEY PERFORMANCE INDICATORS**
- Average training completion rate
- Overall performance score
- Total compliance issues
- Productivity metrics

**SKILL DEVELOPMENT TRENDS**
- Areas showing improvement
- Areas of concern
- Training effectiveness

**AREAS REQUIRING INTERVENTION**
- High-priority issues
- Staff needing support
- Recommended actions

**RECOMMENDATIONS**
- Specific, actionable recommendations for management

Format professionally with clear headings.`;

    const aiReport = await base44.integrations.Core.InvokeLLM({ prompt });

    // Prepare response based on format
    if (format === 'json') {
      return Response.json({
        report_type,
        timeframe_days,
        generated_date: new Date().toISOString(),
        metrics: metricsData,
        ai_insights: aiReport,
      });
    } else if (format === 'csv') {
      const headers = 'Name,Role,Training Completion %,Overdue Training,Case Notes,Incidents,High Severity Incidents,Compliance Breaches,Performance Score\n';
      const rows = metricsData.map(m => 
        `${m.name},${m.role},${m.training_completion_rate},${m.overdue_training},${m.case_notes_count},${m.incidents_reported},${m.high_severity_incidents},${m.compliance_breaches},${m.performance_score}`
      ).join('\n');
      
      return new Response(headers + rows, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="performance_report_${Date.now()}.csv"`
        }
      });
    } else {
      // PDF format - return markdown that can be converted to PDF
      const markdown = `# Staff Performance Report

**Report Type:** ${report_type || 'General Performance Review'}  
**Timeframe:** Last ${timeframe_days || 30} days  
**Generated:** ${new Date().toLocaleString()}

---

${aiReport}

---

## Detailed Metrics

| Name | Role | Training % | Overdue | Notes | Incidents | Breaches | Score |
|------|------|------------|---------|-------|-----------|----------|-------|
${metricsData.map(m => `| ${m.name} | ${m.role} | ${m.training_completion_rate}% | ${m.overdue_training} | ${m.case_notes_count} | ${m.incidents_reported} | ${m.compliance_breaches} | ${m.performance_score} |`).join('\n')}
`;

      return Response.json({
        format: 'markdown',
        content: markdown,
        metrics: metricsData,
      });
    }
  } catch (error) {
    console.error('Generate performance report error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});