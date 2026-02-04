import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Plus, Flag, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function KnowledgeBaseManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: articles = [] } = useQuery({
    queryKey: ['knowledgeBase'],
    queryFn: () => base44.entities.KnowledgeBaseArticle.list(),
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.KnowledgeBaseArticle.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['knowledgeBase']);
      setIsAddDialogOpen(false);
    }
  });

  const flagMutation = useMutation({
    mutationFn: ({ id, reason }) => 
      base44.entities.KnowledgeBaseArticle.update(id, {
        flagged_outdated: true,
        flagged_reason: reason
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['knowledgeBase']);
    }
  });

  const filteredArticles = articles
    .filter(a => selectedCategory === 'all' || a.category === selectedCategory)
    .filter(a => 
      a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.content?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-teal-600" />
            Knowledge Base
          </CardTitle>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Article
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Knowledge Base Article</DialogTitle>
              </DialogHeader>
              <KnowledgeArticleForm onSubmit={(data) => createMutation.mutate(data)} />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search knowledge base..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="NDIS Policy">NDIS Policy</SelectItem>
              <SelectItem value="Practice Standards">Practice Standards</SelectItem>
              <SelectItem value="App Functionality">App Functionality</SelectItem>
              <SelectItem value="Best Practices">Best Practices</SelectItem>
              <SelectItem value="Compliance">Compliance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredArticles.map((article) => (
            <div key={article.id} className="p-3 border rounded">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-sm">{article.title}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {article.category}
                  </Badge>
                </div>
                {!article.flagged_outdated && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const reason = prompt('Why is this article outdated?');
                      if (reason) {
                        flagMutation.mutate({ id: article.id, reason });
                      }
                    }}
                  >
                    <Flag className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-slate-600 line-clamp-2">
                {article.content?.substring(0, 150)}...
              </p>
              {article.flagged_outdated && (
                <div className="mt-2 p-2 bg-amber-50 rounded text-xs">
                  <Flag className="h-3 w-3 inline text-amber-600 mr-1" />
                  Flagged as outdated: {article.flagged_reason}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function KnowledgeArticleForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    title: '',
    category: 'NDIS Policy',
    content: '',
    source: '',
    tags: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      last_updated: new Date().toISOString()
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        placeholder="Article Title"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        required
      />
      <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="NDIS Policy">NDIS Policy</SelectItem>
          <SelectItem value="Practice Standards">Practice Standards</SelectItem>
          <SelectItem value="App Functionality">App Functionality</SelectItem>
          <SelectItem value="Best Practices">Best Practices</SelectItem>
          <SelectItem value="Compliance">Compliance</SelectItem>
          <SelectItem value="Operational Procedures">Operational Procedures</SelectItem>
        </SelectContent>
      </Select>
      <Textarea
        placeholder="Article Content (supports markdown)"
        value={formData.content}
        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
        className="min-h-48"
        required
      />
      <Input
        placeholder="Source (e.g., NDIS Commission, Internal Policy)"
        value={formData.source}
        onChange={(e) => setFormData({ ...formData, source: e.target.value })}
      />
      <Input
        placeholder="Tags (comma-separated)"
        value={formData.tags}
        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
      />
      <Button type="submit" className="w-full">Create Article</Button>
    </form>
  );
}