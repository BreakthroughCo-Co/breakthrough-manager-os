import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertTriangle, ArrowRight, Link2 } from 'lucide-react';

/**
 * Visual representation of evidence chains
 * Shows: Behaviour → Hypothesis → Intervention → Outcome
 */
export default function EvidenceChainView({ chain }) {
  if (!chain) return null;

  const getConfidenceBadge = (confidence) => {
    const colors = {
      high: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-red-100 text-red-800',
    };
    return colors[confidence] || colors.medium;
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Evidence Chain: {chain.chain_id}
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline">{chain.chain_status}</Badge>
            {chain.validation?.valid ? (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Valid
              </Badge>
            ) : (
              <Badge className="bg-red-100 text-red-800">
                <XCircle className="w-3 h-3 mr-1" />
                Incomplete
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Validation Errors */}
        {chain.validation && !chain.validation.valid && (
          <Alert className="mb-4 bg-red-50 border-red-200">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription>
              <p className="font-medium text-red-900 mb-1">Evidence Chain Issues:</p>
              <ul className="list-disc list-inside text-sm text-red-800">
                {chain.validation.errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Evidence Flow */}
        <div className="space-y-4">
          {/* Behaviour */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-blue-800">1</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">Behaviour</p>
              <p className="text-sm text-slate-600">{chain.behaviour.description}</p>
              <Badge variant="outline" className="mt-1 text-xs">
                {chain.behaviour.abc_records?.length || 0} ABC records
              </Badge>
            </div>
          </div>

          <ArrowRight className="w-5 h-5 text-slate-400 ml-3" />

          {/* Hypothesis */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-purple-800">2</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-purple-900">Hypothesis</p>
              <p className="text-sm text-slate-600">{chain.hypothesis.statement}</p>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline" className="text-xs">{chain.hypothesis.function}</Badge>
                <Badge className={`${getConfidenceBadge(chain.hypothesis.confidence)} text-xs`}>
                  {chain.hypothesis.confidence} confidence
                </Badge>
              </div>
            </div>
          </div>

          <ArrowRight className="w-5 h-5 text-slate-400 ml-3" />

          {/* Intervention */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-teal-800">3</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-teal-900">Intervention</p>
              <p className="text-sm text-slate-600">{chain.intervention.description}</p>
              {chain.intervention.evidence_base && (
                <p className="text-xs text-slate-500 mt-1">
                  Evidence: {chain.intervention.evidence_base}
                </p>
              )}
            </div>
          </div>

          <ArrowRight className="w-5 h-5 text-slate-400 ml-3" />

          {/* Outcome */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-green-800">4</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">Outcome Metric</p>
              <p className="text-sm text-slate-600">{chain.outcome.metric_name}</p>
              <p className="text-xs text-slate-500 mt-1">
                Method: {chain.outcome.measurement_method}
              </p>
              <p className="text-xs text-slate-500">
                Target: {chain.outcome.target_value}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}