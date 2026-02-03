import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, FileText } from 'lucide-react';

export default function ClientProgressReports() {
  const [selectedClient, setSelectedClient] = useState(null);
  const [stakeholderType, setStakeholderType] = useState('internal');
  const [reportingMonths, setReportingMonths] = useState('6');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState(null);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list()
  });

  const { data: savedReports = [] } = useQuery({
    queryKey: ['savedReports'],
    queryFn: () => base44.entities.SavedReport.filter({ report_type: 'client_progress' })
  });

  const handleGenerateReport = async () => {
    if (!selectedClient) {
      alert('Please select a client');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await base44.functions.invoke('generateNDISProgressReport', {
        client_id: selectedClient,
        reporting_period_months: parseInt(reportingMonths),
        stakeholder_type: stakeholderType
      });
      setGeneratedReport(result.data);
    } catch (error) {
      alert('Failed to generate report: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedClientData = clients.find(c => c.id === selectedClient);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">NDIS Client Progress Reports</h1>
        <p className="text-muted-foreground mt-1">AI-generated progress reports tailored for different stakeholders</p>
      </div>

      {/* Report Generator */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Progress Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Client</label>
            <Select value={selectedClient || ''} onValueChange={setSelectedClient}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select client..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Reporting Period (Months)</label>
              <Select value={reportingMonths} onValueChange={setReportingMonths}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 Months</SelectItem>
                  <SelectItem value="6">6 Months</SelectItem>
                  <SelectItem value="12">12 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Stakeholder Type</label>
              <Select value={stakeholderType} onValueChange={setStakeholderType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ndis">NDIS</SelectItem>
                  <SelectItem value="client">Client/Family</SelectItem>
                  <SelectItem value="internal">Internal Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={handleGenerateReport}
            disabled={isGenerating || !selectedClient}
            className="w-full bg-teal-600 hover:bg-teal-700"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
            Generate Report
          </Button>
        </CardContent>
      </Card>

      {/* Generated Report */}
      {generatedReport && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{generatedReport.client_name} - Progress Report</CardTitle>
              <Badge>{generatedReport.stakeholder_type}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {generatedReport.reporting_period_months}-month report | {generatedReport.analysis_date}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Executive Summary */}
            {generatedReport.report_content.executive_summary && (
              <div>
                <h3 className="font-semibold mb-2">Executive Summary</h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {generatedReport.report_content.executive_summary}
                </p>
              </div>
            )}

            {/* Domain Progress */}
            {generatedReport.report_content.domain_progress && (
              <div>
                <h3 className="font-semibold mb-3">Progress by NDIS Domain</h3>
                <div className="space-y-3">
                  {Object.entries(generatedReport.report_content.domain_progress).map(([domain, data]) => (
                    <div key={domain} className="p-3 border rounded">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{domain}</h4>
                        <span className="text-sm font-bold text-teal-600">{data.avg_progress}%</span>
                      </div>
                      <p className="text-xs text-slate-600 mb-2">Status: {data.status}</p>
                      {data.key_achievements?.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-emerald-700">Achievements:</p>
                          <ul className="text-xs text-slate-600 list-disc list-inside">
                            {data.key_achievements.slice(0, 2).map((achievement, idx) => (
                              <li key={idx}>{achievement}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Highlights */}
            {generatedReport.report_content.progress_highlights?.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Key Achievements</h3>
                <ul className="space-y-1">
                  {generatedReport.report_content.progress_highlights.map((highlight, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <span className="text-emerald-600 mt-1">✓</span>
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Areas of Concern */}
            {generatedReport.report_content.areas_of_concern?.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Areas for Focus</h3>
                <ul className="space-y-1">
                  {generatedReport.report_content.areas_of_concern.map((concern, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <span className="text-amber-600 mt-1">→</span>
                      <span>{concern}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Future Strategy */}
            {generatedReport.report_content.future_strategy && (
              <div>
                <h3 className="font-semibold mb-2">Next Steps (3-6 Months)</h3>
                <div className="space-y-2 text-sm text-slate-700">
                  <p><strong>Focus Areas:</strong> {generatedReport.report_content.future_strategy.focus_areas?.join(', ')}</p>
                  <p><strong>Recommended Intensity:</strong> {generatedReport.report_content.future_strategy.intensity_frequency}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Saved Reports */}
      {savedReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Previous Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {savedReports.slice(0, 10).map(report => (
                <div key={report.id} className="p-3 border rounded flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{report.report_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {report.reporting_period_months}m report • {new Date(report.created_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline">{report.stakeholder_type}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}