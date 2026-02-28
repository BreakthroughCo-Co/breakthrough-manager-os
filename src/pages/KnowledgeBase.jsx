import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeContext';
import { format, parseISO } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { Search, BookOpen, Tag, AlertCircle, ChevronRight, Clock, Flag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CATEGORY_COLORS = {
  'NDIS Policy':         'bg-blue-100 text-blue-700',
  'Practice Standards':  'bg-teal-100 text-teal-700',
  'App Functionality':   'bg-purple-100 text-purple-700',
  'Best Practices':      'bg-emerald-100 text-emerald-700',
  'Compliance':          'bg-red-100 text-red-700',
  'Operational Procedures': 'bg-amber-100 text-amber-700',
};

export default function KnowledgeBase() {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showOutdated, setShowOutdated] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['knowledgeBase'],
    queryFn: () => base44.entities.KnowledgeBaseArticle.list(),
  });

  const flagMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.KnowledgeBaseArticle.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['knowledgeBase'] }),
  });

  const allTags = useMemo(() => {
    const tags = new Set();
    articles.forEach(a => a.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [articles]);

  const filtered = useMemo(() => {
    return articles.filter(a => {
      const matchSearch = !search ||
        a.title?.toLowerCase().includes(search.toLowerCase()) ||
        a.content?.toLowerCase().includes(search.toLowerCase()) ||
        a.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()));
      const matchCategory = categoryFilter === 'all' || a.category === categoryFilter;
      const matchOutdated = showOutdated ? a.flagged_outdated : a.is_current !== false;
      const matchTag = !selectedTag || a.tags?.includes(selectedTag);
      return matchSearch && matchCategory && matchOutdated && matchTag;
    });
  }, [articles, search, categoryFilter, showOutdated, selectedTag]);

  return (
    <div className={cn("flex gap-6 h-[calc(100vh-140px)]", isDark ? "text-slate-50" : "text-slate-900")}>
      {/* Left: List */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-teal-500" /> Knowledge Base
          </h2>
          <p className={cn("text-xs mt-0.5", isDark ? "text-slate-400" : "text-slate-500")}>
            NDIS policy, practice standards, and operational guidance
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input placeholder="Search articles..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
        </div>

        {/* Category */}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.keys(CATEGORY_COLORS).map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Outdated toggle */}
        <div className="flex items-center gap-2">
          <input type="checkbox" id="outdated" checked={showOutdated} onChange={e => setShowOutdated(e.target.checked)} className="rounded" />
          <label htmlFor="outdated" className="text-xs text-slate-500">Show flagged outdated</label>
        </div>

        {/* Tags */}
        {allTags.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tags</p>
            <div className="flex flex-wrap gap-1">
              {allTags.map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedTag(selectedTag === t ? null : t)}
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full border transition-colors",
                    selectedTag === t
                      ? "bg-teal-600 text-white border-teal-600"
                      : isDark ? "bg-slate-700 border-slate-600 text-slate-300 hover:border-teal-500" : "bg-white border-slate-200 text-slate-600 hover:border-teal-500"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Article List */}
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {filtered.length === 0 && !isLoading && (
            <p className={cn("text-xs text-center py-8", isDark ? "text-slate-500" : "text-slate-400")}>No articles found</p>
          )}
          {filtered.map(article => (
            <button
              key={article.id}
              onClick={() => setSelectedArticle(article)}
              className={cn(
                "w-full text-left p-3 rounded-lg border transition-colors",
                selectedArticle?.id === article.id
                  ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                  : isDark
                    ? "border-slate-700 bg-slate-800 hover:bg-slate-700"
                    : "border-slate-200 bg-white hover:bg-slate-50"
              )}
            >
              <div className="flex items-start justify-between gap-1">
                <p className="text-sm font-medium leading-tight">{article.title}</p>
                {article.flagged_outdated && <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />}
              </div>
              <Badge className={cn("text-xs mt-1", CATEGORY_COLORS[article.category] || 'bg-slate-100 text-slate-600')}>
                {article.category}
              </Badge>
              {article.last_updated && (
                <p className={cn("text-xs mt-1 flex items-center gap-1", isDark ? "text-slate-500" : "text-slate-400")}>
                  <Clock className="w-2.5 h-2.5" />
                  {format(parseISO(article.last_updated), 'd MMM yyyy')}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Article Content */}
      <div className={cn(
        "flex-1 rounded-xl border overflow-y-auto p-6",
        isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
      )}>
        {selectedArticle ? (
          <div className="space-y-4 max-w-3xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold">{selectedArticle.title}</h1>
                <div className="flex items-center flex-wrap gap-2 mt-2">
                  <Badge className={cn("text-xs", CATEGORY_COLORS[selectedArticle.category] || 'bg-slate-100 text-slate-600')}>
                    {selectedArticle.category}
                  </Badge>
                  {selectedArticle.source && (
                    <span className={cn("text-xs", isDark ? "text-slate-400" : "text-slate-500")}>Source: {selectedArticle.source}</span>
                  )}
                  {selectedArticle.last_updated && (
                    <span className={cn("text-xs flex items-center gap-1", isDark ? "text-slate-400" : "text-slate-500")}>
                      <Clock className="w-3 h-3" />
                      Updated {format(parseISO(selectedArticle.last_updated), 'd MMM yyyy')}
                    </span>
                  )}
                  {selectedArticle.flagged_outdated && (
                    <Badge className="bg-amber-100 text-amber-700 text-xs">Flagged Outdated</Badge>
                  )}
                </div>
                {selectedArticle.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedArticle.tags.map(t => (
                      <span key={t} className={cn("text-xs px-1.5 py-0.5 rounded border", isDark ? "bg-slate-700 border-slate-600 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-600")}>
                        <Tag className="w-2.5 h-2.5 inline mr-0.5" />{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {!selectedArticle.flagged_outdated && (
                <Button
                  size="sm" variant="outline"
                  className="gap-1 text-xs h-7 flex-shrink-0"
                  onClick={() => flagMutation.mutate({ id: selectedArticle.id, data: { flagged_outdated: true } })}
                >
                  <Flag className="w-3 h-3" /> Flag Outdated
                </Button>
              )}
            </div>

            <div className={cn("h-px", isDark ? "bg-slate-700" : "bg-slate-200")} />

            <div className={cn(
              "prose prose-sm max-w-none",
              isDark ? "prose-invert" : ""
            )}>
              <ReactMarkdown>{selectedArticle.content}</ReactMarkdown>
            </div>

            {selectedArticle.flagged_reason && (
              <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-xs font-semibold text-amber-700">Flagged Reason</p>
                <p className="text-xs text-amber-600 mt-1">{selectedArticle.flagged_reason}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <BookOpen className="w-12 h-12 text-slate-300 mb-4" />
            <p className={cn("font-medium", isDark ? "text-slate-400" : "text-slate-500")}>Select an article to view</p>
            <p className={cn("text-sm mt-1", isDark ? "text-slate-500" : "text-slate-400")}>{filtered.length} articles available</p>
          </div>
        )}
      </div>
    </div>
  );
}