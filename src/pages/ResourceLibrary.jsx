import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search, Plus, BarChart2, Download, FileText, Book, ShieldCheck, GraduationCap, Wrench, FileCheck
} from 'lucide-react';
import ResourceCard from '@/components/resources/ResourceCard';
import UploadDocumentDialog from '@/components/resources/UploadDocumentDialog';
import VersionHistoryDialog from '@/components/resources/VersionHistoryDialog';
import AcknowledgementDialog from '@/components/resources/AcknowledgementDialog';

const CATEGORIES = [
  { id: 'all',              label: 'All',               icon: Book },
  { id: 'NDIS Regulations', label: 'NDIS Regulations',  icon: ShieldCheck },
  { id: 'Templates',        label: 'Templates',         icon: FileText },
  { id: 'Policies',         label: 'Policies',          icon: FileCheck },
  { id: 'Training Materials',label: 'Training',         icon: GraduationCap },
  { id: 'Tools & Checklists',label: 'Tools',            icon: Wrench },
  { id: 'Forms',            label: 'Forms',             icon: FileText },
  { id: 'Other',            label: 'Other',             icon: FileText },
];

export default function ResourceLibrary() {
  const [searchQuery, setSearchQuery]       = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [uploadOpen, setUploadOpen]         = useState(false);
  const [newVersionDoc, setNewVersionDoc]   = useState(null);
  const [historyDoc, setHistoryDoc]         = useState(null);
  const [activeTab, setActiveTab]           = useState('library');
  const [ackDoc, setAckDoc]                 = useState(null);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me()
  });

  const isAdmin = user?.role === 'admin';

  const { data: docs = [] } = useQuery({
    queryKey: ['resourceDocs'],
    queryFn: () => base44.entities.ResourceDocument.list('-created_date', 200)
  });

  const { data: downloadLogs = [] } = useQuery({
    queryKey: ['resourceDownloadLogs'],
    queryFn: () => base44.entities.ResourceDownloadLog.list('-download_date', 200),
    enabled: isAdmin
  });

  const currentDocs = docs.filter(d => d.status === 'current');

  const filteredDocs = useMemo(() => {
    return currentDocs.filter(doc => {
      const matchCategory = activeCategory === 'all' || doc.category === activeCategory;
      const matchFileType = fileTypeFilter === 'all' || doc.file_type === fileTypeFilter;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        doc.title?.toLowerCase().includes(q) ||
        doc.description?.toLowerCase().includes(q) ||
        doc.tags?.some(t => t.toLowerCase().includes(q));
      return matchCategory && matchFileType && matchSearch;
    });
  }, [currentDocs, activeCategory, fileTypeFilter, searchQuery]);

  const handleDownload = async (doc) => {
    if (!doc.file_url) return;
    window.open(doc.file_url, '_blank');
    // Log download
    await base44.entities.ResourceDownloadLog.create({
      resource_id: doc.id,
      resource_title: doc.title,
      resource_category: doc.category,
      version_downloaded: doc.version,
      downloaded_by: user?.email || 'unknown',
      download_date: new Date().toISOString()
    });
    // Increment count
    await base44.entities.ResourceDocument.update(doc.id, {
      download_count: (doc.download_count || 0) + 1
    });
    queryClient.invalidateQueries({ queryKey: ['resourceDocs'] });
    queryClient.invalidateQueries({ queryKey: ['resourceDownloadLogs'] });
  };

  const handleArchive = async (doc) => {
    await base44.entities.ResourceDocument.update(doc.id, { status: 'archived' });
    queryClient.invalidateQueries({ queryKey: ['resourceDocs'] });
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['resourceDocs'] });
  };

  // Analytics
  const topDownloads = [...currentDocs].sort((a, b) => (b.download_count || 0) - (a.download_count || 0)).slice(0, 5);
  const categoryBreakdown = CATEGORIES.filter(c => c.id !== 'all').map(c => ({
    ...c,
    count: currentDocs.filter(d => d.category === c.id).length
  })).filter(c => c.count > 0);
  const recentActivity = downloadLogs.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Resource Library</h1>
          <p className="text-slate-500 mt-1">NDIS regulations, templates, policies, training materials, and compliance tools</p>
        </div>
        {isAdmin && (
          <Button className="bg-teal-600 hover:bg-teal-700 gap-2" onClick={() => setUploadOpen(true)}>
            <Plus className="h-4 w-4" />Upload Document
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="library">Library ({currentDocs.length})</TabsTrigger>
          {isAdmin && <TabsTrigger value="analytics">Activity & Analytics</TabsTrigger>}
        </TabsList>

        {/* ── LIBRARY TAB ── */}
        <TabsContent value="library" className="space-y-5 mt-4">
          {/* Filters row */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-60">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by title, description, or tag..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="File Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {['pdf','docx','xlsx','pptx','csv','video','other'].map(t => (
                  <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category tabs */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => {
              const count = cat.id === 'all' ? currentDocs.length : currentDocs.filter(d => d.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                    activeCategory === cat.id
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                  }`}
                >
                  {cat.label} <span className="ml-1 opacity-75">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Grid */}
          {filteredDocs.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <FileText className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No documents match your filters.</p>
              {isAdmin && (
                <Button className="mt-4 bg-teal-600 hover:bg-teal-700" onClick={() => setUploadOpen(true)}>
                  Upload First Document
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredDocs.map(doc => (
                <ResourceCard
                  key={doc.id}
                  doc={doc}
                  isAdmin={isAdmin}
                  onDownload={handleDownload}
                  onNewVersion={d => setNewVersionDoc(d)}
                  onArchive={handleArchive}
                  onViewHistory={d => setHistoryDoc(d)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── ANALYTICS TAB ── */}
        {isAdmin && (
          <TabsContent value="analytics" className="space-y-6 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-600">Total Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-teal-600">{currentDocs.length}</p>
                  <p className="text-xs text-slate-500">{docs.filter(d => d.status === 'superseded').length} superseded versions</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-600">Total Downloads</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-teal-600">{currentDocs.reduce((s, d) => s + (d.download_count || 0), 0)}</p>
                  <p className="text-xs text-slate-500">Across all documents</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-600">Mandatory Docs</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-teal-600">{currentDocs.filter(d => d.is_mandatory).length}</p>
                  <p className="text-xs text-slate-500">Compliance-critical</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Downloads */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Download className="w-4 h-4" />Most Downloaded
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {topDownloads.map((d, i) => (
                    <div key={d.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-slate-400 w-4">{i + 1}.</span>
                        <span className="truncate">{d.title}</span>
                      </div>
                      <Badge variant="secondary">{d.download_count || 0}</Badge>
                    </div>
                  ))}
                  {topDownloads.length === 0 && <p className="text-xs text-slate-400">No downloads yet.</p>}
                </CardContent>
              </Card>

              {/* Category Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart2 className="w-4 h-4" />Library Composition
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {categoryBreakdown.map(c => (
                    <div key={c.id} className="flex items-center gap-3">
                      <span className="text-xs text-slate-600 w-36 flex-shrink-0">{c.label}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-2">
                        <div
                          className="bg-teal-500 h-2 rounded-full"
                          style={{ width: `${(c.count / currentDocs.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 w-5 text-right">{c.count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Recent Download Activity */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-sm">Recent Download Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentActivity.length === 0 ? (
                    <p className="text-xs text-slate-400">No activity recorded yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {recentActivity.map(log => (
                        <div key={log.id} className="flex items-center gap-3 text-xs py-1 border-b border-slate-50 last:border-0">
                          <span className="text-slate-400 w-36 flex-shrink-0">
                            {log.download_date ? new Date(log.download_date).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                          </span>
                          <span className="font-medium flex-1 truncate">{log.resource_title}</span>
                          <Badge variant="secondary" className="text-xs">{log.resource_category}</Badge>
                          <span className="text-slate-500 flex-shrink-0">{log.downloaded_by}</span>
                          <span className="text-slate-400 flex-shrink-0">v{log.version_downloaded}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Dialogs */}
      <UploadDocumentDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={handleSuccess}
      />
      <UploadDocumentDialog
        open={!!newVersionDoc}
        onClose={() => setNewVersionDoc(null)}
        onSuccess={handleSuccess}
        editingDoc={newVersionDoc}
      />
      <VersionHistoryDialog
        open={!!historyDoc}
        onClose={() => setHistoryDoc(null)}
        doc={historyDoc}
      />
    </div>
  );
}