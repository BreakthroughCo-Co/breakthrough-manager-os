import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, FileText, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function ReportRequestPanel() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [reportType, setReportType] = useState('practitioner_performance');
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: existingReports, refetch } = useQuery({
    queryKey: ['monthlyReports'],
    queryFn: async () => {
      const reports = await base44.entities.MonthlyPerformanceReport.list();
      return reports?.sort((a, b) => new Date(b.generated_date) - new Date(a.generated_date)) || [];
    }
  });

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const result = await base44.functions.invoke('generateMonthlyPerformanceReport', {
        report_type: reportType,
        report_month: selectedMonth
      });
      refetch();
      alert('Report generated successfully');
    } catch (err) {
      alert('Error generating report: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const reportTypeLabels = {
    practitioner_performance: 'Practitioner Performance',
    compliance_summary: 'Compliance Summary',
    clinical_effectiveness: 'Clinical Effectiveness',
    financial_operations: 'Financial Operations'
  };

  const statusColors = {
    draft: 'bg-slate-100 text-slate-800',
    reviewed: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    archived: 'bg-gray-100 text-gray-800'
  };

  const reportsThisMonth = existingReports?.filter(r => r.report_period_month === selectedMonth) || [];

  return (
    <div className="space-y-6">
      {/* Generate Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate New Report
          </CardTitle>
          <CardDescription>
            Create monthly performance and compliance reports
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Report Month</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="practitioner_performance">Practitioner Performance</SelectItem>
                  <SelectItem value="compliance_summary">Compliance Summary</SelectItem>
                  <SelectItem value="clinical_effectiveness">Clinical Effectiveness</SelectItem>
                  <SelectItem value="financial_operations">Financial Operations</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Alert className="border-blue-200 bg-blue-50">
            <FileText className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700 text-sm">
              This will synthesize data from sessions, practitioner development, compliance items, and risk profiles to create a comprehensive report.
            </AlertDescription>
          </Alert>

          <Button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating report...
              </>
            ) : (
              'Generate Report'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report History</CardTitle>
          <CardDescription>
            View and manage generated reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          {existingReports && existingReports.length > 0 ? (
            <div className="space-y-2">
              {existingReports.map(report => (
                <div key={report.id} className="border rounded-lg p-4 space-y-2 hover:bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{reportTypeLabels[report.report_type]}</p>
                      <p className="text-xs text-slate-600">
                        {format(new Date(report.generated_date), 'PPP')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusColors[report.status]}>
                        {report.status}
                      </Badge>
                    </div>
                  </div>

                  {report.executive_summary && (
                    <p className="text-xs text-slate-700 line-clamp-2">
                      {report.executive_summary}
                    </p>
                  )}

                  <div className="flex gap-2 text-xs">
                    <Button size="sm" variant="outline">View Report</Button>
                    {report.status === 'draft' && (
                      <Button size="sm" variant="outline" className="text-blue-600">Review & Approve</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600 text-center py-8">
              No reports generated yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}