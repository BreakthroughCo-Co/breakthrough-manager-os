import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

  // Fetch compliance items that have due dates and are not compliant
  const complianceItems = await base44.asServiceRole.entities.ComplianceItem.list();
  const dueItems = complianceItems.filter(item =>
    item.due_date && item.status !== 'compliant'
  );

  const created = [];
  const failed = [];

  for (const item of dueItems) {
    const eventDate = item.due_date; // yyyy-MM-dd

    const event = {
      summary: `[NDIS Compliance] ${item.title}`,
      description: `Category: ${item.category}\nStatus: ${item.status}\nPriority: ${item.priority}\n${item.description || ''}`,
      start: { date: eventDate },
      end: { date: eventDate },
      colorId: item.priority === 'critical' ? '11' : item.priority === 'high' ? '6' : '5',
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 * 7 },  // 7 days prior
          { method: 'popup', minutes: 24 * 60 },        // 1 day prior
        ],
      },
    };

    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (res.ok) {
      created.push(item.title);
    } else {
      const err = await res.json();
      failed.push({ title: item.title, error: err.error?.message });
    }
  }

  return Response.json({
    synced: created.length,
    failed: failed.length,
    created,
    failed_items: failed,
    message: `Synced ${created.length} compliance deadlines to Google Calendar`,
  });
});