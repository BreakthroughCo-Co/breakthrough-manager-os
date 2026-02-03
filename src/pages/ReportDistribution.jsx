import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import DistributionRuleConfig from '@/components/reports/DistributionRuleConfig';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertCircle, Mail } from 'lucide-react';
import { format } from 'date-fns';

export default function ReportDistribution() {
  const { data: distributionLogs } = useQuery({
    queryKey: ['distributionLogs'],
    queryFn: async () => {
      const data = await base44.entities.DistributionLog.list();
      return data?.sort((a, b) => new Date(b.sent_date) - new Date(a.sent_date)) || [];
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Report Distribution</h1>
        <p className="text-slate-600 mt-2">Configure automated report distribution and review delivery logs</p>
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700">
          Automatically distribute monthly reports to pre-defined recipients based on report type and status. Configure rules for immediate or scheduled delivery.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="rules" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Distribution Rules
          </TabsTrigger>
          <TabsTrigger value="logs">Delivery Logs</TabsTrigger>
        </TabsList>

        {/* Rules Config */}
        <TabsContent value="rules" className="space-y-4 mt-4">
          <DistributionRuleConfig />
        </TabsContent>

        {/* Delivery Logs */}
        <TabsContent value="logs" className="space-y-4 mt-4">
          {distributionLogs && distributionLogs.length > 0 ? (
            <div className="space-y-2">
              {distributionLogs.map(log => (
                <Card key={log.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{log.report_type.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-slate-600 mt-1">
                          Period: {log.report_period} • Sent: {format(new Date(log.sent_date), 'PPP')}
                        </p>
                        <p className="text-xs text-slate-600">
                          Via: {log.distribution_rule_name} • Recipients: {log.recipient_count}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold">{log.status}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12 text-slate-500">
                <p>No distribution logs yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}