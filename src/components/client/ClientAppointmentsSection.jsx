import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Clock, MapPin, Plus } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const statusColors = {
  requested: 'bg-slate-100 text-slate-800',
  confirmed: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  rescheduled: 'bg-orange-100 text-orange-800'
};

export default function ClientAppointmentsSection({ clientId }) {
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['clientAppointments', clientId],
    queryFn: () => base44.entities.Appointment.filter({ client_id: clientId }, '-appointment_date', 20)
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  const upcomingAppointments = appointments?.filter(a => {
    const appointmentDate = new Date(a.appointment_date);
    return appointmentDate >= new Date() && ['requested', 'confirmed'].includes(a.status);
  }) || [];

  const pastAppointments = appointments?.filter(a => {
    const appointmentDate = new Date(a.appointment_date);
    return appointmentDate < new Date() || a.status === 'completed';
  }) || [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Appointments ({upcomingAppointments.length})
          </CardTitle>
          <Button size="sm" variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Schedule
          </Button>
        </CardHeader>

        <CardContent>
          {upcomingAppointments.length > 0 ? (
            <div className="space-y-3">
              {upcomingAppointments.map(apt => (
                <div key={apt.id} className="p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium">{apt.session_type}</p>
                      <p className="text-sm text-slate-600">with {apt.practitioner_name}</p>
                    </div>
                    <Badge className={statusColors[apt.status] || ''}>
                      {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="h-4 w-4" />
                      {format(parseISO(apt.appointment_date), 'PPP')}
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock className="h-4 w-4" />
                      {apt.appointment_time} ({apt.duration_minutes} mins)
                    </div>
                    {apt.location && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="h-4 w-4" />
                        {apt.location}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertTitle className="text-slate-600">No upcoming appointments scheduled</AlertTitle>
            </Alert>
          )}
        </CardContent>
      </Card>

      {pastAppointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Past Appointments ({pastAppointments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {pastAppointments.slice(0, 5).map(apt => (
                <div key={apt.id} className="p-2 bg-slate-50 border border-slate-200 rounded text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700">{apt.session_type}</span>
                    <span className="text-xs text-slate-500">
                      {format(parseISO(apt.appointment_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}