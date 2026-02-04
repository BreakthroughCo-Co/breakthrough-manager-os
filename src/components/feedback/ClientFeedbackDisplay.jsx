import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, ThumbsUp } from 'lucide-react';
import { format } from 'date-fns';

export default function ClientFeedbackDisplay({ clientId, practitionerId }) {
  const { data: feedbackList = [] } = useQuery({
    queryKey: ['clientFeedback', clientId, practitionerId],
    queryFn: async () => {
      const filters = {};
      if (clientId) filters.client_id = clientId;
      if (practitionerId) filters.practitioner_id = practitionerId;
      return base44.entities.ClientFeedback.filter(filters, '-feedback_date');
    },
    enabled: !!(clientId || practitionerId)
  });

  const averageRating = feedbackList.length > 0
    ? (feedbackList.reduce((sum, f) => sum + f.overall_satisfaction, 0) / feedbackList.length).toFixed(1)
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Client Feedback</CardTitle>
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            <span className="text-lg font-bold">{averageRating}</span>
            <span className="text-sm text-slate-600">({feedbackList.length})</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {feedbackList.slice(0, 5).map((feedback) => (
          <div key={feedback.id} className="p-3 border rounded space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < feedback.overall_satisfaction
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-slate-600">
                {format(new Date(feedback.feedback_date), 'MMM d, yyyy')}
              </span>
            </div>

            {feedback.qualitative_feedback && (
              <p className="text-sm text-slate-700">{feedback.qualitative_feedback}</p>
            )}

            {feedback.would_recommend && (
              <Badge className="bg-green-100 text-green-800">
                <ThumbsUp className="h-3 w-3 mr-1" />
                Would Recommend
              </Badge>
            )}
          </div>
        ))}

        {feedbackList.length === 0 && (
          <p className="text-center text-sm text-slate-500 py-4">
            No feedback received yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}