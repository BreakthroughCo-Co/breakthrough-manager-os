import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Star,
  Plus,
  Edit,
  MessageSquare,
  ThumbsUp,
  AlertCircle,
  Lightbulb
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const emptyFeedback = {
  client_id: '',
  client_name: '',
  feedback_date: format(new Date(), 'yyyy-MM-dd'),
  feedback_type: 'general',
  submitted_by: '',
  relationship: 'participant',
  service_rating: 0,
  practitioner_rating: 0,
  communication_rating: 0,
  feedback_content: '',
  response_required: false,
  response_content: '',
  response_date: '',
  responded_by: '',
  status: 'new',
  notes: ''
};

const typeConfig = {
  compliment: { label: 'Compliment', color: 'bg-emerald-100 text-emerald-700', icon: ThumbsUp },
  suggestion: { label: 'Suggestion', color: 'bg-blue-100 text-blue-700', icon: Lightbulb },
  complaint: { label: 'Complaint', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  general: { label: 'General', color: 'bg-slate-100 text-slate-700', icon: MessageSquare },
};

const statusColors = {
  new: 'bg-blue-100 text-blue-700',
  acknowledged: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-purple-100 text-purple-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-100 text-slate-700',
};

export default function ClientFeedback() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState(null);
  const [formData, setFormData] = useState(emptyFeedback);

  const queryClient = useQueryClient();

  const { data: feedbacks = [] } = useQuery({
    queryKey: ['clientFeedback'],
    queryFn: () => base44.entities.ClientFeedback.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientFeedback.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientFeedback'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientFeedback.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientFeedback'] });
      handleCloseDialog();
    },
  });

  const handleOpenDialog = (feedback = null) => {
    if (feedback) { setEditingFeedback(feedback); setFormData(feedback); }
    else { setEditingFeedback(null); setFormData(emptyFeedback); }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => { setIsDialogOpen(false); setEditingFeedback(null); setFormData(emptyFeedback); };

  const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    setFormData({ ...formData, client_id: clientId, client_name: client?.full_name || '' });
  };

  const handleSubmit = () => {
    if (editingFeedback) updateMutation.mutate({ id: editingFeedback.id, data: formData });
    else createMutation.mutate(formData);
  };

  // Stats
  const stats = {
    total: feedbacks.length,
    compliments: feedbacks.filter(f => f.feedback_type === 'compliment').length,
    complaints: feedbacks.filter(f => f.feedback_type === 'complaint').length,
    pending: feedbacks.filter(f => f.status === 'new' || f.status === 'acknowledged').length,
  };

  const avgServiceRating = feedbacks.length > 0 
    ? (feedbacks.reduce((sum, f) => sum + (f.service_rating || 0), 0) / feedbacks.filter(f => f.service_rating).length).toFixed(1)
    : 0;

  const StarRating = ({ value, onChange, readonly = false }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onChange(star)}
          disabled={readonly}
          className={cn("transition-colors", readonly ? "cursor-default" : "cursor-pointer")}
        >
          <Star className={cn(
            "w-5 h-5",
            star <= value ? "text-amber-400 fill-amber-400" : "text-slate-200"
          )} />
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-500" />
            Client Feedback
          </h2>
          <p className="text-slate-500 mt-1">Collect and manage client/family feedback</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Feedback
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-xs text-slate-500">Total Feedback</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <p className="text-2xl font-bold text-amber-600">{avgServiceRating}</p>
            </div>
            <p className="text-xs text-slate-500">Avg Rating</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-emerald-600">{stats.compliments}</p>
            <p className="text-xs text-emerald-700">Compliments</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-red-600">{stats.complaints}</p>
            <p className="text-xs text-red-700">Complaints</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            <p className="text-xs text-amber-700">Pending Response</p>
          </CardContent>
        </Card>
      </div>

      {/* Feedback Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {feedbacks.map((feedback) => {
          const config = typeConfig[feedback.feedback_type] || typeConfig.general;
          const Icon = config.icon;
          
          return (
            <Card key={feedback.id} className="hover:shadow-lg transition-all">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", config.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{feedback.client_name || 'Anonymous'}</p>
                      <p className="text-xs text-slate-500">{feedback.submitted_by || 'Unknown'} ({feedback.relationship})</p>
                    </div>
                  </div>
                  <Badge className={statusColors[feedback.status]}>{feedback.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 mb-3 line-clamp-3">{feedback.feedback_content}</p>
                
                {feedback.service_rating > 0 && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-slate-500">Service:</span>
                    <StarRating value={feedback.service_rating} readonly />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {feedback.feedback_date ? format(new Date(feedback.feedback_date), 'MMM d, yyyy') : '-'}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => handleOpenDialog(feedback)}>
                    <Edit className="w-3 h-3 mr-1" />
                    {feedback.status === 'new' ? 'Respond' : 'View'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {feedbacks.length === 0 && (
        <Card className="py-12">
          <div className="text-center">
            <Star className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No feedback collected yet</p>
          </div>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFeedback ? 'View/Respond to Feedback' : 'Add Feedback'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Client</Label>
                <Select value={formData.client_id} onValueChange={handleClientChange}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Anonymous</SelectItem>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Feedback Type</Label>
                <Select value={formData.feedback_type} onValueChange={(v) => setFormData({ ...formData, feedback_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compliment">Compliment</SelectItem>
                    <SelectItem value="suggestion">Suggestion</SelectItem>
                    <SelectItem value="complaint">Complaint</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Submitted By</Label>
                <Input value={formData.submitted_by} onChange={(e) => setFormData({ ...formData, submitted_by: e.target.value })} placeholder="Name" />
              </div>
              <div>
                <Label>Relationship</Label>
                <Select value={formData.relationship} onValueChange={(v) => setFormData({ ...formData, relationship: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="participant">Participant</SelectItem>
                    <SelectItem value="family">Family</SelectItem>
                    <SelectItem value="carer">Carer</SelectItem>
                    <SelectItem value="support_coordinator">Support Coordinator</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Service Rating</Label>
              <StarRating value={formData.service_rating} onChange={(v) => setFormData({ ...formData, service_rating: v })} />
            </div>

            <div>
              <Label>Feedback *</Label>
              <Textarea value={formData.feedback_content} onChange={(e) => setFormData({ ...formData, feedback_content: e.target.value })} placeholder="Feedback details..." rows={4} />
            </div>

            {editingFeedback && (
              <>
                <div className="border-t pt-4">
                  <Label>Response</Label>
                  <Textarea value={formData.response_content} onChange={(e) => setFormData({ ...formData, response_content: e.target.value })} placeholder="Your response..." rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Responded By</Label>
                    <Input value={formData.responded_by} onChange={(e) => setFormData({ ...formData, responded_by: e.target.value })} />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="acknowledged">Acknowledged</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.feedback_content} className="bg-teal-600 hover:bg-teal-700">
              {editingFeedback ? 'Update' : 'Save'} Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}