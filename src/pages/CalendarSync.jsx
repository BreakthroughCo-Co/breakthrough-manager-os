import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, Plus, RefreshCw, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function CalendarSync() {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [syncing, setSyncing] = useState(false);
  const [events, setEvents] = useState([]);
  const [syncStatus, setSyncStatus] = useState(null);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => base44.entities.Appointment.list('-created_date', 100),
  });

  const handleSyncFromGoogle = async () => {
    setSyncing(true);
    setSyncStatus(null);
    try {
      const res = await base44.functions.invoke('syncGoogleCalendar', {
        action: 'fetch',
        week_start: format(currentWeekStart, 'yyyy-MM-dd'),
        week_end: format(addDays(currentWeekStart, 6), 'yyyy-MM-dd'),
      });
      setEvents(res.data?.events || []);
      setSyncStatus({ type: 'success', message: `Synced ${res.data?.events?.length || 0} events from Google Calendar` });
    } catch (e) {
      setSyncStatus({ type: 'error', message: 'Sync failed. Check Google Calendar connector.' });
    } finally {
      setSyncing(false);
    }
  };

  const getEventsForDay = (day) => {
    return events.filter(e => {
      const eventDate = new Date(e.start?.dateTime || e.start?.date);
      return isSameDay(eventDate, day);
    });
  };

  const getAppointmentsForDay = (day) => {
    return appointments.filter(a => {
      if (!a.appointment_date) return false;
      return isSameDay(new Date(a.appointment_date), day);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-teal-600" />
            Calendar Sync
          </h2>
          <p className="text-muted-foreground mt-1">Google Calendar + NDIS scheduling matrix</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSyncFromGoogle} disabled={syncing}>
            {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Sync Google Calendar
          </Button>
        </div>
      </div>

      {syncStatus && (
        <div className={cn(
          "px-4 py-3 rounded-lg text-sm",
          syncStatus.type === 'success' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
        )}>
          {syncStatus.message}
        </div>
      )}

      {/* Week navigation */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="font-medium">
          {format(currentWeekStart, 'MMM d')} – {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
        </span>
        <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
          Today
        </Button>
      </div>

      {/* Weekly grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const googleEvents = getEventsForDay(day);
          const localAppointments = getAppointmentsForDay(day);
          const isToday = isSameDay(day, new Date());

          return (
            <Card key={day.toISOString()} className={cn(isToday && "border-teal-500 border-2")}>
              <CardHeader className="pb-2 pt-3 px-3">
                <p className={cn("text-xs text-muted-foreground uppercase font-medium", isToday && "text-teal-600")}>
                  {format(day, 'EEE')}
                </p>
                <p className={cn("text-lg font-bold", isToday && "text-teal-600")}>
                  {format(day, 'd')}
                </p>
              </CardHeader>
              <CardContent className="px-2 pb-3 space-y-1">
                {googleEvents.map((event, i) => (
                  <div key={i} className="bg-blue-100 text-blue-800 text-xs rounded px-2 py-1 truncate" title={event.summary}>
                    <span className="font-medium">📅</span> {event.summary}
                  </div>
                ))}
                {localAppointments.map((appt, i) => (
                  <div key={i} className="bg-teal-100 text-teal-800 text-xs rounded px-2 py-1 truncate" title={appt.title}>
                    <span className="font-medium">📋</span> {appt.title || 'Appointment'}
                  </div>
                ))}
                {googleEvents.length === 0 && localAppointments.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">—</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-200 inline-block" /> Google Calendar events</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-teal-200 inline-block" /> NDIS Appointments</span>
      </div>
    </div>
  );
}