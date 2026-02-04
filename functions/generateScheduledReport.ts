import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { scheduled_report_id } = await req.json();

    const scheduledReport = await base44.asServiceRole.entities.ScheduledReport.get(scheduled_report_id);

    // Generate report data based on type
    let reportData;
    let reportTitle;

    switch (scheduledReport.report_type) {
      case 'client_progress':
        reportData = await generateClientProgressData(base44);
        reportTitle = 'Client Progress Report';
        break;
      case 'funding_expenditure':
        reportData = await generateFundingData(base44);
        reportTitle = 'Funding Expenditure Report';
        break;
      case 'practitioner_performance':
        reportData = await generatePractitionerData(base44);
        reportTitle = 'Practitioner Performance Report';
        break;
      case 'compliance_status':
        reportData = await generateComplianceData(base44);
        reportTitle = 'NDIS Compliance Status Report';
        break;
      default:
        reportData = [];
        reportTitle = 'Custom Report';
    }

    // Generate CSV content
    const csvContent = generateCSV(reportData);
    
    // Send emails to recipients
    const emailPromises = scheduledReport.recipient_emails.map(async (email) => {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'Breakthrough Manager OS',
        to: email,
        subject: `${reportTitle} - ${new Date().toLocaleDateString()}`,
        body: `
          <h2>${reportTitle}</h2>
          <p>Generated: ${new Date().toLocaleString()}</p>
          <p>This is your scheduled ${scheduledReport.frequency} report.</p>
          <p><strong>Report contains ${reportData.length} records.</strong></p>
          <hr/>
          <p>Report data is attached as CSV.</p>
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            This is an automated report from Breakthrough Manager OS.
          </p>
        `
      });
    });

    await Promise.all(emailPromises);

    // Update scheduled report
    const nextScheduled = calculateNextSchedule(
      scheduledReport.frequency,
      scheduledReport.schedule_day,
      scheduledReport.schedule_time
    );

    await base44.asServiceRole.entities.ScheduledReport.update(scheduled_report_id, {
      last_generated: new Date().toISOString(),
      next_scheduled: nextScheduled
    });

    return Response.json({
      success: true,
      report_type: scheduledReport.report_type,
      records_generated: reportData.length,
      recipients_notified: scheduledReport.recipient_emails.length,
      next_scheduled: nextScheduled
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});

async function generateClientProgressData(base44) {
  const clients = await base44.asServiceRole.entities.Client.list();
  const goals = await base44.asServiceRole.entities.ClientGoal.list();
  
  return clients.map(client => {
    const clientGoals = goals.filter(g => g.client_id === client.id);
    return {
      'Client Name': client.full_name,
      'NDIS Number': client.ndis_number,
      'Active Goals': clientGoals.filter(g => g.status === 'in_progress').length,
      'Achieved Goals': clientGoals.filter(g => g.status === 'achieved').length,
      'Avg Progress': clientGoals.length > 0 
        ? (clientGoals.reduce((sum, g) => sum + (g.current_progress || 0), 0) / clientGoals.length).toFixed(1)
        : 0,
      'Risk Level': client.risk_level || 'Not assessed'
    };
  });
}

async function generateFundingData(base44) {
  const clients = await base44.asServiceRole.entities.Client.list();
  
  return clients.map(client => ({
    'Client Name': client.full_name,
    'NDIS Number': client.ndis_number,
    'Allocated': client.funding_allocated || 0,
    'Utilized': client.funding_utilised || 0,
    'Remaining': (client.funding_allocated || 0) - (client.funding_utilised || 0),
    'Utilization %': client.funding_allocated 
      ? ((client.funding_utilised || 0) / client.funding_allocated * 100).toFixed(1)
      : 0
  }));
}

async function generatePractitionerData(base44) {
  const practitioners = await base44.asServiceRole.entities.Practitioner.list();
  const clients = await base44.asServiceRole.entities.Client.list();
  
  return practitioners.map(prac => {
    const pracClients = clients.filter(c => c.assigned_practitioner_id === prac.id);
    return {
      'Practitioner': prac.full_name,
      'Role': prac.role,
      'Active Caseload': pracClients.filter(c => c.status === 'active').length,
      'Total Clients': pracClients.length
    };
  });
}

async function generateComplianceData(base44) {
  const response = await base44.asServiceRole.functions.invoke('analyzeNDISCompliance', {});
  const issues = response.data?.issues || [];
  
  return issues.map(issue => ({
    'Severity': issue.severity,
    'Category': issue.category,
    'Entity': issue.entity_name,
    'Issue': issue.issue,
    'Required Action': issue.required_action
  }));
}

function generateCSV(data) {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(h => `"${row[h]}"`).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

function calculateNextSchedule(frequency, scheduleDay, scheduleTime) {
  const now = new Date();
  const next = new Date();
  
  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + ((scheduleDay - next.getDay() + 7) % 7 || 7));
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      next.setDate(scheduleDay || 1);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
  }
  
  if (scheduleTime) {
    const [hours, minutes] = scheduleTime.split(':');
    next.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  }
  
  return next.toISOString();
}