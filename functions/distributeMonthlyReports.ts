import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { report_id } = await req.json();

    if (!report_id) {
      return Response.json({ error: 'Missing report_id' }, { status: 400 });
    }

    // Fetch report and distribution rules
    const [reports, rules] = await Promise.all([
      base44.entities.MonthlyPerformanceReport.list(),
      base44.entities.DistributionRule.list()
    ]);

    const report = reports?.find(r => r.id === report_id);
    if (!report) {
      return Response.json({ error: 'Report not found' }, { status: 404 });
    }

    // Find matching rules
    const matchingRules = rules?.filter(rule => {
      if (!rule.is_active) return false;
      if (rule.report_type !== 'all' && rule.report_type !== report.report_type) return false;
      if (rule.report_status !== 'all' && rule.report_status !== report.status) return false;
      return true;
    }) || [];

    const distributionLog = [];

    // Process each matching rule
    for (const rule of matchingRules) {
      // Extract key findings for email
      let keyFindings = [];
      try {
        const metrics = JSON.parse(report.key_metrics || '{}');
        const compliance = JSON.parse(report.compliance_findings || '{}');
        
        if (compliance.critical_items) {
          keyFindings = keyFindings.concat(compliance.critical_items.slice(0, 3));
        }
      } catch (e) {
        // Silent fail
      }

      // Build email body
      const emailBody = `
Report: ${report.report_type.replace(/_/g, ' ')} - ${report.report_period_month}
Status: ${report.status}
Generated: ${new Date(report.generated_date).toLocaleDateString()}

${report.executive_summary ? `Summary:\n${report.executive_summary}\n` : ''}

${rule.custom_message ? `\n${rule.custom_message}\n` : ''}

${rule.include_summary_text && report.executive_summary ? `Key Findings:\n${report.executive_summary}` : ''}
      `.trim();

      // Send email to each recipient
      const recipients = rule.recipient_emails || [];
      const deliveryStatus = {};
      let sentCount = 0;

      for (const email of recipients) {
        try {
          await base44.integrations.Core.SendEmail({
            to: email,
            subject: `${report.report_type.replace(/_/g, ' ').toUpperCase()} Report - ${report.report_period_month}`,
            body: emailBody,
            from_name: 'Breakthrough Manager OS'
          });
          deliveryStatus[email] = 'sent';
          sentCount++;
        } catch (err) {
          deliveryStatus[email] = `failed: ${err.message}`;
        }
      }

      // Log distribution
      const log = await base44.entities.DistributionLog.create({
        report_id,
        report_type: report.report_type,
        report_period: report.report_period_month,
        distribution_rule_id: rule.id,
        distribution_rule_name: rule.rule_name,
        sent_date: new Date().toISOString(),
        recipient_count: recipients.length,
        recipients,
        status: sentCount === recipients.length ? 'sent' : 'partial',
        delivery_status: JSON.stringify(deliveryStatus),
        key_findings_included: keyFindings
      });

      distributionLog.push(log);

      // Update rule's last_triggered
      await base44.entities.DistributionRule.update(rule.id, {
        last_triggered: new Date().toISOString()
      });
    }

    return Response.json({
      success: true,
      report_id,
      rules_matched: matchingRules.length,
      distributions_sent: distributionLog.length,
      distribution_logs: distributionLog
    });
  } catch (error) {
    console.error('Distribution error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});