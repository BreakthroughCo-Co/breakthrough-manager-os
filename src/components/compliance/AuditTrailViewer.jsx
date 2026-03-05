import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Search } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const severityColors = {
    critical: 'bg-red-100 text-red-800',
    warning: 'bg-amber-100 text-amber-800',
    info: 'bg-blue-100 text-blue-800'
};

export default function AuditTrailViewer() {
    const [filterType, setFilterType] = useState('all');
    const [filterSeverity, setFilterSeverity] = useState('all');
    const [filterSource, setFilterSource] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 50;

    const { data: records = [], isLoading } = useQuery({
        queryKey: ['complianceAuditTrail'],
        queryFn: () => base44.entities.ComplianceAuditTrail.list('-timestamp', 500)
    });

    const filtered = useMemo(() => {
        return records.filter(r => {
            if (filterType !== 'all' && r.event_type !== filterType) return false;
            if (filterSeverity !== 'all' && r.severity !== filterSeverity) return false;
            if (filterSource && !r.trigger_source?.toLowerCase().includes(filterSource.toLowerCase())) return false;
            if (search) {
                const q = search.toLowerCase();
                return r.event_description?.toLowerCase().includes(q) ||
                    r.triggered_by_user?.toLowerCase().includes(q) ||
                    r.related_entity_type?.toLowerCase().includes(q);
            }
            return true;
        });
    }, [records, filterType, filterSeverity, filterSource, search]);

    const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

    const exportCSV = () => {
        const header = 'Timestamp,Event Type,Severity,Description,Trigger Source,Triggered By,Entity Type,Entity ID\n';
        const rows = filtered.map(r =>
            `"${r.timestamp || ''}","${r.event_type || ''}","${r.severity || ''}","${(r.event_description || '').replace(/"/g, '""')}","${r.trigger_source || ''}","${r.triggered_by_user || ''}","${r.related_entity_type || ''}","${r.related_entity_id || ''}"`
        ).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `audit-trail-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    const eventTypes = [...new Set(records.map(r => r.event_type).filter(Boolean))];

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-52">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input placeholder="Search description, user, entity..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
                </div>
                <Select value={filterType} onValueChange={v => { setFilterType(v); setPage(0); }}>
                    <SelectTrigger className="w-52"><SelectValue placeholder="Event Type" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Event Types</SelectItem>
                        {eventTypes.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={filterSeverity} onValueChange={v => { setFilterSeverity(v); setPage(0); }}>
                    <SelectTrigger className="w-36"><SelectValue placeholder="Severity" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Severities</SelectItem>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
                    <Download className="h-4 w-4" />Export CSV
                </Button>
            </div>

            {/* Stats strip */}
            <div className="flex gap-4 text-xs text-slate-500">
                <span>{filtered.length} records</span>
                <span className="text-red-600 font-medium">{filtered.filter(r => r.severity === 'critical').length} critical</span>
                <span className="text-amber-600 font-medium">{filtered.filter(r => r.severity === 'warning').length} warnings</span>
            </div>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b">
                                <tr>
                                    {['Timestamp', 'Severity', 'Event Type', 'Description', 'Source', 'Triggered By', 'Entity'].map(h => (
                                        <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-3 py-2.5">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {isLoading ? (
                                    <tr><td colSpan={7} className="text-center py-8 text-slate-400">Loading...</td></tr>
                                ) : paginated.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center py-8 text-slate-400">No audit records match your filters.</td></tr>
                                ) : paginated.map(r => (
                                    <tr key={r.id} className={cn(
                                        'hover:bg-slate-50 dark:hover:bg-slate-700/30',
                                        r.severity === 'critical' && 'bg-red-50/50 dark:bg-red-900/10'
                                    )}>
                                        <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">
                                            {r.timestamp ? format(new Date(r.timestamp), 'dd MMM yy HH:mm') : '—'}
                                        </td>
                                        <td className="px-3 py-2">
                                            <Badge className={cn('text-xs', severityColors[r.severity] || severityColors.info)}>
                                                {r.severity || 'info'}
                                            </Badge>
                                        </td>
                                        <td className="px-3 py-2 text-xs font-mono text-slate-600 whitespace-nowrap">
                                            {r.event_type?.replace(/_/g, ' ')}
                                        </td>
                                        <td className="px-3 py-2 text-xs max-w-xs">
                                            <p className="truncate">{r.event_description}</p>
                                            {r.ai_insight && <p className="text-slate-400 truncate italic">{r.ai_insight}</p>}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">{r.trigger_source || '—'}</td>
                                        <td className="px-3 py-2 text-xs text-slate-500">{r.triggered_by_user || '—'}</td>
                                        <td className="px-3 py-2 text-xs text-slate-400">
                                            {r.related_entity_type && <span>{r.related_entity_type}</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Page {page + 1} of {totalPages} ({filtered.length} total)</span>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>Previous</Button>
                        <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>Next</Button>
                    </div>
                </div>
            )}
        </div>
    );
}