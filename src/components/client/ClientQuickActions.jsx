import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, FileText, Phone, Mail, ClipboardList, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ClientQuickActions({ clientId, clientName }) {
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const [appointmentData, setAppointmentData] = useState({
    appointment_date: '',
    appointment_time: '',
    session_type: 'direct_support',
    location: '',
    notes: ''
  });

  const [noteData, setNoteData] = useState({
    note_type: 'progress_note',
    session_summary: '',
    observations: ''
  });

  const createAppointmentMutation = useMutation({
    mutationFn: (data) => base44.entities.Appointment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', clientId] });
      toast.success('Appointment scheduled');
      setAppointmentDialogOpen(false);
      setAppointmentData({
        appointment_date: '',
        appointment_time: '',
        session_type: 'direct_support',
        location: '',
        notes: ''
      });
    },
    onError: (error) => {
      toast.error('Failed to schedule appointment');
    }
  });

  const createNoteMutation = useMutation({
    mutationFn: (data) => base44.entities.CaseNote.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caseNotes', clientId] });
      toast.success('Session note created');
      setNoteDialogOpen(false);
      setNoteData({
        note_type: 'progress_note',
        session_summary: '',
        observations: ''
      });
    },
    onError: (error) => {
      toast.error('Failed to create note');
    }
  });

  const handleScheduleAppointment = () => {
    createAppointmentMutation.mutate({
      client_id: clientId,
      client_name: clientName,
      ...appointmentData,
      status: 'confirmed'
    });
  };

  const handleCreateNote = () => {
    createNoteMutation.mutate({
      client_id: clientId,
      client_name: clientName,
      ...noteData
    });
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setAppointmentDialogOpen(true)}
          className="gap-2"
        >
          <Calendar className="h-4 w-4" />
          Schedule Appointment
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={() => setNoteDialogOpen(true)}
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          Log Session Note
        </Button>
      </div>

      {/* Schedule Appointment Dialog */}
      <Dialog open={appointmentDialogOpen} onOpenChange={setAppointmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Appointment - {clientName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={appointmentData.appointment_date}
                  onChange={(e) => setAppointmentData({ ...appointmentData, appointment_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Time</Label>
                <Input
                  type="time"
                  value={appointmentData.appointment_time}
                  onChange={(e) => setAppointmentData({ ...appointmentData, appointment_time: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Session Type</Label>
              <Select
                value={appointmentData.session_type}
                onValueChange={(value) => setAppointmentData({ ...appointmentData, session_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct_support">Direct Support</SelectItem>
                  <SelectItem value="assessment">Assessment</SelectItem>
                  <SelectItem value="plan_review">Plan Review</SelectItem>
                  <SelectItem value="consultation">Consultation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Location</Label>
              <Input
                value={appointmentData.location}
                onChange={(e) => setAppointmentData({ ...appointmentData, location: e.target.value })}
                placeholder="Home, office, community..."
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={appointmentData.notes}
                onChange={(e) => setAppointmentData({ ...appointmentData, notes: e.target.value })}
                placeholder="Session objectives, preparation notes..."
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAppointmentDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleScheduleAppointment}
              disabled={!appointmentData.appointment_date || !appointmentData.appointment_time}
            >
              Schedule
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Session Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Session Note - {clientName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Note Type</Label>
              <Select
                value={noteData.note_type}
                onValueChange={(value) => setNoteData({ ...noteData, note_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="progress_note">Progress Note</SelectItem>
                  <SelectItem value="incident_report">Incident Report</SelectItem>
                  <SelectItem value="assessment_note">Assessment Note</SelectItem>
                  <SelectItem value="plan_review_note">Plan Review Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Session Summary</Label>
              <Textarea
                value={noteData.session_summary}
                onChange={(e) => setNoteData({ ...noteData, session_summary: e.target.value })}
                placeholder="Brief summary of session..."
                rows={3}
              />
            </div>
            <div>
              <Label>Observations</Label>
              <Textarea
                value={noteData.observations}
                onChange={(e) => setNoteData({ ...noteData, observations: e.target.value })}
                placeholder="Key observations, behaviors, progress..."
                rows={4}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateNote}
              disabled={!noteData.session_summary}
            >
              Save Note
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}