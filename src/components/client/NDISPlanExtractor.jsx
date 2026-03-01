import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, Loader2, CheckCircle, AlertTriangle, FileText } from 'lucide-react';

export default function NDISPlanExtractor({ clientId }) {
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResult(null);
    setError(null);
    setUploading(true);

    // Upload file
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUploading(false);
    setExtracting(true);

    // Extract and populate
    const res = await base44.functions.invoke('extractNDISPlanDocument', {
      file_url,
      client_id: clientId,
    });

    setExtracting(false);

    if (res.data?.ok) {
      setResult(res.data);
      queryClient.invalidateQueries({ queryKey: ['clientDetail', clientId] });
      queryClient.invalidateQueries({ queryKey: ['clientGoals', clientId] });
    } else {
      setError(res.data?.error || 'Extraction failed');
    }

    // Reset file input
    e.target.value = '';
  };

  const isProcessing = uploading || extracting;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-teal-600" />
          AI NDIS Plan Extraction
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-slate-500">
          Upload an NDIS plan PDF or image. AI will auto-populate plan dates, funding allocation, and create goal records.
        </p>

        <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
          isProcessing ? 'border-slate-200 bg-slate-50' : 'border-teal-300 hover:border-teal-400 hover:bg-teal-50'
        }`}>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileChange}
            disabled={isProcessing}
          />
          {isProcessing ? (
            <div className="flex flex-col items-center gap-1">
              <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
              <span className="text-xs text-slate-500">
                {uploading ? 'Uploading...' : 'Extracting data with AI...'}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Upload className="w-5 h-5 text-teal-500" />
              <span className="text-xs text-slate-600">Upload NDIS Plan (PDF/Image)</span>
            </div>
          )}
        </label>

        {result && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
              <CheckCircle className="w-4 h-4" />
              Extraction Complete
            </div>
            <div className="grid grid-cols-2 gap-1 text-xs text-emerald-800">
              {Object.entries(result.client_fields_updated).map(([k, v]) => (
                <div key={k} className="flex gap-1">
                  <span className="font-medium capitalize">{k.replace(/_/g, ' ')}:</span>
                  <span>{typeof v === 'number' ? `$${v.toLocaleString()}` : v}</span>
                </div>
              ))}
            </div>
            {result.goals_created > 0 && (
              <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                {result.goals_created} goal{result.goals_created > 1 ? 's' : ''} created
              </Badge>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}