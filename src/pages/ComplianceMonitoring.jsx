import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, FileCheck, Download, RefreshCw } from 'lucide-react';
import ComplianceRiskMonitor from '@/components/compliance/ComplianceRiskMonitor';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ComplianceMonitoring() {
  const [activeTab, setActiveTab] = useState('overview');

  const { data: complianceReport, refetch, isLoading } = useQuery({
    queryKey: ['complianceAnalysis'],
    queryFn: async () => {
      const response = await base44.functions.invoke('analyzeNDISCompliance', {});
      return response.data;
    }
  });

  const issues = complianceReport?.issues || [];
  const recommendations = complianceReport?.recommendations || [];
  const summary = complianceReport?.summary;

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 border-red-300',
      high: 'bg-orange-100 text-orange-800 border-orange-300',
      medium: 'bg-amber-100 text-amber-800 border-amber-300',
      low: 'bg-slate-100 text-slate-800 border-slate-300'
    };
    return colors[severity] || colors.medium;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-teal-600" />
            NDIS Compliance Monitoring
          </h1>
          <p className="text-slate-600 mt-1">
            Proactive compliance risk identification and audit readiness
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Analysis
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ComplianceRiskMonitor onRefresh={refetch} />
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" size="sm">
              <FileCheck className="h-4 w-4 mr-2" />
              Generate Compliance Report
            </Button>
            <Button variant="outline" className="w-full justify-start" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Issues (CSV)
            </Button>
            <Link to={createPageUrl('ComplianceAuditCenter')}>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Shield className="h-4 w-4 mr-2" />
                Audit Preparation
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="issues">
            All Issues ({issues.length})
          </TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="categories">By Category</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {summary?.critical_issues > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Critical Compliance Issues Detected</AlertTitle>
              <AlertDescription>
                {summary.critical_issues} critical issue(s) require immediate attention to maintain NDIS compliance and service delivery standards.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Compliance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-slate-600">Plan Management</p>
                  <p className="text-2xl font-bold">{summary?.categories?.plan_management || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">BSP Compliance</p>
                  <p className="text-2xl font-bold">{summary?.categories?.bsp_compliance || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Worker Screening</p>
                  <p className="text-2xl font-bold">{summary?.categories?.worker_screening || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Documentation</p>
                  <p className="text-2xl font-bold">{summary?.categories?.documentation || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Service Agreements</p>
                  <p className="text-2xl font-bold">{summary?.categories?.service_agreements || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Incident Management</p>
                  <p className="text-2xl font-bold">{summary?.categories?.incident_management || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-3">
          {issues.map((issue, idx) => (
            <Card key={idx} className={`border-l-4 ${getSeverityColor(issue.severity)}`}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getSeverityColor(issue.severity)}>
                        {issue.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">{issue.category.replace(/_/g, ' ')}</Badge>
                    </div>
                    <h4 className="font-semibold">{issue.entity_name}</h4>
                    <p className="text-sm text-slate-700 mt-1">{issue.issue}</p>
                    <p className="text-sm font-medium text-slate-900 mt-2">
                      Required Action: {issue.required_action}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      Compliance Standard: {issue.compliance_standard}
                    </p>
                  </div>
                  {issue.entity_id && (
                    <Link to={`${createPageUrl('ClientDetail')}?clientId=${issue.entity_id}`}>
                      <Button size="sm" variant="outline">
                        View
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-3">
          {recommendations.map((rec, idx) => (
            <Card key={idx}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Badge className={
                    rec.priority === 'immediate' ? 'bg-red-100 text-red-800' :
                    rec.priority === 'urgent' ? 'bg-orange-100 text-orange-800' :
                    'bg-amber-100 text-amber-800'
                  }>
                    {rec.priority}
                  </Badge>
                  <div className="flex-1">
                    <p className="font-medium">{rec.action}</p>
                    <p className="text-sm text-slate-600 mt-1">Impact: {rec.impact}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="categories" className="space-y-3">
          {Object.entries(summary?.categories || {}).map(([category, count]) => (
            count > 0 && (
              <Card key={category}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base capitalize">
                      {category.replace(/_/g, ' ')}
                    </CardTitle>
                    <Badge>{count} issue{count !== 1 ? 's' : ''}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {issues
                      .filter(i => i.category === category || i.category?.includes(category))
                      .map((issue, idx) => (
                        <div key={idx} className="text-sm p-2 bg-slate-50 rounded">
                          <p className="font-medium">{issue.entity_name}</p>
                          <p className="text-slate-600">{issue.issue}</p>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}