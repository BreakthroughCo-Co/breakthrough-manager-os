import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, TrendingUp } from 'lucide-react';
import CustomReportBuilder from '@/components/reports/CustomReportBuilder';
import ComplianceRiskMonitor from '@/components/compliance/ComplianceRiskMonitor';
import PlanExpiryAlertsWidget from '@/components/dashboard/PlanExpiryAlertsWidget';
import ClientRiskAlertsWidget from '@/components/dashboard/ClientRiskAlertsWidget';
import ScheduledReportManager from '@/components/reports/ScheduledReportManager';

export default function AdvancedReporting() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8 text-teal-600" />
          Advanced Reporting & Analytics
        </h1>
        <p className="text-slate-600 mt-1">
          Custom reports, KPI dashboards, and data export capabilities
        </p>
      </div>

      <Tabs defaultValue="builder">
        <TabsList>
          <TabsTrigger value="builder">Report Builder</TabsTrigger>
          <TabsTrigger value="dashboards">KPI Dashboards</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-6">
          <ScheduledReportManager />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <CustomReportBuilder />
            </div>
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Report Templates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="p-2 border rounded text-sm hover:bg-slate-50 cursor-pointer">
                    Monthly Performance Summary
                  </div>
                  <div className="p-2 border rounded text-sm hover:bg-slate-50 cursor-pointer">
                    Quarterly Compliance Audit
                  </div>
                  <div className="p-2 border rounded text-sm hover:bg-slate-50 cursor-pointer">
                    Client Progress Report
                  </div>
                  <div className="p-2 border rounded text-sm hover:bg-slate-50 cursor-pointer">
                    Funding Utilization Analysis
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="dashboards" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PlanExpiryAlertsWidget />
            <ClientRiskAlertsWidget />
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <ComplianceRiskMonitor />
        </TabsContent>
      </Tabs>
    </div>
  );
}