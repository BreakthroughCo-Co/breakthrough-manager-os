import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Download, MoreVertical, History, Archive, RefreshCw, FileText, FileSpreadsheet, Video, File, HardDrive, AlertCircle, Clock } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

const fileTypeConfig = {
  pdf:   { label: 'PDF',  color: 'bg-red-100 text-red-700',    icon: FileText },
  docx:  { label: 'DOCX', color: 'bg-blue-100 text-blue-700',  icon: FileText },
  xlsx:  { label: 'XLSX', color: 'bg-emerald-100 text-emerald-700', icon: FileSpreadsheet },
  pptx:  { label: 'PPTX', color: 'bg-orange-100 text-orange-700', icon: FileText },
  csv:   { label: 'CSV',  color: 'bg-slate-100 text-slate-700', icon: FileSpreadsheet },
  video: { label: 'VIDEO',color: 'bg-purple-100 text-purple-700', icon: Video },
  other: { label: 'FILE', color: 'bg-slate-100 text-slate-700', icon: File }
};

export default function ResourceCard({ doc, isAdmin, onDownload, onNewVersion, onArchive, onViewHistory }) {
  const ft = fileTypeConfig[doc.file_type] || fileTypeConfig.other;
  const Icon = ft.icon;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <div className={cn('flex-shrink-0 w-8 h-8 rounded flex items-center justify-center', ft.color)}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm leading-snug">{doc.title}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn('text-xs font-semibold px-1.5 py-0.5 rounded', ft.color)}>{ft.label}</span>
                <span className="text-xs text-slate-500">v{doc.version}</span>
                {doc.is_mandatory && <Badge className="bg-red-100 text-red-700 text-xs py-0">Mandatory</Badge>}
              </div>
            </div>
          </div>
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onNewVersion(doc)}>
                  <RefreshCw className="w-4 h-4 mr-2" />Upload New Version
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewHistory(doc)}>
                  <History className="w-4 h-4 mr-2" />Version History
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onArchive(doc)} className="text-red-600">
                  <Archive className="w-4 h-4 mr-2" />Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {doc.description && <p className="text-xs text-slate-600 line-clamp-2">{doc.description}</p>}
        {doc.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {doc.tags.slice(0, 4).map(t => (
              <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
            ))}
            {doc.tags.length > 4 && <Badge variant="secondary" className="text-xs">+{doc.tags.length - 4}</Badge>}
          </div>
        )}
        {/* Review due chip */}
        {doc.review_due_date && (() => {
          const days = differenceInDays(new Date(doc.review_due_date), new Date());
          const chip = days < 0
            ? { label: `Review overdue ${Math.abs(days)}d`, cls: 'bg-red-100 text-red-700', icon: AlertCircle }
            : days <= 30
            ? { label: `Review in ${days}d`, cls: 'bg-amber-100 text-amber-700', icon: Clock }
            : null;
          if (!chip) return null;
          const ChipIcon = chip.icon;
          return (
            <div className={cn('flex items-center gap-1 text-xs px-2 py-0.5 rounded-full w-fit', chip.cls)}>
              <ChipIcon className="w-3 h-3" />{chip.label}
            </div>
          );
        })()}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{doc.download_count || 0} dl{doc.download_count !== 1 ? 's' : ''}</span>
            {doc.created_date && <span>· {format(new Date(doc.created_date), 'dd MMM yy')}</span>}
            {doc.drive_file_id && <HardDrive className="w-3 h-3 text-blue-500" title="Synced to Google Drive" />}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1 text-xs h-7"
            onClick={() => onDownload(doc)}
            disabled={!doc.file_url}
          >
            <Download className="h-3 w-3" />Download
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}