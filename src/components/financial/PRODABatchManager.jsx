import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Send, RefreshCw, Loader2, CheckCircle, XCircle, Clock, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig = {
  draft:               { label: 'Draft',             color: 'bg-slate-100 text-slate-700', icon: Clock },
  generated:           { label: 'Ready for Review',  color: 'bg-amber-100 text-amber-700', icon: Clock },
  submitted_to_proda:  { label: 'Submitted to PRODA',color: 'bg-blue-100 text-blue-700',   icon: Send },
  partially_paid:      { label: 'Partially Paid',    color: 'bg-orange-100 text-orange-700',icon: CheckCircle },
  paid:                { label: 'Paid',              color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  rejected:            { label: 'Rejected',          color: 'bg-red-100 text-red-700',     icon: XCircle },
};

const validTransitions = {
  generated:          ['submitted_to_proda'],
  submitted_to_proda: ['partially_paid', 'paid', 'rejected'],
  partially_paid:     ['paid'],
  rejected:           ['generated'],
};

export default function PRODABatchManager() {
  const [batchRange, setBatchRange] = useState({ period_start: '', period_end: '' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState(null);
  const [statusDialog, setStatusDialog] = useState(null); // { batch }
  const [statusForm, setStatusForm] = useState({ new_status: '', notes: '', rejection_summary: '' });
  const [isUpdating, setIsUpdating] = useState(false);

  const queryClient = useQueryClient();

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['prodaBatches'],
    queryFn: () => base44.entities.PRODABulkUpload.list('-created_date', 50)
  });

  const handleGenerate = async () => {
    if (!batchRange.period_start || !batchRange.period_end) return;
    setIsGenerating(true);
    setGenerateResult(null);
    const res = await base44.functions.invoke('batchValidatedPRODAClaims', batchRange);
    setGenerateResult(res.data);
    setIsGenerating(false);
    queryClient.invalidateQueries({ queryKey: ['prodaBatches'] });
  };

  const handleStatusUpdate = async () => {
    if (!statusForm.new_status) return;
    setIsUpdating(true);
    await base44.functions.invoke('updatePRODABatchStatus', {
      batch_id: statusDialog.batch.id,
      ...statusForm
    });
    setIsUpdating(false);
    setStatusDialog(null);
    setStatusForm({ new_status: '', notes: '', rejection_summary: '' });
    queryClient.invalidateQueries({ queryKey: ['prodaBatches'] });
  };

  const openStatusDialog = (batch) => {
    const allowed = validTransitions[batch.status] || [];
    if (allowed.length === 0) return;
    setStatusDialog({ batch, allowed });
    setStatusForm({ new_status: allowed[0], notes: '', rejection_summary: '' });
  };

  return (
    <div className="space-y-6">
      {/* Manual batch trigger */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Send className="w-4 h-4 text-teal-600" />
            Trigger PRODA Claim Batch
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <Label className="text-xs">Period Start</Label>
              <Input
                type="date"
                className="w-40"
                value={batchRange.period_start}
                onChange={e => setBatchRange({ ...batchRange, period_start: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Period End</Label>
              <Input
                type="date"
                className="w-40"
                value={batchRange.period_end}
                onChange={e => setBatchRange({ ...batchRange, period_end: e.target.value })}
              />
            </div>
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              disabled={isGenerating || !batchRange.period_start || !batchRange.period_end}
              onClick={handleGenerate}
            >
              {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              {isGenerating ? 'Generating...' : 'Generate Batch'}
            </Button>
          </div>
          {generateResult && (
            <div className={cn('mt-4 p-3 rounded-lg text-sm', generateResult.batch_id ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800')}>
              {generateResult.batch_id
                ? `✓ Batch generated: ${generateResult.claims_processed} claims · $${parseFloat(generateResult.total_amount).toLocaleString('en-AU', { minimumFractionDigits: 2 })} · Task assigned to manager.`
                : generateResult.message}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">PRODA Submission History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-teal-600" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Claims</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map(batch => {
                  const cfg = statusConfig[batch.status] || statusConfig.draft;
                  const Icon = cfg.icon;
                  const allowed = validTransitions[batch.status] || [];
                  return (
                    <TableRow key={batch.id}>
                      <TableCell className="text-xs">
                        {batch.period_start} → {batch.period_end}
                      </TableCell>
                      <TableCell className="font-medium">{batch.total_claims}</TableCell>
                      <TableCell>${(batch.total_amount || 0).toLocaleString('en-AU', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>
                        <Badge className={cn('gap-1', cfg.color)}>
                          <Icon className="w-3 h-3" />{cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {batch.created_date ? format(new Date(batch.created_date), 'dd MMM yy') : '—'}
                      </TableCell>
                      <TableCell className="text-xs">{batch.submitted_by || '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {allowed.length > 0 && (
                            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => openStatusDialog(batch)}>
                              Update Status
                            </Button>
                          )}
                          {batch.file_url && (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Download CSV">
                              <Download className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {!isLoading && batches.length === 0 && (
            <div className="py-10 text-center text-slate-400 text-sm">No PRODA batches generated yet.</div>
          )}
        </CardContent>
      </Card>

      {/* Status update dialog */}
      <Dialog open={!!statusDialog} onOpenChange={() => setStatusDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Batch Status</DialogTitle>
          </DialogHeader>
          {statusDialog && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-slate-50 rounded text-xs text-slate-600">
                Batch: {statusDialog.batch.period_start} → {statusDialog.batch.period_end} ·{' '}
                {statusDialog.batch.total_claims} claims · ${(statusDialog.batch.total_amount || 0).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
              </div>
              <div>
                <Label>New Status *</Label>
                <Select value={statusForm.new_status} onValueChange={v => setStatusForm({ ...statusForm, new_status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusDialog.allowed.map(s => (
                      <SelectItem key={s} value={s}>{statusConfig[s]?.label || s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={statusForm.notes}
                  onChange={e => setStatusForm({ ...statusForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Optional — approval notes, reference numbers, etc."
                />
              </div>
              {statusForm.new_status === 'rejected' && (
                <div>
                  <Label>Rejection Summary *</Label>
                  <Textarea
                    value={statusForm.rejection_summary}
                    onChange={e => setStatusForm({ ...statusForm, rejection_summary: e.target.value })}
                    rows={3}
                    placeholder="Detail which claims were rejected and reasons"
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog(null)}>Cancel</Button>
            <Button
              className={statusForm.new_status === 'rejected' ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-600 hover:bg-teal-700'}
              onClick={handleStatusUpdate}
              disabled={isUpdating || !statusForm.new_status}
            >
              {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Confirm Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}