import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2, Calendar, FileText, Users, AlertTriangle, TrendingUp, CheckCircle } from 'lucide-react';

export default function AIOperations() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [schedulingParams, setSchedulingParams] = useState({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    consider_travel: true,
  });
  const [complianceParams, setComplianceParams] = useState({
    template_type: 'quarterly_review',
    date_range_months: 3,
  });

  const handleGenerateScheduling = async () => {
    setIsGenerating(true);
    try {
      const response = await base44.functions.invoke('optimizeStaffScheduling', schedulingParams);
      setResult({ type: 'scheduling', data: response.data });
    } catch (error) {
      alert('Failed to generate scheduling: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateCompliance = async () => {
    setIsGenerating(true);
    try {
      const response = await base44.functions.invoke('generateComplianceReport', complianceParams);
      setResult({ type: 'compliance', data: response.data });
    } catch (error) {
      alert('Failed to generate compliance report: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Operations Center</h1>
        <p className="text-muted-foreground">Automate operations, scheduling, and compliance reporting</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">AI Powered</p>
                <p className="text-xs text-muted-foreground">Operations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">Automated</p>
                <p className="text-xs text-muted-foreground">Optimization</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">Compliance</p>
                <p className="text-xs text-muted-foreground">Reporting</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="scheduling" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scheduling">Staff Scheduling</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Reports</TabsTrigger>
          <TabsTrigger value="summaries">Auto Summaries</TabsTrigger>
        </TabsList>

        <TabsContent value="scheduling" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI-Powered Staff Scheduling Optimization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={schedulingParams.start_date}
                    onChange={(e) => setSchedulingParams({...schedulingParams, start_date: e.target.value})}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={schedulingParams.end_date}
                    onChange={(e) => setSchedulingParams({...schedulingParams, end_date: e.target.value})}
                  />
                </div>
              </div>
              <Button
                onClick={handleGenerateScheduling}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Optimizing...</>
                ) : (
                  <><Calendar className="w-4 h-4 mr-2" />Generate Optimized Schedule</>
                )}
              </Button>

              {result?.type === 'scheduling' && (
                <div className="space-y-4 mt-6">
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="pt-6 space-y-3">
                      <h4 className="font-semibold text-blue-900">Workload Rebalancing</h4>
                      {result.data.optimization.workload_rebalancing.map((item, idx) => (
                        <div key={idx} className="p-3 bg-white rounded border border-blue-200">
                          <p className="text-sm font-medium">
                            From: {item.from_practitioner} → To: {item.to_practitioner}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{item.rationale}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.clients_to_reassign.map((client, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{client}</Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Scheduling Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {result.data.optimization.scheduling_recommendations.map((rec, idx) => (
                          <div key={idx} className="border-l-4 border-l-teal-500 pl-3 py-2">
                            <p className="font-medium text-sm">{rec.practitioner}</p>
                            <p className="text-xs text-muted-foreground">
                              Optimal Days: {rec.optimal_days.join(', ')}
                            </p>
                            {rec.travel_considerations && (
                              <p className="text-xs text-blue-600 mt-1">🚗 {rec.travel_considerations}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="pt-6">
                      <h4 className="font-semibold text-green-900 mb-3">Efficiency Gains</h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <p className="text-xs text-green-700">Utilization</p>
                          <p className="font-medium text-green-900">
                            {result.data.optimization.efficiency_gains.projected_utilization_improvement}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-green-700">Travel Time</p>
                          <p className="font-medium text-green-900">
                            {result.data.optimization.efficiency_gains.travel_time_reduction}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-green-700">Balance Score</p>
                          <p className="font-medium text-green-900">
                            {result.data.optimization.efficiency_gains.workload_balance_score}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Automated Compliance Report Generation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Report Template</Label>
                  <Select
                    value={complianceParams.template_type}
                    onValueChange={(v) => setComplianceParams({...complianceParams, template_type: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quarterly_review">Quarterly Review</SelectItem>
                      <SelectItem value="ndis_submission">NDIS Submission</SelectItem>
                      <SelectItem value="internal_audit">Internal Audit</SelectItem>
                      <SelectItem value="annual_report">Annual Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date Range (Months)</Label>
                  <Select
                    value={complianceParams.date_range_months.toString()}
                    onValueChange={(v) => setComplianceParams({...complianceParams, date_range_months: parseInt(v)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Last Month</SelectItem>
                      <SelectItem value="3">Last 3 Months</SelectItem>
                      <SelectItem value="6">Last 6 Months</SelectItem>
                      <SelectItem value="12">Last Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={handleGenerateCompliance}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating Report...</>
                ) : (
                  <><FileText className="w-4 h-4 mr-2" />Generate Compliance Report</>
                )}
              </Button>

              {result?.type === 'compliance' && (
                <div className="space-y-4 mt-6">
                  <Card className="border-purple-200 bg-purple-50">
                    <CardContent className="pt-6">
                      <h4 className="font-semibold text-purple-900 mb-2">Executive Summary</h4>
                      <p className="text-sm text-purple-800">{result.data.report.executive_summary}</p>
                      <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-purple-200">
                        {Object.entries(result.data.metadata.metrics).map(([key, value]) => (
                          <div key={key}>
                            <p className="text-xs text-purple-700 capitalize">{key.replace(/_/g, ' ')}</p>
                            <p className="text-lg font-bold text-purple-900">{value}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Tabs defaultValue="incidents" className="space-y-4">
                    <TabsList>
                      <TabsTrigger value="incidents">Incidents</TabsTrigger>
                      <TabsTrigger value="compliance">Compliance</TabsTrigger>
                      <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                    </TabsList>

                    <TabsContent value="incidents">
                      <Card>
                        <CardContent className="pt-6 space-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Overview</p>
                            <p className="text-sm">{result.data.report.incident_analysis.overview}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Trends</p>
                            <ul className="space-y-1">
                              {result.data.report.incident_analysis.trends.map((trend, i) => (
                                <li key={i} className="text-sm">• {trend}</li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="compliance">
                      <Card>
                        <CardContent className="pt-6 space-y-3">
                          <div className="flex items-center justify-between mb-3">
                            <p className="font-medium">Overall Rating</p>
                            <Badge variant="default">{result.data.report.compliance_status.overall_rating}</Badge>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Areas of Concern</p>
                            <ul className="space-y-1">
                              {result.data.report.compliance_status.areas_of_concern.map((concern, i) => (
                                <li key={i} className="text-sm text-orange-600">• {concern}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Strengths</p>
                            <ul className="space-y-1">
                              {result.data.report.compliance_status.strengths.map((strength, i) => (
                                <li key={i} className="text-sm text-green-600">• {strength}</li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="recommendations">
                      <div className="space-y-2">
                        {result.data.report.recommendations.map((rec, idx) => (
                          <Card key={idx}>
                            <CardContent className="pt-6">
                              <div className="flex items-start justify-between mb-2">
                                <p className="font-medium text-sm">{rec.area}</p>
                                <Badge variant={rec.priority === 'high' ? 'destructive' : 'outline'}>
                                  {rec.priority}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{rec.recommendation}</p>
                              <p className="text-xs text-blue-600 mt-2">Timeline: {rec.timeframe}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summaries">
          <Card>
            <CardHeader>
              <CardTitle>Automatic Case Note & Incident Summaries</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                AI automatically generates summaries when case notes and incidents are created. 
                Summaries appear in the ai_summary field and save staff time on documentation.
              </p>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>How it works:</strong> When staff complete case notes, AI analyzes the SOAP format 
                  and generates a concise professional summary highlighting key points and progress indicators. 
                  For incidents, AI creates risk assessments and identifies follow-up needs.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}