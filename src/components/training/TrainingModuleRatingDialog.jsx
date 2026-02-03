import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Star, ThumbsUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TrainingModuleRatingDialog({ assignment, open, onOpenChange }) {
  const [rating, setRating] = useState({
    effectiveness_rating: 0,
    content_quality: 0,
    practical_application: 0,
    would_recommend: true,
    feedback_text: '',
    improvement_suggestions: '',
    skills_gained: '',
  });

  const queryClient = useQueryClient();

  const ratingMutation = useMutation({
    mutationFn: async (ratingData) => {
      return await base44.entities.TrainingModuleRating.create(ratingData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['trainingRatings'] });
      toast.success('Training rating submitted successfully!');
      onOpenChange(false);
      setRating({
        effectiveness_rating: 0,
        content_quality: 0,
        practical_application: 0,
        would_recommend: true,
        feedback_text: '',
        improvement_suggestions: '',
        skills_gained: '',
      });
    },
    onError: (error) => {
      toast.error('Failed to submit rating: ' + error.message);
    },
  });

  const handleSubmit = () => {
    if (rating.effectiveness_rating === 0) {
      toast.error('Please provide an effectiveness rating');
      return;
    }

    ratingMutation.mutate({
      module_id: assignment.module_id,
      module_name: assignment.module_name,
      practitioner_id: assignment.practitioner_id,
      practitioner_name: assignment.practitioner_name,
      ...rating,
      completion_date: assignment.completion_date,
      rated_date: new Date().toISOString().split('T')[0],
    });
  };

  const StarRating = ({ value, onChange, label }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="transition-colors"
          >
            <Star
              className={`w-6 h-6 ${
                star <= value
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-slate-300'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Rate Training Module</DialogTitle>
          <DialogDescription>
            {assignment?.module_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Overall Effectiveness */}
          <StarRating
            value={rating.effectiveness_rating}
            onChange={(val) => setRating({ ...rating, effectiveness_rating: val })}
            label="Overall Effectiveness *"
          />

          {/* Content Quality */}
          <StarRating
            value={rating.content_quality}
            onChange={(val) => setRating({ ...rating, content_quality: val })}
            label="Content Quality"
          />

          {/* Practical Application */}
          <StarRating
            value={rating.practical_application}
            onChange={(val) => setRating({ ...rating, practical_application: val })}
            label="Practical Application"
          />

          {/* Would Recommend */}
          <div className="space-y-2">
            <Label>Would you recommend this module?</Label>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={rating.would_recommend ? 'default' : 'outline'}
                onClick={() => setRating({ ...rating, would_recommend: true })}
                className="flex items-center gap-2"
              >
                <ThumbsUp className="w-4 h-4" />
                Yes
              </Button>
              <Button
                type="button"
                variant={!rating.would_recommend ? 'default' : 'outline'}
                onClick={() => setRating({ ...rating, would_recommend: false })}
              >
                No
              </Button>
            </div>
          </div>

          {/* Skills Gained */}
          <div className="space-y-2">
            <Label>Skills or Knowledge Gained</Label>
            <Textarea
              placeholder="What specific skills or knowledge did you gain from this training?"
              value={rating.skills_gained}
              onChange={(e) => setRating({ ...rating, skills_gained: e.target.value })}
              rows={3}
            />
          </div>

          {/* Detailed Feedback */}
          <div className="space-y-2">
            <Label>Detailed Feedback</Label>
            <Textarea
              placeholder="Share your thoughts about the training content, delivery, and relevance..."
              value={rating.feedback_text}
              onChange={(e) => setRating({ ...rating, feedback_text: e.target.value })}
              rows={4}
            />
          </div>

          {/* Improvement Suggestions */}
          <div className="space-y-2">
            <Label>Suggestions for Improvement</Label>
            <Textarea
              placeholder="How could this training module be improved?"
              value={rating.improvement_suggestions}
              onChange={(e) => setRating({ ...rating, improvement_suggestions: e.target.value })}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={ratingMutation.isPending || rating.effectiveness_rating === 0}
          >
            {ratingMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Rating'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}