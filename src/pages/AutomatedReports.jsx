import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Calendar, TrendingUp, AlertCircle, CheckCircle, Loader2, Download } from 'lucide-react';

export default function AutomatedReports() {
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: savedReports, isLoading } = useQuery({
    queryKey: ['savedReports'],
    queryFn: () => base44.entities.SavedReport.list('-generated_date', 50),
    initialData: [],
  });

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      await base44.functions.invoke('autoGenerateComplianceReport', {
        report_type: 'monthly_compliance_summary',
        include_recommendations: true,
      });
      alert('Compliance report generated successfully!');
    } catch (error) {
      alert('Failed to generate report: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const complianceReports = savedReports.filter(r => r.report_category === 'compliance');

  const getStatusColor = (score) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <FileText className="w-8 h-8 text-indigo-600" />
              Automated Compliance Reports
            </h1>
            <p className="text-slate-600 mt-2">
              AI-generated compliance reports with insights and recommendations
            </p>
          </div>
          <Button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Generate Report
              </>
            )}
          </Button>
        </div>

        <Tabs defaultValue="reports" className="space-y-6">
          <TabsList>
            <TabsTrigger value="reports">Generated Reports</TabsTrigger>
            <TabsTrigger value="schedule">Report Schedule</TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : complianceReports.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-600">No compliance reports generated yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {complianceReports.map((report) => {
                  let reportData = null;
                  try {
                    reportData = JSON.parse(report.report_data);
                  } catch (e) {
                    console.error('Failed to parse report data:', e);
                  }

                  return (
                    <Card key={report.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-xl">{report.report_name}</CardTitle>
                            <CardDescription className="mt-1">
                              {report.period_start} to {report.period_end}
                            </CardDescription>
                          </div>
                          <div className="text-right">
                            {reportData?.compliance_score && (
                              <div>
                                <div className={`text-3xl font-bold ${getStatusColor(reportData.compliance_score)}`}>
                                  {reportData.compliance_score}
                                </div>
                                <div className="text-xs text-slate-500">Compliance Score</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {reportData?.executive_summary && (
                          <div>
                            <h4 className="font-semibold text-sm text-slate-700 mb-2">Executive Summary</h4>
                            <p className="text-sm text-slate-600 line-clamp-3">{reportData.executive_summary}</p>
                          </div>
                        )}

                        {reportData?.status_overview && (
                          <div className="flex items-center gap-2">
                            <Badge className={
                              reportData.status_overview.overall_status === 'compliant'
                                ? 'bg-green-100 text-green-800'
                                : reportData.status_overview.overall_status === 'partially_compliant'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }>
                              {reportData.status_overview.overall_status?.replace('_', ' ')}
                            </Badge>
                          </div>
                        )}

                        {reportData?.key_findings && reportData.key_findings.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm text-slate-700 mb-2">
                              Key Findings ({reportData.key_findings.length})
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {reportData.key_findings.slice(0, 3).map((finding, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {finding.category}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(report.generated_date).toLocaleDateString()}
                          </div>
                          <div>Generated by: {report.generated_by}</div>
                        </div>

                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            View Full Report
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Download className="w-3 h-3 mr-1" />
                            Export
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <CardTitle>Report Automation Schedule</CardTitle>
                <CardDescription>Configure automated report generation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-slate-600">
                  Configure automated report generation schedules here.
                  Reports can be generated weekly, monthly, or on-demand.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}