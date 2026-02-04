import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ComplianceAuditReportViewer() {
  const [report, setReport] = useState(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generateComplianceAuditReport');
      return response.data;
    },
    onSuccess: (data) => {
      setReport(data.audit_report);
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-5 w-5 text-teal-600" />
          NDIS Compliance Audit Report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!report ? (
          <div className="text-center py-6">
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? 'Generating Audit Report...' : 'Generate Compliance Audit Report'}
            </Button>
            <p className="text-xs text-slate-500 mt-2">
              Comprehensive analysis against NDIS Practice Standards
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded">
              <p className="text-xs text-slate-600">Audit Date: {new Date(report.audit_date || Date.now()).toLocaleDateString()}</p>
              <Badge className={
                report.compliance_status === 'compliant' ? 'bg-green-600' :
                report.compliance_status === 'partial' ? 'bg-amber-600' :
                'bg-red-600'
              }>
                {report.compliance_status}
              </Badge>
            </div>

            <div className="p-3 bg-blue-50 rounded text-sm">
              <p className="font-medium mb-2">Executive Summary</p>
              <p className="text-slate-700">{report.executive_summary}</p>
            </div>

            <Tabs defaultValue="critical">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="critical">Critical</TabsTrigger>
                <TabsTrigger value="standards">Standards</TabsTrigger>
                <TabsTrigger value="recommendations">Actions</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
              </TabsList>

              <TabsContent value="critical" className="space-y-2">
                {report.critical_findings?.map((finding, idx) => (
                  <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 text-sm">
                        <p className="font-medium text-red-900">{finding.finding}</p>
                        <div className="mt-2 space-y-1 text-xs">
                          <p className="text-red-800">
                            <strong>NDIS Standard:</strong> {finding.ndis_standard} - {finding.section_reference}
                          </p>
                          <p className="text-red-700">
                            <strong>Immediate Action:</strong> {finding.immediate_action}
                          </p>
                          <p className="text-slate-700">
                            <strong>Responsible:</strong> {finding.responsible_party}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {report.risk_assessment && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded mt-3">
                    <p className="text-sm font-medium mb-2">Risk Assessment</p>
                    <div className="text-xs space-y-1">
                      <p><strong>Overall Risk:</strong> {report.risk_assessment.overall_risk_level}</p>
                      <p><strong>Regulatory Exposure:</strong> {report.risk_assessment.regulatory_exposure}</p>
                      <div>
                        <p className="font-medium mt-2">Potential Consequences:</p>
                        <ul className="ml-4 space-y-0.5">
                          {report.risk_assessment.potential_consequences?.map((cons, idx) => (
                            <li key={idx}>• {cons}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="standards" className="space-y-2">
                {report.ndis_standards_attention?.map((standard, idx) => (
                  <div key={idx} className="p-2 border rounded text-xs">
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-medium">
                        {standard.standard_module} {standard.standard_number}: {standard.standard_title}
                      </p>
                      <Badge variant="outline">{standard.compliance_status}</Badge>
                    </div>
                    <div className="mt-2">
                      <p className="text-slate-700 font-medium">Required Actions:</p>
                      <ul className="ml-4 space-y-0.5 mt-1">
                        {standard.required_actions?.map((action, i) => (
                          <li key={i}>• {action}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="recommendations" className="space-y-2">
                {report.actionable_recommendations?.map((rec, idx) => (
                  <div key={idx} className="p-2 bg-blue-50 rounded text-xs">
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-medium flex-1">{rec.recommendation}</p>
                      <Badge className={
                        rec.priority === 'critical' ? 'bg-red-600' :
                        rec.priority === 'high' ? 'bg-orange-600' :
                        'bg-amber-600'
                      }>
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="text-slate-700 mt-1">Responsible: {rec.responsible_role}</p>
                    <p className="text-slate-700">Effort: {rec.estimated_effort}</p>
                    {rec.dependencies?.length > 0 && (
                      <div className="mt-1">
                        <p className="font-medium">Dependencies:</p>
                        <ul className="ml-4 space-y-0.5">
                          {rec.dependencies.map((dep, i) => (
                            <li key={i}>• {dep}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="timeline" className="space-y-3">
                {report.remediation_timeline?.map((phase, idx) => (
                  <div key={idx} className="p-3 border rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-teal-600" />
                      <p className="font-medium text-sm">{phase.phase}</p>
                      <Badge variant="outline">{phase.duration}</Badge>
                    </div>
                    <div className="text-xs space-y-2">
                      <div>
                        <p className="font-medium">Deliverables:</p>
                        <ul className="ml-4 space-y-0.5">
                          {phase.deliverables?.map((del, i) => (
                            <li key={i}>• {del}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium">Milestones:</p>
                        <ul className="ml-4 space-y-0.5">
                          {phase.milestones?.map((mil, i) => (
                            <li key={i}>
                              <CheckCircle className="inline h-3 w-3 text-green-600 mr-1" />
                              {mil}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}

                {report.monitoring_plan && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-sm font-medium mb-2">Ongoing Monitoring Plan</p>
                    <div className="text-xs space-y-1">
                      <p><strong>Review Frequency:</strong> {report.monitoring_plan.review_frequency}</p>
                      <p><strong>Reporting:</strong> {report.monitoring_plan.reporting_structure}</p>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}