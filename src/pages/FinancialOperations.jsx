import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, DollarSign, TrendingUp } from 'lucide-react';

export default function FinancialOperations() {
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateReport = async () => {
    setIsLoading(true);
    try {
      const result = await base44.functions.invoke('generateFinancialReports', {
        report_type: 'monthly'
      });
      setReport(result.data);
    } catch (error) {
      alert('Failed to generate report: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-teal-600 mr-2" />
          Generating financial report...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Financial Operations</h1>
          <p className="text-muted-foreground mt-1">AI-powered revenue analysis and billing optimization</p>
        </div>
        <Button onClick={handleGenerateReport} className="bg-teal-600 hover:bg-teal-700">
          <RefreshCw className="w-4 h-4 mr-2" />
          Generate Report
        </Button>
      </div>

      {report && (
        <>
          {/* Summary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
                <p className="text-3xl font-bold">${(report.total_revenue / 1000).toFixed(1)}k</p>
                <p className="text-xs text-muted-foreground mt-2">{report.total_hours.toFixed(0)} hours</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">Avg Hourly Rate</p>
                <p className="text-3xl font-bold">${report.avg_hourly_rate.toFixed(0)}/h</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">Billing Records</p>
                <p className="text-3xl font-bold">{report.billing_records_count}</p>
              </CardContent>
            </Card>
            <Card className={report.anomalies_detected > 0 ? 'border-amber-200 bg-amber-50' : ''}>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">Anomalies Detected</p>
                <p className="text-3xl font-bold text-amber-600">{report.anomalies_detected}</p>
              </CardContent>
            </Card>
          </div>

          {/* Executive Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Executive Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-700">{report.analysis.executive_summary}</p>
            </CardContent>
          </Card>

          {/* Service Performance */}
          {report.analysis.service_analysis?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Service Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.analysis.service_analysis.map((service, idx) => (
                  <div key={idx} className="p-3 border rounded">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-sm">{service.service_type}</h4>
                      <Badge variant="outline">{service.performance}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <div>Revenue: {service.revenue}</div>
                      <div>Utilization: {service.utilization}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Optimization Opportunities */}
          {report.analysis.optimization_opportunities?.length > 0 && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardHeader>
                <CardTitle className="text-emerald-900">💡 Optimization Opportunities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.analysis.optimization_opportunities.map((opp, idx) => (
                  <div key={idx} className="p-3 bg-white rounded border border-emerald-200">
                    <h4 className="font-semibold text-sm text-emerald-900">{opp.opportunity}</h4>
                    <p className="text-xs text-emerald-800 mt-1">Impact: {opp.potential_impact}</p>
                    <Badge className="mt-2 bg-emerald-600">{opp.priority}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Billing Efficiency */}
          {report.analysis.billing_efficiency && (
            <Card>
              <CardHeader>
                <CardTitle>Billing Efficiency Review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-slate-50 rounded">
                  <p className="text-sm font-semibold mb-1">Accuracy Assessment</p>
                  <p className="text-sm text-slate-700">{report.analysis.billing_efficiency.accuracy_assessment}</p>
                </div>
                {report.analysis.billing_efficiency.quality_issues?.length > 0 && (
                  <div className="p-3 bg-amber-50 rounded">
                    <p className="text-sm font-semibold mb-2 text-amber-900">Quality Issues Detected</p>
                    <ul className="text-sm text-amber-800 space-y-1">
                      {report.analysis.billing_efficiency.quality_issues.map((issue, idx) => (
                        <li key={idx}>• {issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Items */}
          {report.analysis.action_items?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Action Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.analysis.action_items.map((item, idx) => (
                  <div key={idx} className="p-3 border rounded">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-semibold text-sm">{item.action}</h4>
                      <Badge className={
                        item.priority === 'critical' ? 'bg-red-600' :
                        item.priority === 'high' ? 'bg-amber-600' :
                        'bg-blue-600'
                      }>
                        {item.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600">Expected: {item.expected_outcome}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Forecast */}
          {report.analysis.revenue_forecast && (
            <Card className="border-teal-200 bg-teal-50">
              <CardHeader>
                <CardTitle className="text-teal-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  90-Day Revenue Forecast
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-teal-900">
                <p><strong>Projection:</strong> {report.analysis.revenue_forecast.ninety_day_projection}</p>
                <p><strong>Plan Renewal Impact:</strong> {report.analysis.revenue_forecast.plan_renewal_impact}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}