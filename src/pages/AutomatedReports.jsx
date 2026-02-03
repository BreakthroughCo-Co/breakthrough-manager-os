import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Calendar, TrendingUp, AlertCircle, CheckCircle, Loader2, Download, Brain, BarChart3 } from 'lucide-react';
import EmergingRisksWidget from '../components/reports/EmergingRisksWidget';

export default function AutomatedReports() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [incidentAnalysis, setIncidentAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [predictiveReport, setPredictiveReport] = useState(null);
  const [isGeneratingPredictive, setIsGeneratingPredictive] = useState(false);

  const { data: savedReports, isLoading } = useQuery({
    queryKey: ['savedReports'],
    queryFn: () => base44.entities.SavedReport.list('-generated_date', 50),
    initialData: [],
  });

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const response = await base44.functions.invoke('autoGenerateComplianceReport', {});
      
      // Download the PDF
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Compliance_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      alert('Compliance report generated and downloaded successfully!');
    } catch (error) {
      alert('Failed to generate report: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnalyzeIncidents = async () => {
    setIsAnalyzing(true);
    try {
      const result = await base44.functions.invoke('analyzeIncidentTrends', {
        time_period: 90
      });
      setIncidentAnalysis(result.data);
    } catch (error) {
      alert('Failed to analyze incidents: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGeneratePredictive = async () => {
    setIsGeneratingPredictive(true);
    try {
      const result = await base44.functions.invoke('generatePredictiveRiskReport', {});
      setPredictiveReport(result.data);
    } catch (error) {
      alert('Failed to generate predictive report: ' + error.message);
    } finally {
      setIsGeneratingPredictive(false);
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
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
            <TabsTrigger value="predictive">Predictive Risks</TabsTrigger>
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

          <TabsContent value="insights" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold">Incident & Compliance Trends</h3>
                <p className="text-sm text-slate-600">AI-powered analysis of patterns and risks</p>
              </div>
              <Button
                onClick={handleAnalyzeIncidents}
                disabled={isAnalyzing}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Analyze Trends
                  </>
                )}
              </Button>
            </div>

            {incidentAnalysis && (
              <div className="space-y-4">
                <Alert>
                  <BarChart3 className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Analysis Summary:</strong> {incidentAnalysis.analysis.summary}
                  </AlertDescription>
                </Alert>

                {incidentAnalysis.analysis.key_trends?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Key Trends Identified</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {incidentAnalysis.analysis.key_trends.map((trend, idx) => (
                        <div key={idx} className="border-l-4 border-l-purple-400 pl-4 py-2">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={
                              trend.impact === 'high' ? 'destructive' :
                              trend.impact === 'medium' ? 'default' : 'secondary'
                            }>
                              {trend.impact} impact
                            </Badge>
                          </div>
                          <p className="font-medium text-sm">{trend.trend}</p>
                          <p className="text-xs text-slate-600 mt-1">
                            <span className="font-medium">Action:</span> {trend.recommendation}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {incidentAnalysis.analysis.incident_patterns && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Incident Patterns</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {incidentAnalysis.analysis.incident_patterns.most_common_categories?.slice(0, 5).map((cat, idx) => (
                          <div key={idx} className="flex items-center justify-between py-2 border-b">
                            <span className="text-sm font-medium">{cat.category}</span>
                            <Badge variant="outline">{cat.count} incidents</Badge>
                          </div>
                        ))}
                      </div>
                      {incidentAnalysis.analysis.incident_patterns.temporal_patterns && (
                        <div className="mt-4 p-3 bg-slate-50 rounded">
                          <p className="text-xs font-medium text-slate-700">Temporal Patterns:</p>
                          <p className="text-sm text-slate-600 mt-1">
                            {incidentAnalysis.analysis.incident_patterns.temporal_patterns}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {incidentAnalysis.analysis.recommendations?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>AI Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {incidentAnalysis.analysis.recommendations.map((rec, idx) => (
                        <div key={idx} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={
                              rec.priority === 'urgent' ? 'destructive' :
                              rec.priority === 'high' ? 'default' : 'secondary'
                            }>
                              {rec.priority}
                            </Badge>
                          </div>
                          <p className="font-medium text-sm text-blue-900">{rec.action}</p>
                          <p className="text-xs text-blue-700 mt-1">{rec.rationale}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {!incidentAnalysis && !isAnalyzing && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Brain className="w-12 h-12 mx-auto text-purple-400 mb-4" />
                  <p className="text-slate-600">
                    Click "Analyze Trends" to generate AI-powered insights on incident patterns and compliance risks
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="predictive" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold">Predictive Risk Analysis</h3>
                <p className="text-sm text-slate-600">AI forecasting of potential future issues</p>
              </div>
              <Button
                onClick={handleGeneratePredictive}
                disabled={isGeneratingPredictive}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isGeneratingPredictive ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Generate Forecast
                  </>
                )}
              </Button>
            </div>

            {predictiveReport && (
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Executive Summary:</strong> {predictiveReport.prediction.executive_summary}
                  </AlertDescription>
                </Alert>

                {predictiveReport.prediction.emerging_risks?.length > 0 && (
                  <EmergingRisksWidget risks={predictiveReport.prediction.emerging_risks} />
                )}

                {predictiveReport.prediction.proactive_interventions?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Proactive Interventions</CardTitle>
                      <CardDescription>Recommended actions to prevent future issues</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {predictiveReport.prediction.proactive_interventions.map((intervention, idx) => (
                        <div key={idx} className="border border-green-200 bg-green-50 rounded-lg p-3">
                          <h4 className="font-semibold text-sm text-green-900 mb-2">{intervention.area}</h4>
                          <div className="space-y-1 text-xs">
                            <p><span className="font-medium">Current Trend:</span> {intervention.current_trend}</p>
                            <p><span className="font-medium">Intervention:</span> {intervention.intervention}</p>
                            <p><span className="font-medium">Expected Outcome:</span> {intervention.expected_outcome}</p>
                            <p><span className="font-medium">Timeline:</span> {intervention.timeline}</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {predictiveReport.prediction.early_warning_signals?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Early Warning Signals</CardTitle>
                      <CardDescription>Metrics to monitor proactively</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {predictiveReport.prediction.early_warning_signals.map((signal, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-2 border-l-2 border-l-amber-400">
                          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{signal.signal}</p>
                            <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                              <p>Monitor: {signal.frequency}</p>
                              <p>Threshold: {signal.threshold}</p>
                              <p>Escalate to: {signal.escalation_path}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Analysis Metadata</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-slate-600 space-y-1">
                    <p><span className="font-medium">Confidence Level:</span> {predictiveReport.prediction.confidence_level}</p>
                    {predictiveReport.prediction.analysis_limitations?.length > 0 && (
                      <div>
                        <p className="font-medium">Limitations:</p>
                        <ul className="list-disc list-inside ml-2">
                          {predictiveReport.prediction.analysis_limitations.map((lim, idx) => (
                            <li key={idx}>{lim}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {!predictiveReport && !isGeneratingPredictive && (
              <Card>
                <CardContent className="py-12 text-center">
                  <TrendingUp className="w-12 h-12 mx-auto text-orange-400 mb-4" />
                  <p className="text-slate-600">
                    Generate a predictive risk forecast to identify potential future issues and proactive interventions
                  </p>
                </CardContent>
              </Card>
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