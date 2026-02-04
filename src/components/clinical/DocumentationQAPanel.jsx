import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function DocumentationQAPanel({ documentType, documentId, onComplete }) {
  const [qaResult, setQaResult] = useState(null);

  const qaMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('performDocumentationQA', {
        document_type: documentType,
        document_id: documentId
      });
      return response.data;
    },
    onSuccess: (data) => {
      setQaResult(data.qa_result);
      onComplete?.(data.qa_result);
    }
  });

  return (
    <Card className="border-teal-200 bg-teal-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5 text-teal-600" />
            AI Quality Assurance
          </CardTitle>
          <Button 
            size="sm" 
            onClick={() => qaMutation.mutate()}
            disabled={qaMutation.isPending}
          >
            {qaMutation.isPending ? 'Checking...' : 'Run QA Check'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!qaResult ? (
          <p className="text-sm text-slate-600">Run automated compliance and quality checks</p>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-white rounded">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Compliance Score</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{qaResult.overall_compliance_score}/100</span>
                  {qaResult.overall_compliance_score >= 80 ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>
              </div>
              <Badge className={
                qaResult.overall_compliance_score >= 80 ? 'bg-green-600 mt-2' :
                qaResult.overall_compliance_score >= 60 ? 'bg-amber-600 mt-2' :
                'bg-red-600 mt-2'
              }>
                {qaResult.compliance_status}
              </Badge>
            </div>

            {qaResult.critical_issues?.length > 0 && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription>
                  <p className="font-medium text-sm mb-2">Critical Issues ({qaResult.critical_issues.length})</p>
                  <ul className="space-y-2">
                    {qaResult.critical_issues.map((issue, idx) => (
                      <li key={idx} className="text-xs">
                        <p className="font-medium">{issue.issue}</p>
                        <p className="text-red-700">Standard: {issue.ndis_standard_reference}</p>
                        <p className="text-blue-700 mt-1"><strong>Action:</strong> {issue.required_action}</p>
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div>
              <p className="text-sm font-medium mb-2">Completeness Check</p>
              <div className="p-2 bg-white rounded">
                <div className="flex justify-between text-xs mb-2">
                  <span>Complete</span>
                  <span className="font-bold">{qaResult.completeness_check?.completeness_percentage}%</span>
                </div>
                {qaResult.completeness_check?.missing_fields?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium">Missing Fields:</p>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {qaResult.completeness_check.missing_fields.map((field, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{field}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {qaResult.corrective_actions?.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Corrective Actions</p>
                <div className="space-y-2">
                  {qaResult.corrective_actions.slice(0, 3).map((action, idx) => (
                    <div key={idx} className="p-2 bg-white rounded text-xs">
                      <div className="flex items-start justify-between mb-1">
                        <span className="font-medium">{action.action}</span>
                        <Badge className={
                          action.priority === 'high' ? 'bg-red-600' :
                          action.priority === 'medium' ? 'bg-amber-600' :
                          'bg-blue-600'
                        }>
                          {action.priority}
                        </Badge>
                      </div>
                      {action.suggested_content && (
                        <p className="text-slate-600 mt-1">Suggested: {action.suggested_content}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 bg-white rounded">
              <div className="flex items-center gap-2 mb-2">
                {qaResult.audit_readiness?.audit_ready ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                )}
                <span className="text-sm font-medium">
                  {qaResult.audit_readiness?.audit_ready ? 'Audit Ready' : 'Not Audit Ready'}
                </span>
              </div>
              {qaResult.audit_readiness?.concerns?.length > 0 && (
                <ul className="text-xs space-y-1 text-slate-700">
                  {qaResult.audit_readiness.concerns.map((concern, i) => (
                    <li key={i}>• {concern}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}