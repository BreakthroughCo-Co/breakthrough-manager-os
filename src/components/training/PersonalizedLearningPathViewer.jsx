import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, Target } from 'lucide-react';

export default function PersonalizedLearningPathViewer({ practitionerId }) {
  const { data: learningPath, isLoading } = useQuery({
    queryKey: ['learningPath', practitionerId],
    queryFn: async () => {
      const response = await base44.functions.invoke('generatePersonalizedLearningPath', {
        practitioner_id: practitionerId
      });
      return response.data;
    },
    enabled: !!practitionerId
  });

  if (isLoading) {
    return <Card><CardContent className="py-6">Generating personalized learning path...</CardContent></Card>;
  }

  if (!learningPath?.success) {
    return null;
  }

  const path = learningPath.learning_path;
  const currentWeek = Math.ceil((new Date() - new Date()) / (7 * 24 * 60 * 60 * 1000)) + 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">90-Day Learning Path</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm font-medium text-blue-900">{path.overall_development_goal}</p>
          <p className="text-xs text-blue-700 mt-1">
            Target Completion: {new Date(path.estimated_completion_date).toLocaleDateString()}
          </p>
        </div>

        <div className="space-y-2">
          {path.learning_path?.slice(0, 12).map((item, idx) => (
            <div
              key={idx}
              className={`p-3 border rounded ${
                item.week === currentWeek ? 'border-teal-500 bg-teal-50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Week {item.week}</Badge>
                    <Badge className={
                      item.priority === 'critical' ? 'bg-red-600' :
                      item.priority === 'high' ? 'bg-orange-600' :
                      'bg-slate-600'
                    }>
                      {item.priority}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium mt-2">{item.module_name}</p>
                  <p className="text-xs text-slate-600 mt-1">{item.rationale}</p>
                  <p className="text-xs text-green-700 mt-1">
                    <strong>Expected Outcome:</strong> {item.expected_outcome}
                  </p>
                </div>
                {item.week < currentWeek && (
                  <CheckCircle className="h-5 w-5 text-green-600 ml-2" />
                )}
                {item.week === currentWeek && (
                  <Clock className="h-5 w-5 text-teal-600 ml-2" />
                )}
              </div>
            </div>
          ))}
        </div>

        {path.checkpoints?.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Key Milestones</h4>
            <div className="space-y-1">
              {path.checkpoints.map((checkpoint, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4 text-teal-600" />
                  <span>Week {checkpoint.week}: {checkpoint.milestone}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}