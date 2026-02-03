import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ReportRequestPanel from '@/components/reports/ReportRequestPanel';
import { FileText, AlertCircle } from 'lucide-react';

export default function Reports() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Reports & Analytics</h1>
        <p className="text-slate-600 mt-2">AI-generated monthly performance and compliance reports</p>
      </div>

      {/* Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700">
          Monthly reports synthesize session data, practitioner development metrics, compliance status, and risk assessments to provide comprehensive organizational oversight.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="request" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="request" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Generate Report
          </TabsTrigger>
          <TabsTrigger value="templates">Report Templates</TabsTrigger>
        </TabsList>

        {/* Generate Report Tab */}
        <TabsContent value="request" className="space-y-4 mt-4">
          <ReportRequestPanel />
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 gap-4">
            {[
              {
                type: 'practitioner_performance',
                title: 'Practitioner Performance Report',
                description: 'Session metrics, billable hours, client engagement, training completion',
                sections: ['Key Metrics', 'Top Performers', 'Areas of Concern', 'Development Progress']
              },
              {
                type: 'compliance_summary',
                title: 'Compliance Summary Report',
                description: 'Compliance status, audit readiness, critical findings, remediation tracking',
                sections: ['Compliance Status', 'Critical Items', 'Audit Readiness', 'Recommendations']
              },
              {
                type: 'clinical_effectiveness',
                title: 'Clinical Effectiveness Report',
                description: 'Client outcomes, goal progress, intervention effectiveness, risk assessment',
                sections: ['Client Outcomes', 'Goal Progress', 'Risk Assessment', 'Recommendations']
              },
              {
                type: 'financial_operations',
                title: 'Financial Operations Report',
                description: 'Revenue, billing accuracy, practitioner utilization, financial metrics',
                sections: ['Revenue Overview', 'Billing Accuracy', 'Utilization Metrics', 'Financial Outlook']
              }
            ].map(template => (
              <Card key={template.type} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-base">{template.title}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-2">Report Sections</p>
                    <div className="flex flex-wrap gap-2">
                      {template.sections.map((section, idx) => (
                        <span key={idx} className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                          {section}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}