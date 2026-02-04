import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ServiceReports() {
  const [reportConfig, setReportConfig] = useState({
    client_id: '',
    report_period_start: '',
    report_period_end: '',
    report_type: 'comprehensive'
  });
  const [generatedReport, setGeneratedReport] = useState(null);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list()
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generateServiceDeliveryReport', reportConfig);
      return response.data;
    },
    onSuccess: (data) => {
      setGeneratedReport(data.report);
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8 text-teal-600" />
          Service Delivery Reports
        </h1>
        <p className="text-slate-600 mt-1">
          AI-automated client service reports for stakeholders
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generate Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            value={reportConfig.client_id}
            onValueChange={(value) => setReportConfig({ ...reportConfig, client_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.full_name} - {client.ndis_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Period Start</label>
              <Input
                type="date"
                value={reportConfig.report_period_start}
                onChange={(e) => setReportConfig({ ...reportConfig, report_period_start: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Period End</label>
              <Input
                type="date"
                value={reportConfig.report_period_end}
                onChange={(e) => setReportConfig({ ...reportConfig, report_period_end: e.target.value })}
              />
            </div>
          </div>

          <Select
            value={reportConfig.report_type}
            onValueChange={(value) => setReportConfig({ ...reportConfig, report_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="comprehensive">Comprehensive Report</SelectItem>
              <SelectItem value="ndis_commission">NDIS Commission Format</SelectItem>
              <SelectItem value="management">Internal Management Review</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={() => generateMutation.mutate()}
            disabled={!reportConfig.client_id || !reportConfig.report_period_start || generateMutation.isPending}
            className="w-full"
          >
            {generateMutation.isPending ? 'Generating Report...' : 'Generate Report'}
          </Button>
        </CardContent>
      </Card>

      {generatedReport && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Generated Report</CardTitle>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="summary">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="metrics">Metrics</TabsTrigger>
                <TabsTrigger value="goals">Goals</TabsTrigger>
                <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-4">
                <div className="p-4 bg-slate-50 rounded">
                  <h3 className="font-semibold mb-2">Executive Summary</h3>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{generatedReport.executive_summary}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded">
                  <h3 className="font-semibold mb-2">Progress Narrative</h3>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{generatedReport.progress_narrative}</p>
                </div>
              </TabsContent>

              <TabsContent value="metrics" className="space-y-4">
                {generatedReport.service_delivery_metrics && (
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(generatedReport.service_delivery_metrics).map(([key, value]) => (
                      <Card key={key}>
                        <CardContent className="pt-6">
                          <p className="text-xs text-slate-600 mb-1">{key.replace(/_/g, ' ')}</p>
                          <p className="text-2xl font-bold">{value}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="goals" className="space-y-3">
                {generatedReport.goal_attainment_summary?.map((goal, idx) => (
                  <Card key={idx}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">{goal.goal}</h3>
                        <span className="text-2xl font-bold text-teal-600">{goal.progress_percentage}%</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div>
                          <p className="font-medium">Achievements:</p>
                          <p className="text-slate-700">{goal.achievements}</p>
                        </div>
                        {goal.barriers && (
                          <div>
                            <p className="font-medium">Barriers:</p>
                            <p className="text-slate-700">{goal.barriers}</p>
                          </div>
                        )}
                        <div>
                          <p className="font-medium">Next Steps:</p>
                          <p className="text-blue-700">{goal.next_steps}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="recommendations" className="space-y-3">
                <ul className="space-y-2">
                  {generatedReport.recommendations?.map((rec, idx) => (
                    <li key={idx} className="p-3 bg-blue-50 rounded text-sm">
                      {idx + 1}. {rec}
                    </li>
                  ))}
                </ul>
                {generatedReport.compliance_notes && (
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="pt-6">
                      <h3 className="font-semibold mb-2">Compliance Status</h3>
                      <div className="text-sm space-y-1">
                        <p><strong>Standards Met:</strong> {generatedReport.compliance_notes.ndis_standards_met?.join(', ')}</p>
                        <p><strong>Documentation:</strong> {generatedReport.compliance_notes.documentation_status}</p>
                        <p><strong>Plan Review:</strong> {generatedReport.compliance_notes.plan_review_status}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}