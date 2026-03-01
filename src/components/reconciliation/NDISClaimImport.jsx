import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function NDISClaimImport({ onImportComplete }) {
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImporting(true);
        setError(null);
        setResult(null);

        const { file_url } = await base44.integrations.Core.UploadFile({ file });

        const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url,
            json_schema: {
                type: "object",
                properties: {
                    rows: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                client_id: { type: "string" },
                                client_name: { type: "string" },
                                claim_number: { type: "string" },
                                service_date: { type: "string" },
                                ndis_line_item: { type: "string" },
                                line_item_description: { type: "string" },
                                claimed_hours: { type: "number" },
                                claimed_amount: { type: "number" },
                                status: { type: "string" },
                                rejection_reason: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        if (extracted.status !== 'success' || !extracted.output?.rows) {
            setError('Failed to extract claim data from file. Ensure columns match: client_id, claim_number, service_date, ndis_line_item, claimed_hours, claimed_amount, status.');
            setImporting(false);
            return;
        }

        const batchId = `batch_${Date.now()}`;
        const rows = extracted.output.rows;
        let created = 0;

        for (const row of rows) {
            if (!row.claim_number || !row.service_date || !row.ndis_line_item) continue;
            await base44.entities.NDISClaimData.create({
                ...row,
                client_id: row.client_id || 'unknown',
                batch_id: batchId,
                source: 'csv_import',
                raw_data: JSON.stringify(row)
            });
            created++;
        }

        setResult({ created, total: rows.length, batchId });
        setImporting(false);
        if (onImportComplete) onImportComplete();
    };

    return (
        <div className="space-y-3">
            <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:border-teal-400 transition-colors">
                {importing ? (
                    <Loader2 className="h-5 w-5 text-teal-500 animate-spin" />
                ) : (
                    <Upload className="h-5 w-5 text-slate-400" />
                )}
                <span className="text-sm text-slate-600 dark:text-slate-400">
                    {importing ? 'Processing...' : 'Upload NDIS Claim Statement (CSV / XLSX / PDF)'}
                </span>
                <input type="file" className="hidden" accept=".csv,.xlsx,.pdf" onChange={handleFileUpload} disabled={importing} />
            </label>

            {result && (
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    <span>Imported {result.created} of {result.total} claim records — Batch: <code className="text-xs">{result.batchId}</code></span>
                </div>
            )}
            {error && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                </div>
            )}
            <p className="text-xs text-slate-400">Required columns: client_id, claim_number, service_date, ndis_line_item, claimed_hours, claimed_amount, status</p>
        </div>
    );
}