import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ProactiveComplianceMonitor() {
  const [assessment, setAssessment] = useState(null);

  const monitorMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('monitorComplianceRisks', {});
      return response.data;
    },
    onSuccess: (data) => {
      setAssessment(data.compliance_assessment);
    }
  });

  return (
    <Card className="border-teal-200 bg-teal-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5 text-teal-600" />
            Proactive Compliance Monitoring
          </CardTitle>
          <Button 
            size="sm" 
            onClick={() => monitorMutation.mutate()}
            disabled={monitorMutation.isPending}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {monitorMutation.isPending ? 'Scanning...' : 'Run Compliance Scan'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!assessment ? (
          <p className="text-sm text-slate-600">NDIS Practice Standards compliance monitoring across all modules</p>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-white rounded">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Compliance Score</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{assessment.overall_compliance_score}/100</span>
                  {assessment.overall_compliance_score >= 80 ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Badge className={
                  assessment.risk_level === 'low' ? 'bg-green-600' :
                  assessment.risk_level === 'medium' ? 'bg-amber-600' :
                  'bg-red-600'
                }>
                  {assessment.risk_level} Risk
                </Badge>
                <Badge variant="outline">{assessment.compliance_status}</Badge>
              </div>
            </div>

            {assessment.critical_violations?.length > 0 && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription>
                  <p className="font-medium text-sm mb-2">Critical Violations ({assessment.critical_violations.length})</p>
                  {assessment.critical_violations.slice(0, 3).map((violation, idx) => (
                    <div key={idx} className="mb-2 text-xs">
                      <p className="font-medium">{violation.violation_type}</p>
                      <p className="text-red-700">Standard: {violation.ndis_standard}</p>
                      <p className="text-blue-700"><strong>Action:</strong> {violation.immediate_action}</p>
                      <p className="text-slate-700"><strong>Deadline:</strong> {violation.deadline}</p>
                    </div>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="gaps">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="gaps">Documentation</TabsTrigger>
                <TabsTrigger value="patterns">Patterns</TabsTrigger>
                <TabsTrigger value="remediation">Actions</TabsTrigger>
              </TabsList>

              <TabsContent value="gaps" className="space-y-2">
                {assessment.documentation_gaps?.map((gap, idx) => (
                  <div key={idx} className="p-2 bg-white rounded text-xs">
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-medium">{gap.gap_type}</span>
                      <Badge variant="outline">{gap.count} records</Badge>
                    </div>
                    <p className="text-slate-600 mb-1"><strong>Module:</strong> {gap.module}</p>
                    <p className="text-red-700"><strong>Impact:</strong> {gap.impact}</p>
                    <p className="text-blue-700"><strong>Fix:</strong> {gap.remediation}</p>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="patterns" className="space-y-2">
                {assessment.systemic_patterns?.map((pattern, idx) => (
                  <div key={idx} className="p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                    <p className="font-medium">{pattern.pattern}</p>
                    <p className="text-slate-700 mt-1">Frequency: {pattern.frequency}</p>
                    <p className="text-red-700"><strong>Root:</strong> {pattern.root_cause}</p>
                    <p className="text-green-700 mt-1"><strong>Solution:</strong> {pattern.organizational_fix}</p>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="remediation" className="space-y-2">
                {assessment.remediation_plan?.map((action, idx) => (
                  <div key={idx} className="p-2 bg-white border-l-4 border-red-400 rounded">
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-medium text-sm">{action.action}</span>
                      <Badge className={
                        action.priority === 'immediate' ? 'bg-red-600' :
                        action.priority === 'high' ? 'bg-amber-600' :
                        'bg-blue-600'
                      }>
                        {action.priority}
                      </Badge>
                    </div>
                    <div className="text-xs space-y-1">
                      <p><strong>Owner:</strong> {action.responsible_role}</p>
                      <p><strong>Due:</strong> {action.deadline}</p>
                      <p className="text-green-700"><strong>Verify:</strong> {action.verification_method}</p>
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>

            {assessment.audit_readiness && (
              <div className="p-3 bg-white rounded">
                <p className="text-sm font-medium mb-2">Audit Readiness: {assessment.audit_readiness.overall_readiness}</p>
                <div className="text-xs space-y-1">
                  <p className="text-green-700"><strong>Strengths:</strong> {assessment.audit_readiness.strengths?.slice(0, 2).join(', ')}</p>
                  <p className="text-red-700"><strong>Vulnerabilities:</strong> {assessment.audit_readiness.vulnerabilities?.slice(0, 2).join(', ')}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}