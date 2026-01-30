import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Sparkles,
  Loader2,
  Copy,
  Check,
  User
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

const emptyStory = {
  client_id: '',
  client_name: '',
  title: '',
  scenario_description: '',
  story_content: '',
  story_type: 'social_story',
  target_skill: '',
  reading_level: 'simple',
  created_by: '',
  status: 'draft',
  notes: ''
};

const typeColors = {
  social_story: 'bg-blue-100 text-blue-700',
  visual_script: 'bg-purple-100 text-purple-700',
  comic_strip: 'bg-amber-100 text-amber-700',
  first_then: 'bg-emerald-100 text-emerald-700',
};

export default function SocialStories() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStory, setEditingStory] = useState(null);
  const [formData, setFormData] = useState(emptyStory);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const queryClient = useQueryClient();

  const { data: stories = [] } = useQuery({
    queryKey: ['socialStories'],
    queryFn: () => base44.entities.SocialStory.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SocialStory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['socialStories'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SocialStory.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['socialStories'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SocialStory.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['socialStories'] }),
  });

  const handleOpenDialog = (story = null) => {
    if (story) { setEditingStory(story); setFormData(story); }
    else { setEditingStory(null); setFormData(emptyStory); }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => { setIsDialogOpen(false); setEditingStory(null); setFormData(emptyStory); };

  const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    setFormData({ ...formData, client_id: clientId, client_name: client?.full_name || '' });
  };

  const handleGenerate = async () => {
    if (!formData.scenario_description) return;

    setIsGenerating(true);

    const typePrompts = {
      social_story: `Write a Social Story™ following Carol Gray's format with descriptive, perspective, directive, and affirmative sentences. Use first person. Keep it ${formData.reading_level === 'simple' ? 'very simple with short sentences' : formData.reading_level === 'intermediate' ? 'clear and easy to understand' : 'detailed but accessible'}.`,
      visual_script: `Create a visual script with numbered steps. Each step should be a clear, single action. Format as a numbered list.`,
      comic_strip: `Create a comic strip conversation script with dialogue bubbles. Format as: Panel 1: [Description] - Character says: "..." etc.`,
      first_then: `Create a First-Then board script. Format as: FIRST: [action] THEN: [reward/next step]. Keep it very simple.`
    };

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a specialist in creating social stories and visual supports for individuals with autism and developmental disabilities.

Scenario: ${formData.scenario_description}
Target Skill: ${formData.target_skill || 'General understanding'}
Client Name (use "I" instead): ${formData.client_name || 'the person'}

${typePrompts[formData.story_type]}

Create an appropriate ${formData.story_type.replace(/_/g, ' ')} for this scenario. Be positive, supportive, and focus on what TO do rather than what NOT to do.`
      });

      setFormData(prev => ({ ...prev, story_content: result }));
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(formData.story_content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = () => {
    if (editingStory) updateMutation.mutate({ id: editingStory.id, data: formData });
    else createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-amber-600" />
            Social Story & Visual Script Creator
          </h2>
          <p className="text-slate-500 mt-1">AI-powered social story generation</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />
          Create New
        </Button>
      </div>

      {/* Stories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stories.map((story) => (
          <Card key={story.id} className="hover:shadow-lg transition-all">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{story.title || 'Untitled'}</CardTitle>
                  <p className="text-sm text-slate-500">{story.client_name || 'No client'}</p>
                </div>
                <Badge className={typeColors[story.story_type]}>{story.story_type?.replace(/_/g, ' ')}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 line-clamp-3 mb-4">{story.scenario_description || 'No description'}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleOpenDialog(story)}>
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(story.id)} className="text-red-600">
                  <Trash2 className="w-3 h-3 mr-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {stories.length === 0 && (
        <Card className="py-12">
          <div className="text-center">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No social stories created yet</p>
          </div>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStory ? 'Edit Story' : 'Create Social Story / Visual Script'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Client</Label>
                <Select value={formData.client_id} onValueChange={handleClientChange}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Story Type</Label>
                <Select value={formData.story_type} onValueChange={(v) => setFormData({ ...formData, story_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="social_story">Social Story™</SelectItem>
                    <SelectItem value="visual_script">Visual Script</SelectItem>
                    <SelectItem value="comic_strip">Comic Strip Conversation</SelectItem>
                    <SelectItem value="first_then">First-Then Board</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Title</Label>
              <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Going to the Doctor" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Target Skill</Label>
                <Input value={formData.target_skill} onChange={(e) => setFormData({ ...formData, target_skill: e.target.value })} placeholder="e.g., Waiting patiently" />
              </div>
              <div>
                <Label>Reading Level</Label>
                <Select value={formData.reading_level} onValueChange={(v) => setFormData({ ...formData, reading_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="complex">Complex</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Describe the Scenario *</Label>
              <Textarea
                value={formData.scenario_description}
                onChange={(e) => setFormData({ ...formData, scenario_description: e.target.value })}
                placeholder="Describe the situation, context, and what you want the person to learn or understand. Be specific about any challenges or triggers..."
                rows={4}
              />
            </div>

            <Button onClick={handleGenerate} disabled={!formData.scenario_description || isGenerating} className="w-full bg-purple-600 hover:bg-purple-700">
              {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {isGenerating ? 'Generating...' : 'Generate with AI'}
            </Button>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Generated Content</Label>
                {formData.story_content && (
                  <Button variant="ghost" size="sm" onClick={handleCopy}>
                    {copied ? <Check className="w-4 h-4 mr-1 text-green-600" /> : <Copy className="w-4 h-4 mr-1" />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                )}
              </div>
              <Textarea
                value={formData.story_content}
                onChange={(e) => setFormData({ ...formData, story_content: e.target.value })}
                placeholder="Generated story will appear here..."
                rows={10}
                className="font-mono text-sm"
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.title} className="bg-teal-600 hover:bg-teal-700">
              {editingStory ? 'Update' : 'Save'} Story
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}