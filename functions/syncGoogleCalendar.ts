/**
 * Google Calendar Sync
 * Fetches events for a given week range from the authorized Google Calendar connector
 * and optionally pushes NDIS appointments to Google Calendar.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action, week_start, week_end, event_data } = body;

  const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

  if (action === 'fetch') {
    const timeMin = new Date(week_start).toISOString();
    const timeMax = new Date(week_end + 'T23:59:59').toISOString();

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: 'Google Calendar fetch failed', details: err }, { status: 502 });
    }

    const data = await res.json();
    return Response.json({ events: data.items || [] });
  }

  if (action === 'create') {
    // Push an NDIS appointment to Google Calendar
    if (!event_data) return Response.json({ error: 'event_data required for create action' }, { status: 400 });

    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: event_data.title || 'NDIS Appointment',
          description: event_data.description || '',
          start: { dateTime: event_data.start, timeZone: 'Australia/Melbourne' },
          end: { dateTime: event_data.end, timeZone: 'Australia/Melbourne' },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: 'Failed to create Google Calendar event', details: err }, { status: 502 });
    }

    const created = await res.json();
    return Response.json({ success: true, event_id: created.id, html_link: created.htmlLink });
  }

  return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
});