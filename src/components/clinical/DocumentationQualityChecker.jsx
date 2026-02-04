import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { FileCheck, AlertTriangle, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function DocumentationQualityChecker({ caseNoteId }) {
  const [analysis, setAnalysis] = useState(null);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('analyzeDocumentationQuality', {
        case_note_id: caseNoteId
      });
      return response.data;
    },
    onSuccess: (data) => {
      setAnalysis(data.analysis);
    }
  });

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  const getQualityBadge = (quality) => {
    const variants = {
      excellent: 'bg-green-100 text-green-800',
      good: 'bg-blue-100 text-blue-800',
      adequate: 'bg-amber-100 text-amber-800',
      poor: 'bg-red-100 text-red-800'
    };
    return variants[quality] || variants.adequate;
  };

  const getReadinessBadge = (readiness) => {
    const variants = {
      ready: 'bg-green-100 text-green-800',
      minor_issues: 'bg-amber-100 text-amber-800',
      major_issues: 'bg-red-100 text-red-800'
    };
    return variants[readiness] || variants.minor_issues;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileCheck className="h-5 w-5" />
          NDIS Documentation Quality Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!analysis ? (
          <div className="text-center py-6">
            <Button
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
            >
              {analyzeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing Documentation...
                </>
              ) : (
                <>
                  <FileCheck className="h-4 w-4 mr-2" />
                  Run Quality Check
                </>
              )}
            </Button>
            <p className="text-sm text-slate-500 mt-2">
              AI-powered review for NDIS compliance and best practices
            </p>
          </div>
        ) : (
          <>
            {/* Scores Overview */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className={`text-3xl font-bold ${getScoreColor(analysis.compliance_score)}`}>
                  {analysis.compliance_score}
                </p>
                <p className="text-xs text-slate-600 mt-1">Compliance Score</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className={`text-3xl font-bold ${getScoreColor(analysis.completeness_percentage)}`}>
                  {analysis.completeness_percentage}%
                </p>
                <p className="text-xs text-slate-600 mt-1">Completeness</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <Badge className={getQualityBadge(analysis.overall_quality)}>
                  {analysis.overall_quality}
                </Badge>
                <p className="text-xs text-slate-600 mt-1">Overall Quality</p>
              </div>
            </div>

            {/* Audit Readiness */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm font-medium">Audit Readiness</span>
              <Badge className={getReadinessBadge(analysis.audit_readiness)}>
                {analysis.audit_readiness.replace(/_/g, ' ')}
              </Badge>
            </div>

            {/* Compliance Risks */}
            {analysis.compliance_risks?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  Compliance Risks
                </h4>
                <div className="space-y-2">
                  {analysis.compliance_risks.map((risk, idx) => (
                    <Alert
                      key={idx}
                      variant={risk.severity === 'critical' ? 'destructive' : 'default'}
                      className="py-2"
                    >
                      <AlertDescription>
                        <div className="flex items-start gap-2">
                          <Badge className={
                            risk.severity === 'critical' ? 'bg-red-600 text-white' :
                            risk.severity === 'high' ? 'bg-orange-600 text-white' :
                            'bg-amber-600 text-white'
                          }>
                            {risk.severity}
                          </Badge>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{risk.issue}</p>
                            <p className="text-xs text-slate-600 mt-1">
                              NDIS Requirement: {risk.requirement}
                            </p>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Elements */}
            {analysis.missing_elements?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Missing Information</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.missing_elements.map((element, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {element}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths */}
            {analysis.strengths?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Strengths
                </h4>
                <ul className="text-sm space-y-1">
                  {analysis.strengths.map((strength, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">•</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {analysis.improvement_recommendations?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Improvement Recommendations</h4>
                <div className="space-y-2">
                  {analysis.improvement_recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-blue-50 rounded text-sm">
                      <Badge className={
                        rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                        rec.priority === 'medium' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-800'
                      }>
                        {rec.priority}
                      </Badge>
                      <p className="flex-1">{rec.suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Re-analyze Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
              className="w-full"
            >
              {analyzeMutation.isPending ? 'Re-analyzing...' : 'Re-analyze Documentation'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}