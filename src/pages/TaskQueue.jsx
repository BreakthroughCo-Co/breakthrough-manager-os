import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, CheckCircle2, AlertTriangle, Calendar } from 'lucide-react';

export default function TaskQueue() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', user?.email],
    queryFn: () => base44.entities.Task.filter({ assigned_to: user?.full_name }),
    enabled: !!user,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', user?.full_name],
    queryFn: () => base44.entities.ScheduledReview.filter({ assigned_to: user?.full_name }),
    enabled: !!user,
  });

  const completeTaskMutation = useMutation({
    mutationFn: (taskId) => base44.entities.Task.update(taskId, { status: 'completed' }),
    onSuccess: () => queryClient.invalidateQueries(['tasks']),
  });

  const completeReviewMutation = useMutation({
    mutationFn: (reviewId) => base44.entities.ScheduledReview.update(reviewId, {
      status: 'completed',
      completed_date: new Date().toISOString(),
    }),
    onSuccess: () => queryClient.invalidateQueries(['reviews']),
  });

  const urgentTasks = tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed');
  const overdueReviews = reviews.filter(r => r.priority === 'overdue' && r.status !== 'completed');

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'urgent': return 'bg-orange-100 text-orange-800';
      case 'high': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Task Queue</h1>
        <p className="text-muted-foreground">Your assigned tasks and scheduled reviews</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{overdueReviews.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Urgent Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{urgentTasks.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{tasks.filter(t => t.status === 'pending').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Scheduled Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{reviews.filter(r => r.status === 'pending').length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="reviews">Scheduled Reviews ({reviews.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-3">
          {tasks.map(task => (
            <Card key={task.id} className="border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{task.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                    {task.status !== 'completed' && (
                      <Button size="sm" onClick={() => completeTaskMutation.mutate(task.id)}>
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Due: {task.due_date}
                  </span>
                  <span>Category: {task.category}</span>
                  {task.related_entity_type && (
                    <span>Related: {task.related_entity_type}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="reviews" className="space-y-3">
          {reviews.map(review => (
            <Card key={review.id} className={`border-l-4 ${
              review.priority === 'overdue' ? 'border-l-red-500' : 'border-l-orange-500'
            }`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{review.entity_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {review.review_type.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getPriorityColor(review.priority)}>
                      {review.priority}
                    </Badge>
                    {review.days_until_due !== undefined && (
                      <Badge variant="outline">
                        {review.days_until_due < 0 ? `${Math.abs(review.days_until_due)} days overdue` : `${review.days_until_due} days`}
                      </Badge>
                    )}
                    {review.status !== 'completed' && (
                      <Button size="sm" onClick={() => completeReviewMutation.mutate(review.id)}>
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Due: {review.due_date}
                  </span>
                  {review.notes && <span>{review.notes}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}