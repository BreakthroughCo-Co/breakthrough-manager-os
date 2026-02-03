import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, TrendingUp, Activity, FileText, Brain } from 'lucide-react';
import { auditLog } from '@/components/compliance/auditLogger';

/**
 * Clinical Decision Intelligence
 * Cross-analyzes ABC data, FBAs, incident reports to flag behavioral risks
 */
export default function ClinicalIntelligence({ clientId }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState(null);

  const { data: abcRecords = [] } = useQuery({
    queryKey: ['abcRecords', clientId],
    queryFn: () => base44.entities.ABCRecord.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const { data: fbas = [] } = useQuery({
    queryKey: ['fbas', clientId],
    queryFn: () => base44.entities.FunctionalBehaviourAssessment.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const { data: caseNotes = [] } = useQuery({
    queryKey: ['caseNotes', clientId],
    queryFn: () => base44.entities.CaseNote.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const { data: riskAssessments = [] } = useQuery({
    queryKey: ['riskAssessments', clientId],
    queryFn: () => base44.entities.RiskAssessment.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const analyzePatterns = async () => {
    setAnalyzing(true);
    try {
      // Prepare data for AI analysis
      const analysisData = {
        abc_records: abcRecords.slice(0, 20).map(r => ({
          date: r.date,
          antecedent: r.antecedent,
          behaviour: r.behaviour,
          consequence: r.consequence,
          intensity: r.intensity,
          duration: r.duration,
        })),
        fba_summary: fbas[0] ? {
          hypothesised_function: fbas[0].hypothesised_function,
          target_behaviours: fbas[0].target_behaviours,
          antecedents: fbas[0].antecedents,
          setting_events: fbas[0].setting_events,
        } : null,
        recent_progress: caseNotes.slice(0, 10).map(n => ({
          date: n.session_date,
          progress_rating: n.progress_rating,
          assessment: n.assessment,
        })),
        risk_level: riskAssessments[0]?.residual_risk_level,
      };

      // Use AI to analyze patterns and risks
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a clinical psychologist analyzing behavioral data for an NDIS participant.

Analyze the following data and identify:
1. Emerging behavioral patterns or escalations
2. Environmental triggers that appear consistently
3. Early warning signs of increased risk
4. Recommendations for intervention adjustments
5. Data quality issues or gaps

Data:
${JSON.stringify(analysisData, null, 2)}

Provide structured clinical insights focused on risk prevention and evidence-based recommendations.`,
        response_json_schema: {
          type: 'object',
          properties: {
            risk_level: { type: 'string', enum: ['low', 'moderate', 'high', 'critical'] },
            emerging_patterns: { type: 'array', items: { type: 'string' } },
            trigger_analysis: { type: 'array', items: { type: 'string' } },
            early_warnings: { type: 'array', items: { type: 'string' } },
            recommendations: { type: 'array', items: { type: 'string' } },
            data_gaps: { type: 'array', items: { type: 'string' } },
            confidence_level: { type: 'string', enum: ['low', 'medium', 'high'] },
          },
        },
      });

      setInsights(response);

      // Log the analysis
      await auditLog.accessed('Client', clientId, {
        action: 'clinical_intelligence_analysis',
        insights_generated: true,
      });
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const getRiskColor = (level) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      moderate: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };
    return colors[level] || colors.moderate;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Clinical Decision Intelligence
            </CardTitle>
            <Button onClick={analyzePatterns} disabled={analyzing || !clientId}>
              {analyzing ? 'Analyzing...' : 'Analyze Patterns'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <Activity className="w-5 h-5 mx-auto mb-1 text-blue-600" />
              <p className="text-2xl font-bold">{abcRecords.length}</p>
              <p className="text-xs text-muted-foreground">ABC Records</p>
            </div>
            <div className="text-center">
              <FileText className="w-5 h-5 mx-auto mb-1 text-teal-600" />
              <p className="text-2xl font-bold">{fbas.length}</p>
              <p className="text-xs text-muted-foreground">FBAs</p>
            </div>
            <div className="text-center">
              <TrendingUp className="w-5 h-5 mx-auto mb-1 text-purple-600" />
              <p className="text-2xl font-bold">{caseNotes.length}</p>
              <p className="text-xs text-muted-foreground">Case Notes</p>
            </div>
            <div className="text-center">
              <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-orange-600" />
              <p className="text-2xl font-bold">{riskAssessments.length}</p>
              <p className="text-xs text-muted-foreground">Risk Assessments</p>
            </div>
          </div>

          {insights && (
            <div className="space-y-4 mt-6">
              <div className="flex items-center gap-3">
                <Badge className={getRiskColor(insights.risk_level)}>
                  Risk Level: {insights.risk_level}
                </Badge>
                <Badge variant="outline">
                  Confidence: {insights.confidence_level}
                </Badge>
              </div>

              {insights.early_warnings?.length > 0 && (
                <Alert className="bg-orange-50 border-orange-200">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <AlertDescription>
                    <p className="font-medium mb-2">Early Warning Signs Detected:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {insights.early_warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <Card className="bg-slate-50">
                <CardHeader>
                  <CardTitle className="text-base">Emerging Patterns</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {insights.emerging_patterns?.map((pattern, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <TrendingUp className="w-4 h-4 mt-0.5 text-blue-600" />
                        <span className="text-sm">{pattern}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-slate-50">
                <CardHeader>
                  <CardTitle className="text-base">Trigger Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {insights.trigger_analysis?.map((trigger, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Activity className="w-4 h-4 mt-0.5 text-purple-600" />
                        <span className="text-sm">{trigger}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-base">Clinical Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {insights.recommendations?.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Brain className="w-4 h-4 mt-0.5 text-blue-600" />
                        <span className="text-sm">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {insights.data_gaps?.length > 0 && (
                <Card className="bg-amber-50 border-amber-200">
                  <CardHeader>
                    <CardTitle className="text-base">Data Quality Gaps</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {insights.data_gaps.map((gap, i) => (
                        <li key={i}>{gap}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}