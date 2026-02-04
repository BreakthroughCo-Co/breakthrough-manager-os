import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle, RefreshCw, FileText, Calendar } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function PolicyChangeMonitor() {
    const queryClient = useQueryClient();

    const { data: policyChanges = [], isLoading } = useQuery({
        queryKey: ['policyChanges'],
        queryFn: () => base44.entities.PolicyChangeMonitor.list('-detected_date')
    });

    const scanMutation = useMutation({
        mutationFn: () => base44.functions.invoke('monitorNDISPolicyChanges', {}),
        onSuccess: () => {
            queryClient.invalidateQueries(['policyChanges']);
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status, notes }) => 
            base44.entities.PolicyChangeMonitor.update(id, { 
                status,
                reviewed_by: 'current_user',
                reviewed_date: new Date().toISOString(),
                implementation_notes: notes 
            }),
        onSuccess: () => {
            queryClient.invalidateQueries(['policyChanges']);
        }
    });

    const severityColors = {
        critical: "bg-red-100 text-red-800 border-red-300",
        high: "bg-orange-100 text-orange-800 border-orange-300",
        medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
        low: "bg-blue-100 text-blue-800 border-blue-300"
    };

    const statusLabels = {
        detected: "Detected",
        under_review: "Under Review",
        actions_planned: "Actions Planned",
        implemented: "Implemented",
        verified: "Verified"
    };

    const changesByStatus = {
        detected: policyChanges.filter(c => c.status === 'detected'),
        under_review: policyChanges.filter(c => c.status === 'under_review'),
        actions_planned: policyChanges.filter(c => c.status === 'actions_planned'),
        implemented: policyChanges.filter(c => c.status === 'implemented')
    };

    if (isLoading) {
        return <div className="p-6">Loading policy changes...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">NDIS Policy Change Monitor</h2>
                    <p className="text-sm text-gray-600">Automated tracking of regulatory updates and compliance impacts</p>
                </div>
                <Button 
                    onClick={() => scanMutation.mutate()}
                    disabled={scanMutation.isPending}
                    className="gap-2"
                >
                    <RefreshCw className={`h-4 w-4 ${scanMutation.isPending ? 'animate-spin' : ''}`} />
                    {scanMutation.isPending ? 'Scanning...' : 'Scan for Changes'}
                </Button>
            </div>

            {scanMutation.isSuccess && (
                <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                        Scan complete. Detected {scanMutation.data?.data?.new_changes_tracked || 0} new policy changes.
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Detected</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{changesByStatus.detected.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Under Review</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{changesByStatus.under_review.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Actions Planned</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{changesByStatus.actions_planned.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Implemented</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{changesByStatus.implemented.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="detected" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="detected">Detected ({changesByStatus.detected.length})</TabsTrigger>
                    <TabsTrigger value="under_review">Under Review ({changesByStatus.under_review.length})</TabsTrigger>
                    <TabsTrigger value="actions_planned">Actions Planned ({changesByStatus.actions_planned.length})</TabsTrigger>
                    <TabsTrigger value="implemented">Implemented ({changesByStatus.implemented.length})</TabsTrigger>
                </TabsList>

                {Object.entries(changesByStatus).map(([status, changes]) => (
                    <TabsContent key={status} value={status} className="space-y-4">
                        {changes.length === 0 ? (
                            <Card>
                                <CardContent className="py-8 text-center text-gray-500">
                                    No policy changes in {statusLabels[status]} status.
                                </CardContent>
                            </Card>
                        ) : (
                            changes.map(change => (
                                <Card key={change.id} className="border-l-4" style={{ borderLeftColor: change.severity === 'critical' ? '#ef4444' : change.severity === 'high' ? '#f97316' : '#3b82f6' }}>
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge className={severityColors[change.severity]}>
                                                        {change.severity.toUpperCase()}
                                                    </Badge>
                                                    <Badge variant="outline">{change.policy_source}</Badge>
                                                </div>
                                                <CardTitle className="text-lg">{change.change_title}</CardTitle>
                                                <CardDescription className="mt-2 flex items-center gap-4">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        Effective: {new Date(change.effective_date).toLocaleDateString()}
                                                    </span>
                                                    {change.compliance_deadline && (
                                                        <span className="flex items-center gap-1 text-orange-600">
                                                            <AlertTriangle className="h-3 w-3" />
                                                            Deadline: {new Date(change.compliance_deadline).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <p className="text-sm font-semibold mb-1">Description:</p>
                                            <p className="text-sm text-gray-700">{change.change_description}</p>
                                        </div>

                                        <div>
                                            <p className="text-sm font-semibold mb-1">Impact Assessment:</p>
                                            <p className="text-sm text-gray-700">{change.impact_assessment}</p>
                                        </div>

                                        {change.suggested_actions && change.suggested_actions.length > 0 && (
                                            <div>
                                                <p className="text-sm font-semibold mb-2">Suggested Actions:</p>
                                                <ul className="space-y-1">
                                                    {change.suggested_actions.map((action, idx) => (
                                                        <li key={idx} className="text-sm flex items-start gap-2">
                                                            <span className="text-gray-400">•</span>
                                                            <span>{action}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {change.affected_entity_types && change.affected_entity_types.length > 0 && (
                                            <div>
                                                <p className="text-sm font-semibold mb-1">Affected Systems:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {change.affected_entity_types.map((type, idx) => (
                                                        <Badge key={idx} variant="outline">{type}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex gap-2 pt-2">
                                            {change.status === 'detected' && (
                                                <Button 
                                                    size="sm"
                                                    onClick={() => updateStatusMutation.mutate({ id: change.id, status: 'under_review' })}
                                                >
                                                    Begin Review
                                                </Button>
                                            )}
                                            {change.status === 'under_review' && (
                                                <Button 
                                                    size="sm"
                                                    onClick={() => updateStatusMutation.mutate({ id: change.id, status: 'actions_planned' })}
                                                >
                                                    Plan Actions
                                                </Button>
                                            )}
                                            {change.status === 'actions_planned' && (
                                                <Button 
                                                    size="sm"
                                                    onClick={() => updateStatusMutation.mutate({ id: change.id, status: 'implemented' })}
                                                >
                                                    Mark Implemented
                                                </Button>
                                            )}
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