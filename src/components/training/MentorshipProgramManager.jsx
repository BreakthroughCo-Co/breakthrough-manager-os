import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertCircle, CheckCircle2, Clock, TrendingUp } from 'lucide-react';

export default function MentorshipProgramManager() {
  const [selectedPairing, setSelectedPairing] = useState(null);
  const [mentorFeedback, setMentorFeedback] = useState('');
  const [menteeFeedback, setMenteeFeedback] = useState('');
  const [progressRating, setProgressRating] = useState(3);

  const queryClient = useQueryClient();

  const { data: skillMatrix } = useQuery({
    queryKey: ['skillMatrix'],
    queryFn: async () => {
      const result = await base44.functions.invoke('generatePractitionerSkillMatrix', {});
      return result.data;
    }
  });

  const { data: practitioners } = useQuery({
    queryKey: ['practitioners'],
    queryFn: async () => base44.entities.Practitioner.list()
  });

  const trackProgressMutation = useMutation({
    mutationFn: async (data) => {
      const result = await base44.functions.invoke('trackMentorshipProgress', data);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentorshipProgress'] });
      setMentorFeedback('');
      setMenteeFeedback('');
      setProgressRating(3);
      setSelectedPairing(null);
    }
  });

  const pairings = skillMatrix?.skill_matrix?.peer_mentor_pairings || [];

  const handleTrackProgress = async (pairing) => {
    const mentor = practitioners?.find(p => p.full_name === pairing.mentor_name);
    const mentee = practitioners?.find(p => p.full_name === pairing.mentee_name);

    if (mentor && mentee) {
      trackProgressMutation.mutate({
        mentor_id: mentor.id,
        mentee_id: mentee.id,
        focus_area: pairing.focus_area,
        mentor_feedback: mentorFeedback,
        mentee_feedback: menteeFeedback,
        progress_rating: progressRating
      });
    }
  };

  return (
    <Tabs defaultValue="pairings" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="pairings">Active Pairings</TabsTrigger>
        <TabsTrigger value="progress">Progress Tracking</TabsTrigger>
      </TabsList>

      {/* Active Pairings */}
      <TabsContent value="pairings" className="space-y-4 mt-4">
        {pairings.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-slate-600">No mentorship pairings identified yet. Generate skill matrix first.</p>
            </CardContent>
          </Card>
        ) : (
          pairings.map((pairing, idx) => (
            <Card key={idx} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">
                      <span className="text-teal-600 font-semibold">{pairing.mentor_name}</span>
                      <span className="mx-2 text-slate-400">→</span>
                      <span className="text-slate-900">{pairing.mentee_name}</span>
                    </CardTitle>
                    <CardDescription>Focus: {pairing.focus_area}</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-teal-600">Active</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-slate-50 rounded">
                    <p className="text-slate-600 mb-1">Mentor Role</p>
                    <p className="font-semibold text-slate-900">
                      {practitioners?.find(p => p.full_name === pairing.mentor_name)?.role}
                    </p>
                  </div>
                  <div className="p-2 bg-slate-50 rounded">
                    <p className="text-slate-600 mb-1">Mentee Role</p>
                    <p className="font-semibold text-slate-900">
                      {practitioners?.find(p => p.full_name === pairing.mentee_name)?.role}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => setSelectedPairing(idx)}
                  className="w-full bg-teal-600 hover:bg-teal-700"
                >
                  Log Progress Session
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>

      {/* Progress Tracking */}
      <TabsContent value="progress" className="space-y-4 mt-4">
        {selectedPairing !== null && pairings[selectedPairing] ? (
          <Card className="border-teal-200 bg-teal-50">
            <CardHeader>
              <CardTitle className="text-sm">
                {pairings[selectedPairing].mentor_name} mentoring {pairings[selectedPairing].mentee_name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress Rating */}
              <div>
                <label className="text-xs font-semibold text-slate-900 mb-2 block">
                  Progress Rating: {progressRating}/5
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(num => (
                    <button
                      key={num}
                      onClick={() => setProgressRating(num)}
                      className={`w-8 h-8 rounded border text-xs font-semibold transition-colors ${
                        progressRating === num
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'border-slate-300 text-slate-600 hover:border-teal-600'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mentor Feedback */}
              <div>
                <label className="text-xs font-semibold text-slate-900 mb-2 block">Mentor Feedback</label>
                <textarea
                  placeholder="Observations on mentee progress, areas of strength, recommendations..."
                  value={mentorFeedback}
                  onChange={(e) => setMentorFeedback(e.target.value)}
                  className="w-full text-xs p-2 border rounded h-20"
                />
              </div>

              {/* Mentee Feedback */}
              <div>
                <label className="text-xs font-semibold text-slate-900 mb-2 block">Mentee Feedback</label>
                <textarea
                  placeholder="Learning progress, challenges faced, support needs..."
                  value={menteeFeedback}
                  onChange={(e) => setMenteeFeedback(e.target.value)}
                  className="w-full text-xs p-2 border rounded h-20"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleTrackProgress(pairings[selectedPairing])}
                  disabled={trackProgressMutation.isPending}
                  className="flex-1 bg-teal-600 hover:bg-teal-700"
                >
                  {trackProgressMutation.isPending ? 'Logging...' : 'Log Progress'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedPairing(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>

              {trackProgressMutation.isSuccess && (
                <div className="p-2 bg-green-50 border border-green-200 rounded flex items-start gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5" />
                  <p className="text-xs text-green-700">Progress logged and audit trail created.</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-slate-600">Select a mentorship pairing to log progress.</p>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}