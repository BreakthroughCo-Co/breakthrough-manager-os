import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle, Clock, Sparkles, Play, Eye } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ProactiveAlertMonitor() {
    const [selectedAlert, setSelectedAlert] = useState(null);
    const queryClient = useQueryClient();

    const { data: alerts = [], isLoading } = useQuery({
        queryKey: ['proactiveAlerts'],
        queryFn: () => base44.entities.ProactiveAlert.filter({ status: 'active' }),
        refetchInterval: 60000 // Refresh every minute
    });

    const runMonitoringMutation = useMutation({
        mutationFn: () => base44.functions.invoke('monitorProactiveAlerts', {}),
        onSuccess: () => {
            queryClient.invalidateQueries(['proactiveAlerts']);
        }
    });

    const orchestrateWorkflowMutation = useMutation({
        mutationFn: (alert_id) => base44.functions.invoke('orchestrateWorkflow', { alert_id }),
        onSuccess: () => {
            queryClient.invalidateQueries(['proactiveAlerts']);
        }
    });

    const acknowledgeAlertMutation = useMutation({
        mutationFn: ({ alertId, status }) => 
            base44.entities.ProactiveAlert.update(alertId, { 
                status,
                acknowledged_by: 'current_user',
                acknowledged_date: new Date().toISOString()
            }),
        onSuccess: () => {
            queryClient.invalidateQueries(['proactiveAlerts']);
            setSelectedAlert(null);
        }
    });

    const severityColors = {
        critical: "bg-red-100 text-red-800 border-red-300",
        high: "bg-orange-100 text-orange-800 border-orange-300",
        medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
        low: "bg-blue-100 text-blue-800 border-blue-300"
    };

    const severityIcons = {
        critical: <AlertTriangle className="h-5 w-5 text-red-600" />,
        high: <AlertTriangle className="h-5 w-5 text-orange-600" />,
        medium: <Clock className="h-5 w-5 text-yellow-600" />,
        low: <Clock className="h-5 w-5 text-blue-600" />
    };

    const alertsByType = {
        critical: alerts.filter(a => a.severity === 'critical'),
        high: alerts.filter(a => a.severity === 'high'),
        medium: alerts.filter(a => a.severity === 'medium'),
        low: alerts.filter(a => a.severity === 'low')
    };

    if (isLoading) {
        return <div className="p-6">Loading proactive alerts...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Proactive Alert Monitor</h2>
                    <p className="text-sm text-gray-600">AI-powered early warnings for compliance and operational risks</p>
                </div>
                <Button 
                    onClick={() => runMonitoringMutation.mutate()}
                    disabled={runMonitoringMutation.isPending}
                    className="gap-2"
                >
                    <Sparkles className="h-4 w-4" />
                    {runMonitoringMutation.isPending ? 'Scanning...' : 'Run AI Scan'}
                </Button>
            </div>

            {runMonitoringMutation.isSuccess && (
                <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                        AI scan complete. Generated {runMonitoringMutation.data?.data?.alerts_generated || 0} new alerts.
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-red-200 bg-red-50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-red-800">Critical</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-900">{alertsByType.critical.length}</div>
                    </CardContent>
                </Card>
                <Card className="border-orange-200 bg-orange-50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-orange-800">High Priority</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-orange-900">{alertsByType.high.length}</div>
                    </CardContent>
                </Card>
                <Card className="border-yellow-200 bg-yellow-50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-yellow-800">Medium</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-yellow-900">{alertsByType.medium.length}</div>
                    </CardContent>
                </Card>
                <Card className="border-blue-200 bg-blue-50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-blue-800">Low</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-900">{alertsByType.low.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="critical" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="critical">Critical ({alertsByType.critical.length})</TabsTrigger>
                    <TabsTrigger value="high">High ({alertsByType.high.length})</TabsTrigger>
                    <TabsTrigger value="medium">Medium ({alertsByType.medium.length})</TabsTrigger>
                    <TabsTrigger value="low">Low ({alertsByType.low.length})</TabsTrigger>
                </TabsList>

                {Object.entries(alertsByType).map(([severity, severityAlerts]) => (
                    <TabsContent key={severity} value={severity} className="space-y-4">
                        {severityAlerts.length === 0 ? (
                            <Card>
                                <CardContent className="py-8 text-center text-gray-500">
                                    No {severity} priority alerts at this time.
                                </CardContent>
                            </Card>
                        ) : (
                            severityAlerts.map(alert => (
                                <Card key={alert.id} className={`border-2 ${severityColors[alert.severity]}`}>
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-3">
                                                {severityIcons[alert.severity]}
                                                <div>
                                                    <CardTitle className="text-lg">{alert.title}</CardTitle>
                                                    <CardDescription className="mt-1">
                                                        {alert.alert_type.replace(/_/g, ' ').toUpperCase()} • 
                                                        {alert.related_entity_name && ` ${alert.related_entity_name}`}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                            <Badge variant="outline">Score: {alert.priority_score || 0}</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <p className="text-sm text-gray-700">{alert.description}</p>
                                        
                                        {alert.suggested_actions && alert.suggested_actions.length > 0 && (
                                            <div>
                                                <p className="text-sm font-semibold mb-2">Suggested Actions:</p>
                                                <ul className="space-y-1">
                                                    {alert.suggested_actions.map((action, idx) => (
                                                        <li key={idx} className="text-sm flex items-start gap-2">
                                                            <span className="text-gray-400">•</span>
                                                            <span>{action}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        <div className="flex gap-2 pt-2">
                                            <Button 
                                                size="sm"
                                                onClick={() => {
                                                    orchestrateWorkflowMutation.mutate(alert.id);
                                                }}
                                                disabled={orchestrateWorkflowMutation.isPending}
                                            >
                                                <Play className="h-4 w-4 mr-1" />
                                                Auto-Orchestrate
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => {
                                                    acknowledgeAlertMutation.mutate({ 
                                                        alertId: alert.id, 
                                                        status: 'acknowledged' 
                                                    });
                                                }}
                                            >
                                                <Eye className="h-4 w-4 mr-1" />
                                                Acknowledge
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => {
                                                    acknowledgeAlertMutation.mutate({ 
                                                        alertId: alert.id, 
                                                        status: 'resolved' 
                                                    });
                                                }}
                                            >
                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                Resolve
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}