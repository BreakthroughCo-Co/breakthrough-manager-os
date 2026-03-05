import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';

export default function AcknowledgementDialog({ doc, user, open, onConfirm, onCancel }) {
    const [saving, setSaving] = React.useState(false);

    const handleConfirm = async () => {
        setSaving(true);
        await base44.entities.ResourceAcknowledgement.create({
            resource_id: doc.id,
            resource_title: doc.title,
            resource_version: doc.version,
            user_email: user?.email || 'unknown',
            user_name: user?.full_name || '',
            acknowledged_at: new Date().toISOString()
        });
        setSaving(false);
        onConfirm();
    };

    if (!doc) return null;

    return (
        <Dialog open={open} onOpenChange={onCancel}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-teal-600" />
                        Mandatory Document Acknowledgement
                    </DialogTitle>
                </DialogHeader>
                <div className="py-3 space-y-3">
                    <p className="text-sm text-slate-700">
                        Before downloading this mandatory compliance document, you must confirm that you have read and understood its contents.
                    </p>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1 text-sm">
                        <p><span className="font-semibold">Document:</span> {doc.title}</p>
                        <p><span className="font-semibold">Version:</span> v{doc.version}</p>
                        <p><span className="font-semibold">Category:</span> {doc.category}</p>
                        <p><span className="font-semibold">Date:</span> {format(new Date(), 'dd MMM yyyy')}</p>
                    </div>
                    <p className="text-xs text-slate-500 border-t pt-3">
                        By clicking "I Acknowledge", you confirm that you have read and understood this document. This acknowledgement will be recorded for NDIS audit purposes.
                    </p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onCancel}>Cancel</Button>
                    <Button
                        className="bg-teal-600 hover:bg-teal-700"
                        onClick={handleConfirm}
                        disabled={saving}
                    >
                        {saving ? 'Recording...' : 'I Acknowledge — Download'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}