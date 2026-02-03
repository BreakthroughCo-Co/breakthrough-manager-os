import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

export default function ComplianceTrainingManagement() {
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRunAnalysis = async () => {
    setIsLoading(true);
    try {
      const result = await base44.functions.invoke('analyzeComplianceTrainingNeeds', {});
      setAnalysis(result.data);
    } catch (error) {
      alert('Failed to run analysis: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compliance Training Management</h1>
          <p className="text-muted-foreground mt-1">AI analysis of compliance breaches and audit findings to identify training needs</p>
        </div>
        <Button 
          onClick={handleRunAnalysis}
          disabled={isLoading}
          size="lg"
          className="bg-teal-600 hover:bg-teal-700"
        >
          {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Analyze Compliance Gaps
        </Button>
      </div>

      {isLoading && (
        <Card>
          <CardContent className="pt-6 flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-teal-600 mr-2" />
            Analyzing compliance breaches and audit data...
          </CardContent>
        </Card>
      )}

      {analysis && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Analysis Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Breaches Analyzed: <strong>{analysis.breaches_analyzed}</strong></p>
              <p>Audits Reviewed: <strong>{analysis.audits_reviewed}</strong></p>
              <p>Compliance Items: <strong>{analysis.compliance_items_reviewed}</strong></p>
              <p>Training Needs Created: <strong>{analysis.training_needs_created}</strong></p>
            </CardContent>
          </Card>

          {/* Critical Gaps */}
          {analysis.analysis.critical_gaps?.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Critical Compliance Gaps
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analysis.analysis.critical_gaps.map((gap, idx) => (
                  <div key={idx} className="p-3 bg-white rounded border border-red-200">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-red-900">{gap.gap}</h4>
                      <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded">
                        {gap.breach_frequency} breaches
                      </span>
                    </div>
                    <p className="text-sm text-red-800 mb-2">NDIS Standard: {gap.ndis_standard}</p>
                    <p className="text-sm text-slate-700">Impact: {gap.impact}</p>
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
                    <li key={idx} className="text-sm text-slate-700 flex items-center gap-2">
                      <span className="text-teal-600">→</span> {cause}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Skill Gaps */}
          {analysis.analysis.skill_gaps?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Compliance Team Skill Gaps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analysis.analysis.skill_gaps.map((gap, idx) => (
                  <div key={idx} className="p-3 border rounded">
                    <h4 className="font-medium mb-2">{gap.gap_area}</h4>
                    <p className="text-sm text-slate-600 mb-2">Evidence: {gap.evidence}</p>
                    <div>
                      <p className="text-xs font-medium text-slate-700 mb-1">Affected Processes:</p>
                      <ul className="text-xs text-slate-600 space-y-1">
                        {gap.affected_processes.map((process, pIdx) => (
                          <li key={pIdx}>• {process}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recommended Training */}
          {analysis.analysis.recommended_training?.length > 0 && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardHeader>
                <CardTitle className="text-emerald-900 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Recommended Compliance Training
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analysis.analysis.recommended_training.map((training, idx) => (
                  <div key={idx} className="p-3 bg-white rounded border border-emerald-200">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-emerald-900">{training.training_topic}</h4>
                      <span className={`text-xs px-2 py-1 rounded font-semibold ${
                        training.priority === 'critical' ? 'bg-red-100 text-red-700' :
                        training.priority === 'high' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {training.priority}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">Area: {training.competency_area}</p>
                    <p className="text-sm text-slate-600 mb-2">Target: {training.target_audience}</p>
                    <div>
                      <p className="text-xs font-medium text-slate-700 mb-1">Success Metrics:</p>
                      <ul className="text-xs text-slate-600 space-y-1">
                        {training.success_metrics?.map((metric, mIdx) => (
                          <li key={mIdx}>✓ {metric}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Process Improvements */}
          {analysis.analysis.process_improvements?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Beyond Training: Process Improvements</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.analysis.process_improvements.map((improvement, idx) => (
                    <li key={idx} className="text-sm text-slate-700 flex items-center gap-2">
                      <span className="text-teal-600">→</span> {improvement}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Implementation Roadmap */}
          {analysis.analysis.implementation_roadmap?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Implementation Roadmap</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysis.analysis.implementation_roadmap.map((phase, idx) => (
                  <div key={idx} className="p-3 border rounded">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{phase.phase}</h4>
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                        {phase.timeline}
                      </span>
                    </div>
                    <ul className="text-sm text-slate-600 space-y-1 mb-2">
                      {phase.actions?.map((action, aIdx) => (
                        <li key={aIdx}>• {action}</li>
                      ))}
                    </ul>
                    <p className="text-sm text-emerald-700 font-medium">Expected Outcome: {phase.expected_outcome}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Breach Patterns */}
          {analysis.breach_patterns?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Breach Pattern Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {analysis.breach_patterns.slice(0, 10).map((pattern, idx) => (
                  <div key={idx} className="p-2 bg-slate-50 rounded text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{pattern.type}</span>
                      <span className="text-slate-600">{pattern.count} occurrences</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}