import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import ComplianceAlertCenter from '@/components/compliance/ComplianceAlertCenter';
import AlertThresholdSettings from '@/components/compliance/AlertThresholdSettings';
import ComplianceTrendAnalysis from '@/components/compliance/ComplianceTrendAnalysis';
import { FileText, Settings, TrendingUp, AlertCircle } from 'lucide-react';

export default function ComplianceCenter() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Compliance Center</h1>
        <p className="text-slate-600 mt-2">Monitor alerts, configure thresholds, and analyze compliance trends</p>
      </div>

      <Tabs defaultValue="alerts" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Active Alerts
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Threshold Settings
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Trend Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4 mt-4">
          <ComplianceAlertCenter />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 mt-4">
          <AlertThresholdSettings />
        </TabsContent>

        <TabsContent value="trends" className="space-y-4 mt-4">
          <ComplianceTrendAnalysis />
        </TabsContent>
      </Tabs>
    </div>
  );
}