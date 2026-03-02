import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { History } from 'lucide-react';

export default function VersionHistoryDialog({ open, onClose, doc }) {
  const { data: allDocs = [] } = useQuery({
    queryKey: ['resourceDocs'],
    queryFn: () => base44.entities.ResourceDocument.list('-created_date'),
    enabled: open && !!doc
  });

  // Build version chain: find all docs with the same title lineage
  const versionChain = allDocs
    .filter(d => d.title === doc?.title || d.previous_version_id === doc?.id || d.id === doc?.previous_version_id)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-4 h-4" />Version History — {doc?.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2 max-h-96 overflow-y-auto">
          {versionChain.length === 0 && (
            <p className="text-sm text-slate-500">No version history available.</p>
          )}
          {versionChain.map((v, idx) => (
            <div key={v.id} className="flex items-start gap-3 p-3 rounded-lg border">
              <div className="flex-shrink-0 mt-0.5">
                <div className={`w-2 h-2 rounded-full mt-1.5 ${v.status === 'current' ? 'bg-teal-500' : 'bg-slate-300'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">v{v.version}</span>
                  {v.status === 'current' && <Badge className="bg-teal-100 text-teal-700 text-xs">Current</Badge>}
                  {v.status === 'superseded' && <Badge className="bg-slate-100 text-slate-600 text-xs">Superseded</Badge>}
                  {v.status === 'archived' && <Badge className="bg-red-100 text-red-700 text-xs">Archived</Badge>}
                </div>
                {v.version_notes && <p className="text-xs text-slate-600 mt-0.5">{v.version_notes}</p>}
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span>{format(new Date(v.created_date), 'dd MMM yyyy')}</span>
                  <span>{v.uploaded_by}</span>
                  <span>{v.download_count || 0} downloads</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}