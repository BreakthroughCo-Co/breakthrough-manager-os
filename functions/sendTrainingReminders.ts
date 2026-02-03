import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get upcoming assignments (due in 3 days)
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const allAssignments = await base44.asServiceRole.entities.TrainingAssignment.list();
    
    const upcomingAssignments = allAssignments.filter(a => {
      const dueDate = new Date(a.due_date);
      const today = new Date();
      return a.completion_status !== 'completed' && 
             dueDate > today && 
             dueDate <= threeDaysFromNow;
    });

    const overdueAssignments = allAssignments.filter(a => {
      const dueDate = new Date(a.due_date);
      return a.completion_status !== 'completed' && dueDate < new Date();
    });

    const reminders = {
      upcoming: [],
      overdue: [],
    };

    // Send reminders for upcoming assignments
    for (const assignment of upcomingAssignments) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: assignment.practitioner_email,
        subject: `Training Reminder: ${assignment.module_name} due soon`,
        body: `Hi ${assignment.practitioner_name},

This is a reminder that your training module "${assignment.module_name}" is due on ${new Date(assignment.due_date).toLocaleDateString()}.

Assignment Details:
- Module: ${assignment.module_name}
- Assigned: ${new Date(assignment.assigned_date).toLocaleDateString()}
- Due Date: ${new Date(assignment.due_date).toLocaleDateString()}
- Reason: ${assignment.assignment_reason.replace(/_/g, ' ')}

Please complete this training at your earliest convenience.

Best regards,
Training Management System`
      });
      reminders.upcoming.push(assignment.practitioner_email);
    }

    // Send reminders for overdue assignments
    for (const assignment of overdueAssignments) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: assignment.practitioner_email,
        subject: `URGENT: Overdue Training - ${assignment.module_name}`,
        body: `Hi ${assignment.practitioner_name},

This is an urgent reminder that your training module "${assignment.module_name}" was due on ${new Date(assignment.due_date).toLocaleDateString()} and is now OVERDUE.

Assignment Details:
- Module: ${assignment.module_name}
- Original Due Date: ${new Date(assignment.due_date).toLocaleDateString()}
- Days Overdue: ${Math.floor((new Date() - new Date(assignment.due_date)) / (1000 * 60 * 60 * 24))}

Please complete this training immediately to maintain compliance.

Best regards,
Training Management System`
      });
      reminders.overdue.push(assignment.practitioner_email);
    }

    return Response.json({
      upcoming_reminders_sent: reminders.upcoming.length,
      overdue_reminders_sent: reminders.overdue.length,
      total_reminders: reminders.upcoming.length + reminders.overdue.length,
    });
  } catch (error) {
    console.error('Training reminders error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});