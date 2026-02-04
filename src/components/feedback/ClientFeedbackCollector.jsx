import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Star, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function ClientFeedbackCollector({ clientId, clientName, practitionerId, practitionerName }) {
  const [ratings, setRatings] = useState({
    overall_satisfaction: 0,
    service_quality_rating: 0,
    communication_rating: 0,
    goal_progress_rating: 0
  });
  const [feedback, setFeedback] = useState('');
  const [improvementAreas, setImprovementAreas] = useState([]);
  const [wouldRecommend, setWouldRecommend] = useState(false);

  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.ClientFeedback.create({
        client_id: clientId,
        client_name: clientName,
        practitioner_id: practitionerId,
        practitioner_name: practitionerName,
        feedback_date: new Date().toISOString().split('T')[0],
        ...ratings,
        qualitative_feedback: feedback,
        improvement_areas: improvementAreas.filter(Boolean),
        would_recommend: wouldRecommend,
        feedback_source: 'client'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientFeedback'] });
      toast.success('Thank you for your feedback!');
      // Reset form
      setRatings({
        overall_satisfaction: 0,
        service_quality_rating: 0,
        communication_rating: 0,
        goal_progress_rating: 0
      });
      setFeedback('');
      setImprovementAreas([]);
      setWouldRecommend(false);
    }
  });

  const RatingInput = ({ label, value, onChange }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className="focus:outline-none"
          >
            <Star
              className={`h-6 w-6 ${
                rating <= value
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-slate-300'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Service Feedback</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <RatingInput
          label="Overall Satisfaction"
          value={ratings.overall_satisfaction}
          onChange={(val) => setRatings({ ...ratings, overall_satisfaction: val })}
        />

        <RatingInput
          label="Service Quality"
          value={ratings.service_quality_rating}
          onChange={(val) => setRatings({ ...ratings, service_quality_rating: val })}
        />

        <RatingInput
          label="Communication"
          value={ratings.communication_rating}
          onChange={(val) => setRatings({ ...ratings, communication_rating: val })}
        />

        <RatingInput
          label="Progress Towards Goals"
          value={ratings.goal_progress_rating}
          onChange={(val) => setRatings({ ...ratings, goal_progress_rating: val })}
        />

        <div className="space-y-2">
          <Label>Additional Comments</Label>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Share your experience with our service..."
            rows={4}
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            checked={wouldRecommend}
            onCheckedChange={setWouldRecommend}
          />
          <Label>I would recommend this service to others</Label>
        </div>

        <Button
          onClick={() => submitMutation.mutate()}
          disabled={ratings.overall_satisfaction === 0 || submitMutation.isPending}
          className="w-full"
        >
          <Send className="h-4 w-4 mr-2" />
          {submitMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </CardContent>
    </Card>
  );
}