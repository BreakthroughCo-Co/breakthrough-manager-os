import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { Star, MessageSquare, CheckCircle2 } from 'lucide-react';

export default function PractitionerMatchFeedbackPanel({ 
  clientId, 
  clientName, 
  practitionerId, 
  practitionerName, 
  matchScore,
  recommendationRank,
  onFeedbackSubmitted 
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitFeedback = async () => {
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    try {
      const feedback = await base44.entities.PractitionerMatchFeedback.create({
        client_id: clientId,
        client_name: clientName,
        practitioner_id: practitionerId,
        practitioner_name: practitionerName,
        match_score: matchScore,
        feedback_rating: rating,
        feedback_reason: reason || 'No specific reason provided',
        was_assigned: true,
        assignment_date: new Date().toISOString().split('T')[0],
        recommendation_rank: recommendationRank
      });

      setSubmitted(true);
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(feedback);
      }

      // Reset after 2 seconds
      setTimeout(() => {
        setRating(0);
        setReason('');
        setSubmitted(false);
      }, 2000);
    } catch (err) {
      alert('Error submitting feedback: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="flex items-center gap-3 py-4">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <span className="text-green-700">Feedback recorded. Thank you!</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Rate This Match
        </CardTitle>
        <CardDescription>
          Your feedback helps improve future recommendations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Match Info */}
        <div className="bg-slate-50 rounded p-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-slate-600">Client:</span>
              <p className="font-semibold">{clientName}</p>
            </div>
            <div>
              <span className="text-slate-600">Practitioner:</span>
              <p className="font-semibold">{practitionerName}</p>
            </div>
            <div>
              <span className="text-slate-600">AI Match Score:</span>
              <p className="font-semibold">{matchScore}/100</p>
            </div>
            <div>
              <span className="text-slate-600">Recommendation Rank:</span>
              <Badge variant="secondary">#{recommendationRank}</Badge>
            </div>
          </div>
        </div>

        {/* Star Rating */}
        <div className="space-y-2">
          <label className="text-sm font-semibold">How would you rate this match?</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-8 w-8 ${
                    star <= (hoverRating || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-slate-300'
                  }`}
                />
              </button>
            ))}
          </div>
          <div className="text-xs text-slate-600">
            {rating === 0 && 'Select a rating'}
            {rating === 1 && 'Poor match'}
            {rating === 2 && 'Fair match'}
            {rating === 3 && 'Good match'}
            {rating === 4 && 'Very good match'}
            {rating === 5 && 'Excellent match'}
          </div>
        </div>

        {/* Reason */}
        <div className="space-y-2">
          <label className="text-sm font-semibold">Why did you rate it this way? (optional)</label>
          <Textarea
            placeholder="E.g., Great skill alignment, but availability concerns... Poor engagement history despite good skills..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="text-sm"
          />
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmitFeedback}
          disabled={isSubmitting || rating === 0}
          className="w-full"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </CardContent>
    </Card>
  );
}