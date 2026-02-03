import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Bell, TrendingUp, Calendar, DollarSign, CheckCircle2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ComplianceAlertCenter() {
  const [alertFilter, setAlertFilter] = useState('all');

  const { data: alertsData, isLoading, refetch } = useQuery({
    queryKey: ['complianceThresholds'],
    queryFn: async () => {
      const res = await base44.functions.invoke('checkComplianceThresholds', {});
      return res.data;
    },
    staleTime: 1000 * 60 * 15 // 15 minutes
  });

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'high':
        return 'bg-orange-50 border-orange-200';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-red-600">Critical</Badge>;
      case 'high':
        return <Badge className="bg-orange-600">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-600">Medium</Badge>;
      default:
        return <Badge className="bg-blue-600">Info</Badge>;
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'compliance_breach':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'plan_expiry_warning':
        return <Calendar className="h-5 w-5 text-orange-600" />;
      case 'high_funding_utilization':
        return <DollarSign className="h-5 w-5 text-yellow-600" />;
      case 'goal_at_risk':
        return <TrendingUp className="h-5 w-5 text-yellow-600" />;
      default:
        return <Bell className="h-5 w-5 text-blue-600" />;
    }
  };

  const alerts = alertsData?.alerts || [];
  const filteredAlerts = alertFilter === 'all' 
    ? alerts 
    : alerts.filter(a => a.severity === alertFilter);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Compliance Alert Center
            </CardTitle>
            <CardDescription>
              Proactive monitoring of funding, goals, compliance, and plan expiry
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetch()}
          >
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-3">
          <Card className="bg-slate-50">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-600">Total Alerts</div>
              <div className="text-2xl font-bold">{alerts.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-6">
              <div className="text-sm text-red-600">Critical</div>
              <div className="text-2xl font-bold text-red-600">{alertsData?.alerts_by_severity?.critical || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="pt-6">
              <div className="text-sm text-orange-600">High</div>
              <div className="text-2xl font-bold text-orange-600">{alertsData?.alerts_by_severity?.high || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="pt-6">
              <div className="text-sm text-yellow-600">Medium</div>
              <div className="text-2xl font-bold text-yellow-600">{alertsData?.alerts_by_severity?.medium || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Critical Alerts Banner */}
        {alertsData?.alerts_by_severity?.critical > 0 && (
          <Alert className="border-red-300 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              <strong>{alertsData.alerts_by_severity.critical} critical alert(s) require immediate attention.</strong>
            </AlertDescription>
          </Alert>
        )}

        {/* Filter Tabs */}
        <Tabs value={alertFilter} onValueChange={setAlertFilter}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All ({alerts.length})</TabsTrigger>
            <TabsTrigger value="critical">Critical ({alerts.filter(a => a.severity === 'critical').length})</TabsTrigger>
            <TabsTrigger value="high">High ({alerts.filter(a => a.severity === 'high').length})</TabsTrigger>
            <TabsTrigger value="medium">Medium ({alerts.filter(a => a.severity === 'medium').length})</TabsTrigger>
          </TabsList>

          <TabsContent value={alertFilter} className="space-y-3 mt-4">
            {filteredAlerts.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-slate-500">
                <CheckCircle2 className="h-6 w-6 mr-2 text-green-600" />
                <span>No {alertFilter !== 'all' ? `${alertFilter}` : ''} alerts at this time</span>
              </div>
            ) : (
              filteredAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-start gap-3">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-slate-900">
                          {alert.type.replace(/_/g, ' ').toUpperCase()}
                        </h4>
                        {getSeverityBadge(alert.severity)}
                      </div>
                      <p className="text-sm text-slate-700">{alert.message}</p>
                      
                      {/* Details */}
                      {alert.details && (
                        <div className="mt-2 text-xs text-slate-600 space-y-1">
                          {Object.entries(alert.details).map(([key, value]) => (
                            <div key={key}>
                              <span className="font-semibold">{key.replace(/_/g, ' ')}:</span> {
                                typeof value === 'number' ? value.toFixed(1) : String(value)
                              }
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>

        <div className="text-xs text-slate-500 pt-2">
          Last checked: {alertsData?.check_date 
            ? new Date(alertsData.check_date).toLocaleString() 
            : 'Never'}
        </div>
      </CardContent>
    </Card>
  );
}