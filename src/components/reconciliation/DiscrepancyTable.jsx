import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronRight, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const severityConfig = {
    critical: { label: 'Critical', cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
    high:     { label: 'High',     cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
    medium:   { label: 'Medium',   cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
    low:      { label: 'Low',      cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' }
};

const statusConfig = {
    new:           { label: 'New',          cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    investigating: { label: 'Investigating', cls: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
    resolved:      { label: 'Resolved',     cls: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
    dismissed:     { label: 'Dismissed',    cls: 'bg-slate-100 text-slate-500' }
};

const typeLabels = {
    amount_mismatch:   'Amount Mismatch',
    hour_mismatch:     'Hour Mismatch',
    unclaimed_internal:'Unclaimed Internal',
    unmatched_claim:   'Unmatched Claim',
    line_item_mismatch:'Line Item Mismatch',
    date_mismatch:     'Date Mismatch',
    other:             'Other'
};

function DiscrepancyRow({ item, onStatusChange }) {
    const [expanded, setExpanded] = useState(false);
    const [updating, setUpdating] = useState(false);

    const handleStatusChange = async (newStatus) => {
        setUpdating(true);
        await base44.entities.FinancialDiscrepancy.update(item.id, {
            status: newStatus,
            resolved_date: (newStatus === 'resolved' || newStatus === 'dismissed') ? new Date().toISOString() : null
        });
        onStatusChange();
        setUpdating(false);
    };

    const sev = severityConfig[item.severity] || severityConfig.medium;
    const sta = statusConfig[item.status] || statusConfig.new;

    return (
        <>
            <TableRow
                className={cn("cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50", item.status === 'resolved' && 'opacity-50')}
                onClick={() => setExpanded(!expanded)}
            >
                <TableCell>
                    {expanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                </TableCell>
                <TableCell className="font-medium text-sm">{item.client_name || item.client_id}</TableCell>
                <TableCell className="text-sm">{item.service_date}</TableCell>
                <TableCell className="text-xs font-mono">{item.ndis_line_item}</TableCell>
                <TableCell><span className="text-xs px-2 py-1 rounded font-medium">{typeLabels[item.discrepancy_type] || item.discrepancy_type}</span></TableCell>
                <TableCell><Badge className={sev.cls}>{sev.label}</Badge></TableCell>
                <TableCell className={cn("font-mono text-sm font-semibold", item.variance_amount < 0 ? 'text-red-600' : 'text-green-600')}>
                    {item.variance_amount !== undefined ? `${item.variance_amount >= 0 ? '+' : ''}$${item.variance_amount.toFixed(2)}` : '—'}
                </TableCell>
                <TableCell onClick={e => e.stopPropagation()}>
                    <Select value={item.status} onValueChange={handleStatusChange} disabled={updating}>
                        <SelectTrigger className="h-7 text-xs w-36">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="investigating">Investigating</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="dismissed">Dismissed</SelectItem>
                        </SelectContent>
                    </Select>
                </TableCell>
            </TableRow>
            {expanded && (
                <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                    <TableCell colSpan={8} className="py-4 px-6">
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Description</p>
                                <p className="text-sm text-slate-700 dark:text-slate-300">{item.description}</p>
                            </div>
                            {item.ai_analysis && (
                                <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700 rounded-lg p-3">
                                    <p className="text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                                        <Info className="h-3 w-3" /> AI Analysis
                                    </p>
                                    <pre className="text-xs text-teal-800 dark:text-teal-300 whitespace-pre-wrap font-sans">{item.ai_analysis}</pre>
                                </div>
                            )}
                            <div className="grid grid-cols-3 gap-4 text-xs">
                                <div>
                                    <span className="text-slate-500">Internal Amount</span>
                                    <p className="font-mono font-semibold">${(item.internal_amount || 0).toFixed(2)}</p>
                                </div>
                                <div>
                                    <span className="text-slate-500">Claimed Amount</span>
                                    <p className="font-mono font-semibold">${(item.claimed_amount || 0).toFixed(2)}</p>
                                </div>
                                <div>
                                    <span className="text-slate-500">Run ID</span>
                                    <p className="font-mono">{item.reconciliation_run_id || '—'}</p>
                                </div>
                            </div>
                        </div>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
}

export default function DiscrepancyTable({ discrepancies, onRefresh }) {
    const [filterSeverity, setFilterSeverity] = useState('all');
    const [filterStatus, setFilterStatus] = useState('new');
    const [filterType, setFilterType] = useState('all');

    const filtered = discrepancies.filter(d => {
        if (filterSeverity !== 'all' && d.severity !== filterSeverity) return false;
        if (filterStatus !== 'all' && d.status !== filterStatus) return false;
        if (filterType !== 'all' && d.discrepancy_type !== filterType) return false;
        return true;
    });

    return (
        <div className="space-y-3">
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="investigating">Investigating</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="dismissed">Dismissed</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                    <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="Severity" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Severities</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="h-8 text-xs w-44"><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                </Select>
                <span className="text-xs text-slate-400 self-center ml-auto">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                            <TableHead className="w-8" />
                            <TableHead>Client</TableHead>
                            <TableHead>Service Date</TableHead>
                            <TableHead>Line Item</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Severity</TableHead>
                            <TableHead>Variance</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-slate-400 text-sm">
                                    No discrepancies match the current filters.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map(item => (
                                <DiscrepancyRow key={item.id} item={item} onStatusChange={onRefresh} />
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}