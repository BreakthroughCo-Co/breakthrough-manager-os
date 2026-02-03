import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';

export default function MentorshipSessionForm({ assignment, onClose }) {
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState('60');
  const [topicsCovered, setTopicsCovered] = useState('');
  const [mentorObservations, setMentorObservations] = useState('');
  const [mentorFeedback, setMentorFeedback] = useState('');
  const [menteeFeedback, setMenteeFeedback] = useState('');
  const [progressRating, setProgressRating] = useState('on_track');
  const [mentorRating, setMentorRating] = useState(4);
  const [nextSessionDate, setNextSessionDate] = useState('');

  const submitMutation = useMutation({
    mutationFn: async () => {
      const session = await base44.entities.MentorshipSession.create({
        mentorship_assignment_id: assignment.id,
        mentor_id: assignment.mentor_id,
        mentor_name: assignment.mentor_name,
        mentee_id: assignment.mentee_id,
        mentee_name: assignment.mentee_name,
        session_date: sessionDate,
        session_duration_minutes: parseInt(duration),
        topics_covered: topicsCovered.split(',').map(t => t.trim()).filter(t => t),
        focus_area: assignment.focus_area,
        mentor_observations: mentorObservations,
        mentor_feedback: mentorFeedback,
        mentee_feedback: menteeFeedback,
        progress_on_goals: progressRating,
        mentor_rating: parseInt(mentorRating),
        next_session_date: nextSessionDate
      });

      // Update assignment
      await base44.entities.MentorshipAssignment.update(assignment.id, {
        last_session_date: sessionDate,
        session_count: (assignment.session_count || 0) + 1,
        overall_progress_rating: parseInt(mentorRating)
      });

      // Audit log
      await base44.entities.AuditLog.create({
        event_type: 'mentorship_session_logged',
        entity_type: 'MentorshipSession',
        entity_id: session.id,
        document_name: `Session: ${assignment.mentee_name} - ${sessionDate}`,
        extracted_data: JSON.stringify({
          mentor_feedback: mentorFeedback,
          mentee_feedback: menteeFeedback,
          progress: progressRating
        }),
        validated_by: (await base44.auth.me()).email,
        validation_status: 'approved',
        notes: `Mentorship session recorded for ${assignment.focus_area}`
      });

      return session;
    },
    onSuccess: () => {
      onClose();
    }
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-start justify-between sticky top-0 bg-white border-b">
          <div>
            <CardTitle className="text-base">Log Mentorship Session</CardTitle>
            <CardDescription>
              {assignment.mentee_name} ← {assignment.mentor_name}
            </CardDescription>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </CardHeader>

        <CardContent className="pt-6 space-y-4">
          {/* Session Basics */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-900 block mb-1">Session Date</label>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full border rounded px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-900 block mb-1">Duration (minutes)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full border rounded px-2 py-1 text-xs"
              />
            </div>
          </div>

          {/* Topics */}
          <div>
            <label className="text-xs font-semibold text-slate-900 block mb-1">Topics Covered (comma-separated)</label>
            <input
              type="text"
              placeholder="e.g., NDIS compliance, documentation, client communication"
              value={topicsCovered}
              onChange={(e) => setTopicsCovered(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>

          {/* Mentor Section */}
          <div className="border-t pt-4">
            <h3 className="text-xs font-semibold text-slate-900 mb-3">Mentor Feedback</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-900 block mb-1">Observations</label>
                <textarea
                  value={mentorObservations}
                  onChange={(e) => setMentorObservations(e.target.value)}
                  placeholder="What did you observe in this session?"
                  rows="2"
                  className="w-full border rounded px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-900 block mb-1">Feedback & Suggestions</label>
                <textarea
                  value={mentorFeedback}
                  onChange={(e) => setMentorFeedback(e.target.value)}
                  placeholder="Constructive feedback for mentee"
                  rows="2"
                  className="w-full border rounded px-3 py-2 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-900 block mb-1">Progress Rating</label>
                  <select
                    value={progressRating}
                    onChange={(e) => setProgressRating(e.target.value)}
                    className="w-full border rounded px-2 py-1 text-xs"
                  >
                    <option value="exceeding">Exceeding</option>
                    <option value="on_track">On Track</option>
                    <option value="needs_focus">Needs Focus</option>
                    <option value="declining">Declining</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-900 block mb-1">Your Rating (1-5)</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(rating => (
                      <button
                        key={rating}
                        onClick={() => setMentorRating(rating)}
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          mentorRating === rating
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mentee Section */}
          <div className="border-t pt-4">
            <h3 className="text-xs font-semibold text-slate-900 mb-3">Mentee Feedback</h3>
            <textarea
              value={menteeFeedback}
              onChange={(e) => setMenteeFeedback(e.target.value)}
              placeholder="Mentee's feedback on session and mentorship experience"
              rows="2"
              className="w-full border rounded px-3 py-2 text-xs"
            />
          </div>

          {/* Next Session */}
          <div className="border-t pt-4">
            <label className="text-xs font-semibold text-slate-900 block mb-1">Next Session Date</label>
            <input
              type="date"
              value={nextSessionDate}
              onChange={(e) => setNextSessionDate(e.target.value)}
              className="w-full border rounded px-2 py-1 text-xs"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              className="flex-1"
            >
              Save Session
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}