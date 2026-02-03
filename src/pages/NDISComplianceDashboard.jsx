import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, AlertTriangle, CheckCircle2, Clock, RefreshCw, TrendingDown } from 'lucide-react';

export default function NDISComplianceDashboard() {
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      const result = await base44.functions.invoke('analyzeComplianceRisks', {});
      setAnalysis(result.data);
    } catch (error) {
      alert('Analysis failed: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-teal-600 mr-2" />
          Running compliance risk analysis...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">NDIS Compliance Dashboard</h1>
          <p className="text-muted-foreground mt-1">Real-time compliance risk monitoring and proactive mitigation</p>
        </div>
        <Button onClick={handleAnalyze} className="bg-teal-600 hover:bg-teal-700">
          <RefreshCw className="w-4 h-4 mr-2" />
          Analyze Risks
        </Button>
      </div>

      {analysis && (
        <>
          {/* Risk Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Card className={`border-l-4 ${
              analysis.analysis.risk_level === 'critical' ? 'border-l-red-500' :
              analysis.analysis.risk_level === 'high' ? 'border-l-orange-500' :
              'border-l-yellow-500'
            }`}>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">Compliance Score</p>
                <p className="text-3xl font-bold">{analysis.analysis.compliance_score}/100</p>
                <p className="text-xs text-muted-foreground mt-2">Risk: <strong>{analysis.analysis.risk_level.toUpperCase()}</strong></p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">Non-Compliant Items</p>
                <p className="text-3xl font-bold text-red-600">{analysis.total_non_compliant}</p>
                <p className="text-xs text-muted-foreground mt-2">Critical: {analysis.critical_items}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">Recent Incidents (30d)</p>
                <p className="text-3xl font-bold text-orange-600">{analysis.recent_incidents_30d}</p>
                <p className="text-xs text-muted-foreground mt-2">Active Breaches: {analysis.active_breaches}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">Active Risk Alerts</p>
                <p className="text-3xl font-bold text-amber-600">{analysis.active_risk_alerts}</p>
              </CardContent>
            </Card>
          </div>

          {/* Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Compliance Item Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Compliant', value: analysis.compliance_status.compliant, color: 'bg-emerald-100' },
                { label: 'Attention Needed', value: analysis.compliance_status.attention_needed, color: 'bg-amber-100' },
                { label: 'Non-Compliant', value: analysis.compliance_status.non_compliant, color: 'bg-red-100' },
                { label: 'Pending Review', value: analysis.compliance_status.pending_review, color: 'bg-slate-100' }
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between mb-1 text-sm">
                    <span>{item.label}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${item.color}`}>{item.value}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Critical Risks */}
          {analysis.analysis.critical_risks?.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Critical Risk Areas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {analysis.analysis.critical_risks.slice(0, 5).map((risk, idx) => (
                  <div key={idx} className="p-3 bg-white rounded border border-red-200">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-red-900">{risk.risk}</h4>
                      <Badge className="bg-red-600">{risk.severity}</Badge>
                    </div>
                    <p className="text-xs text-red-800 mb-2">NDIS: {risk.ndis_standard}</p>
                    <p className="text-xs text-red-700 font-medium">Action (Next 7d): {risk.immediate_action}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Root Causes */}
          {analysis.analysis.root_causes?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Root Cause Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.analysis.root_causes.map((cause, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <span className="text-teal-600 mt-1">→</span>
                      <span>{cause}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Risk Trends */}
          {analysis.analysis.risk_trends && (
            <Card>
              <CardHeader>
                <CardTitle>Risk Trends & Patterns</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-slate-50 rounded">
                  <p className="font-semibold text-sm mb-2 flex items-center gap-2">
                    {analysis.analysis.risk_trends.direction === 'improving' ? (
                      <TrendingDown className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    )}
                    Direction: {analysis.analysis.risk_trends.direction.toUpperCase()}
                  </p>
                </div>

                {analysis.analysis.risk_trends.repeat_patterns?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-2">Repeat Patterns</p>
                    <ul className="space-y-1">
                      {analysis.analysis.risk_trends.repeat_patterns.map((pattern, idx) => (
                        <li key={idx} className="text-xs text-slate-600">• {pattern}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.analysis.risk_trends.systemic_issues?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-2">Systemic Issues</p>
                    <ul className="space-y-1">
                      {analysis.analysis.risk_trends.systemic_issues.map((issue, idx) => (
                        <li key={idx} className="text-xs text-slate-600">• {issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Mitigation Roadmap */}
          {analysis.analysis.mitigation_roadmap?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Mitigation Roadmap</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analysis.analysis.mitigation_roadmap.map((phase, idx) => (
                  <div key={idx} className="p-3 border rounded">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{phase.phase}</h4>
                      <Badge variant="outline">{phase.timeline}</Badge>
                    </div>
                    <ul className="text-sm space-y-1 mb-2">
                      {phase.actions?.slice(0, 3).map((action, aIdx) => (
                        <li key={aIdx} className="flex items-start gap-2 text-slate-700">
                          <span className="text-teal-600">→</span> {action}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-emerald-700 font-medium">Expected: {phase.expected_outcome}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Regulatory Exposure */}
          {analysis.analysis.regulatory_exposure && (
            <Alert className="border-amber-300 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-900">
                <strong>Regulatory Exposure:</strong> {analysis.analysis.regulatory_exposure.suspension_risk}
                <br />
                <strong>Audit Risk:</strong> {analysis.analysis.regulatory_exposure.audit_finding_likelihood}
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  );
}