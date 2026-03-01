import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

export default function PRODAErrorPredictorPanel() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const validateMutation = useMutation({
    mutationFn: () => base44.functions.invoke('predictPRODAErrors', {}),
    onSuccess: (response) => {
      setResults(response.data);
      setLoading(false);
    },
    onError: () => setLoading(false)
  });

  const handleValidate = async () => {
    setLoading(true);
    validateMutation.mutate();
  };

  if (!results && !loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">PRODA Claim Validation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-4">Validate pending claims before PRODA submission. Identifies errors, missing data, and compliance risks.</p>
          <Button onClick={handleValidate} className="bg-teal-600 hover:bg-teal-700 gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
            Run PRODA Validation
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card className={results.submission_readiness === 'ready' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            {results.submission_readiness === 'ready' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
            Submission Status: {results.submission_readiness?.toUpperCase()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-slate-600">Total Claims</p>
              <p className="text-xl font-bold">{results.total_claims_validated}</p>
            </div>
            <div>
              <p className="text-slate-600">Critical Errors</p>
              <p className={`text-xl font-bold ${results.critical_errors > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {results.critical_errors}
              </p>
            </div>
            <div>
              <p className="text-slate-600">Warnings</p>
              <p className={`text-xl font-bold ${results.warnings > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {results.warnings}
              </p>
            </div>
            <div>
              <p className="text-slate-600">Scan Time</p>
              <p className="text-xs text-slate-600 mt-2">{new Date(results.scan_timestamp).toLocaleTimeString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critical Errors */}
      {results.validation_errors?.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-sm">Critical Errors ({results.validation_errors.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {results.validation_errors.map((error, idx) => (
              <div key={idx} className="p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{error.rule}</p>
                    <p className="text-xs text-slate-700 mt-1">{error.message}</p>
                    <p className="text-xs text-red-600 mt-2">
                      <strong>Claim:</strong> {error.claim_number} | <strong>Client:</strong> {error.client_name}
                    </p>
                  </div>
                  <Badge className="bg-red-600 shrink-0">MUST FIX</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {results.validation_warnings?.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="text-sm">Warnings ({results.validation_warnings.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {results.validation_warnings.map((warn, idx) => (
              <div key={idx} className="p-2 bg-amber-50 rounded text-xs">
                <p className="font-medium">{warn.rule}</p>
                <p className="text-slate-700">{warn.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* LLM Analysis */}
      {results.llm_analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">AI Analysis & Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {results.llm_analysis.analysis?.map((item, idx) => (
              <div key={idx} className="border-l-2 border-slate-300 pl-3">
                <p className="font-medium">{item.issue}</p>
                <p className="text-xs text-slate-600 mt-1"><strong>Root Cause:</strong> {item.root_cause}</p>
                <p className="text-xs text-slate-600"><strong>Fix:</strong> {item.immediate_fix}</p>
                <p className="text-xs text-slate-600"><strong>Prevent:</strong> {item.preventive_measure}</p>
              </div>
            ))}
            {results.llm_analysis.risk_assessment && (
              <div className="bg-slate-50 p-3 rounded text-xs">
                <p className="font-medium mb-1">Risk Assessment</p>
                <p>{results.llm_analysis.risk_assessment}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Button onClick={handleValidate} variant="outline" className="w-full gap-2">
        <Loader2 className="h-4 w-4" />
        Re-run Validation
      </Button>
    </div>
  );
}